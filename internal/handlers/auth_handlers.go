package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/pal537/objdock/internal/auth"
)

// sessionTTL mirrors auth's 30-day session lifetime.
const sessionTTL = 30 * 24 * time.Hour

// GET /api/setup-status — public. Reports whether this is a fresh install.
func (s *Server) handleSetupStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"needsSetup": s.DB.UserCount() == 0})
}

// POST /api/register {username, password, displayName?}
// The first registered user becomes admin. Afterwards registration
// requires the registration_enabled setting.
func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	ip := auth.ClientIP(r)
	if !s.RegLim3h.Allow(ip) || !s.RegLim24h.Allow(ip) {
		writeErr(w, http.StatusTooManyRequests, "too many registrations from this IP, try again later")
		return
	}
	var in struct {
		Username    string `json:"username"`
		Password    string `json:"password"`
		DisplayName string `json:"displayName"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	if in.Username == "" || len(in.Username) > 32 {
		writeErr(w, http.StatusBadRequest, "invalid username")
		return
	}
	first := s.DB.UserCount() == 0
	if !first && s.DB.GetSetting("registration_enabled") != "1" {
		writeErr(w, http.StatusForbidden, "registration is disabled")
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	name := strings.TrimSpace(in.DisplayName)
	if name == "" {
		name = in.Username
	}
	id, err := s.DB.CreateUser(in.Username, hash, name, first)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "username already taken")
		return
	}
	s.login(w, r, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "admin": first})
}

// POST /api/login {username, password}
func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	ip := auth.ClientIP(r)
	if !s.LoginLim.Allow(ip) {
		writeErr(w, http.StatusTooManyRequests, "too many attempts, try again later")
		return
	}
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Remember *bool  `json:"remember"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	u, err := s.DB.UserByUsername(strings.TrimSpace(in.Username))
	if err != nil || !auth.VerifyPassword(in.Password, u.PasswordHash) {
		// Same message for unknown user vs wrong password (no user enumeration).
		writeErr(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	remember := in.Remember == nil || *in.Remember
	s.loginWithRemember(w, r, u.ID, remember)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request, userID int64) {
	s.loginWithRemember(w, r, userID, true)
}

func (s *Server) loginWithRemember(w http.ResponseWriter, r *http.Request, userID int64, remember bool) {
	sid, err := auth.NewSessionID()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot create session")
		return
	}
	ttl := sessionTTL
	if !remember {
		ttl = 12 * time.Hour
	}
	if err := s.DB.CreateSession(sid, userID, ttl); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot create session")
		return
	}
	auth.SetSessionCookieWithMaxAge(w, sid, s.Secure, remember)
}

// POST /api/logout
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if sid := auth.SessionIDFromRequest(r); sid != "" {
		s.DB.DeleteSession(sid)
	}
	auth.ClearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// GET /api/me
func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	writeJSON(w, http.StatusOK, map[string]any{
		"id":          u.ID,
		"username":    u.Username,
		"displayName": u.DisplayName,
		"admin":       u.IsAdmin,
	})
}

// PUT /api/me {displayName?, password?, currentPassword?}
// Changing the password requires the current password.
func (s *Server) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	var in struct {
		DisplayName     string `json:"displayName"`
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	name := strings.TrimSpace(in.DisplayName)
	if name == "" {
		name = u.DisplayName
	}
	hash := ""
	if in.NewPassword != "" {
		if !auth.VerifyPassword(in.CurrentPassword, u.PasswordHash) {
			writeErr(w, http.StatusForbidden, "current password is incorrect")
			return
		}
		h, err := auth.HashPassword(in.NewPassword)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		hash = h
	}
	if err := s.DB.UpdateUser(u.ID, name, hash); err != nil {
		writeErr(w, http.StatusInternalServerError, "update failed")
		return
	}
	if hash != "" {
		// Invalidate all sessions (including this one) after a password change.
		s.DB.DeleteUserSessions(u.ID)
		auth.ClearSessionCookie(w)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "relogin": hash != ""})
}

// GET /api/admin/users — list all users (admin only, no passwords).
func (s *Server) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if !u.IsAdmin {
		writeErr(w, http.StatusForbidden, "admin only")
		return
	}
	users, err := s.DB.AllUsers()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	out := make([]map[string]any, 0, len(users))
	for _, x := range users {
		out = append(out, map[string]any{
			"id": x.ID, "username": x.Username, "displayName": x.DisplayName,
			"admin": x.IsAdmin, "createdAt": x.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": out, "total": len(out)})
}

// DELETE /api/admin/users/{id} — delete a user and all their data (admin only).
func (s *Server) handleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if !u.IsAdmin {
		writeErr(w, http.StatusForbidden, "admin only")
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if id == u.ID {
		writeErr(w, http.StatusBadRequest, "cannot delete yourself")
		return
	}
	if err := s.DB.DeleteUser(id); err != nil {
		writeErr(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/admin/users/{id}/reset-password {password} — admin resets a user's password.
func (s *Server) handleAdminResetPassword(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if !u.IsAdmin {
		writeErr(w, http.StatusForbidden, "admin only")
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var in struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.DB.ResetUserPassword(id, hash); err != nil {
		writeErr(w, http.StatusInternalServerError, "reset failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// GET /api/settings -> {registrationEnabled}
func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	out := map[string]any{}
	if u.IsAdmin {
		out["registrationEnabled"] = s.DB.GetSetting("registration_enabled") == "1"
		out["siteUrl"] = s.DB.GetSetting("site_url")
	}
	writeJSON(w, http.StatusOK, out)
}

// PUT /api/settings {registrationEnabled} (admin only)
func (s *Server) handlePutSettings(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if !u.IsAdmin {
		writeErr(w, http.StatusForbidden, "admin only")
		return
	}
	var in struct {
		RegistrationEnabled *bool  `json:"registrationEnabled"`
		SiteURL             *string `json:"siteUrl"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	if in.SiteURL != nil {
		v := strings.TrimSpace(*in.SiteURL)
		v = strings.TrimSuffix(v, "/")
		if err := s.DB.PutSetting("site_url", v); err != nil {
			writeErr(w, http.StatusInternalServerError, "save failed")
			return
		}
	}
	if in.RegistrationEnabled != nil {
		v := "0"
		if *in.RegistrationEnabled {
			v = "1"
		}
		if err := s.DB.PutSetting("registration_enabled", v); err != nil {
			writeErr(w, http.StatusInternalServerError, "save failed")
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

