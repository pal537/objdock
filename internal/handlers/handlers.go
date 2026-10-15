// Package handlers implements the ObjDock JSON API and page serving.
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/pal537/objdock/internal/auth"
	"github.com/pal537/objdock/internal/db"
	objs3 "github.com/pal537/objdock/internal/s3"
)

// Server holds shared dependencies for all handlers.
type Server struct {
	DB        *db.DB
	EncKey    []byte
	Secure    bool // set Secure on cookies (true when served over HTTPS)
	LoginLim  *auth.Limiter
	Static    http.FileSystem
	ServeIndex http.HandlerFunc
	mux       *http.ServeMux
}

// New wires all routes and returns the handler.
func New(database *db.DB, encKey []byte, secure bool, static http.FileSystem, serveIndex http.HandlerFunc) http.Handler {
	s := &Server{
		DB:         database,
		EncKey:     encKey,
		Secure:     secure,
		Static:     static,
		ServeIndex: serveIndex,
		LoginLim: auth.NewLimiter(10, 10*time.Minute, 30*time.Minute),
		mux:      http.NewServeMux(),
	}
	s.routes()
	// Prune expired sessions hourly.
	go func() {
		for range time.Tick(time.Hour) {
			database.PruneExpiredSessions()
		}
	}()
	return s
}

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) routes() {
	m := s.mux
	// Static assets and SPA shell (embedded in the binary).
	m.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(s.Static)))
	m.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		s.ServeIndex(w, r)
	})
	// Auth (public)
	m.HandleFunc("POST /api/register", s.handleRegister)
	m.HandleFunc("POST /api/login", s.handleLogin)
	m.HandleFunc("POST /api/logout", s.handleLogout)
	// Everything below requires login.
	m.HandleFunc("GET /api/me", s.requireLogin(s.handleMe))
	m.HandleFunc("PUT /api/me", s.requireLogin(s.handleUpdateMe))
	m.HandleFunc("GET /api/settings", s.requireLogin(s.handleGetSettings))
	m.HandleFunc("PUT /api/settings", s.requireLogin(s.handlePutSettings))
	// Accounts
	m.HandleFunc("GET /api/accounts", s.requireLogin(s.handleListAccounts))
	m.HandleFunc("POST /api/accounts", s.requireLogin(s.handleCreateAccount))
	m.HandleFunc("PUT /api/accounts/{id}", s.requireLogin(s.handleUpdateAccount))
	m.HandleFunc("DELETE /api/accounts/{id}", s.requireLogin(s.handleDeleteAccount))
	m.HandleFunc("POST /api/accounts/{id}/test", s.requireLogin(s.handleTestAccount))
	m.HandleFunc("POST /api/accounts/test", s.requireLogin(s.handleTestDraft))
	m.HandleFunc("GET /api/accounts/{id}/buckets", s.requireLogin(s.handleListBuckets))
	// Objects
	m.HandleFunc("GET /api/accounts/{id}/objects", s.requireLogin(s.handleListObjects))
	m.HandleFunc("GET /api/accounts/{id}/presign", s.requireLogin(s.handlePresign))
	m.HandleFunc("POST /api/accounts/{id}/presign-batch", s.requireLogin(s.handlePresignBatch))
	m.HandleFunc("POST /api/accounts/{id}/mkdir", s.requireLogin(s.handleMkdir))
	m.HandleFunc("POST /api/accounts/{id}/rename", s.requireLogin(s.handleRename))
	m.HandleFunc("POST /api/accounts/{id}/delete", s.requireLogin(s.handleDeleteObjects))
	// Dashboard
	m.HandleFunc("GET /api/accounts/{id}/stats", s.requireLogin(s.handleStats))
}

// ---- helpers ----

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20)).Decode(v)
}

// currentUser resolves the logged-in user from the session cookie.
func (s *Server) currentUser(r *http.Request) *db.User {
	sid := auth.SessionIDFromRequest(r)
	if sid == "" {
		return nil
	}
	u, err := s.DB.SessionUser(sid)
	if err != nil {
		return nil
	}
	return u
}

func (s *Server) requireLogin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.currentUser(r) == nil {
			writeErr(w, http.StatusUnauthorized, "not logged in")
			return
		}
		next(w, r)
	}
}

func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return s.requireLogin(func(w http.ResponseWriter, r *http.Request) {
		if u := s.currentUser(r); u == nil || !u.IsAdmin {
			writeErr(w, http.StatusForbidden, "admin only")
			return
		}
		next(w, r)
	})
}

// s3Client builds an S3 client for the account, decrypting the secret.
func (s *Server) s3Client(a *db.Account) (*objs3.Client, error) {
	secret, err := decryptSecret(s.EncKey, a.SecretEnc)
	if err != nil {
		return nil, err
	}
	return objs3.New(objs3.Config{
		Endpoint:     a.Endpoint,
		Region:       a.Region,
		AccessKey:    a.AccessKey,
		SecretKey:    secret,
		UsePathStyle: usePathStyle(a.Provider),
	}), nil
}

// usePathStyle reports whether the provider needs path-style addressing.
func usePathStyle(provider string) bool {
	// MinIO and most self-hosted gateways need path style.
	return provider == "minio" || provider == "custom"
}
