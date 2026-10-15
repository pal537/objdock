// Package auth handles password hashing (Argon2id), session cookies,
// and per-IP login rate limiting.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/argon2"
)

const (
	sessionCookieName = "objdock_session"
	sessionTTL        = 30 * 24 * time.Hour
)

// Argon2id parameters (OWASP recommended).
const (
	argonTime    = 1
	argonMemory  = 64 * 1024
	argonThreads = 4
	argonKeyLen  = 32
	saltLen      = 16
)

// HashPassword hashes with Argon2id, returning a self-describing string.
func HashPassword(password string) (string, error) {
	if len(password) < 6 {
		return "", errors.New("password too short (min 6 characters)")
	}
	if len(password) > 128 {
		return "", errors.New("password too long")
	}
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash)), nil
}

// VerifyPassword checks a password against a HashPassword output.
func VerifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	computed := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, uint32(len(hash)))
	return subtle.ConstantTimeCompare(hash, computed) == 1
}

// NewSessionID returns a cryptographically random session token.
func NewSessionID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// SetSessionCookie writes the session cookie (HttpOnly, SameSite=Lax).
func SetSessionCookie(w http.ResponseWriter, sessionID string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		MaxAge:   int(sessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearSessionCookie expires the session cookie.
func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

// SessionIDFromRequest extracts the session token from the request cookie.
func SessionIDFromRequest(r *http.Request) string {
	c, err := r.Cookie(sessionCookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

// ---- login rate limiting ----

// Limiter is a simple in-memory per-IP sliding-window rate limiter.
type Limiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	max      int
	window   time.Duration
	blockFor time.Duration
	blocked  map[string]time.Time
}

// NewLimiter allows max attempts per window; exceeding it blocks the IP for blockFor.
func NewLimiter(max int, window, blockFor time.Duration) *Limiter {
	return &Limiter{
		attempts: make(map[string][]time.Time),
		max:      max,
		window:   window,
		blockFor: blockFor,
		blocked:  make(map[string]time.Time),
	}
}

// Allow reports whether the IP may attempt a login now.
func (l *Limiter) Allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if until, ok := l.blocked[ip]; ok {
		if now.Before(until) {
			return false
		}
		delete(l.blocked, ip)
	}
	cutoff := now.Add(-l.window)
	valid := l.attempts[ip][:0]
	for _, t := range l.attempts[ip] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	l.attempts[ip] = valid
	if len(valid) >= l.max {
		l.blocked[ip] = now.Add(l.blockFor)
		delete(l.attempts, ip)
		return false
	}
	l.attempts[ip] = append(valid, now)
	return true
}

// ClientIP extracts the real client IP, trusting X-Forwarded-For only from
// loopback (i.e. when behind our own nginx reverse proxy).
func ClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			if first := strings.Split(xff, ",")[0]; strings.TrimSpace(first) != "" {
				return strings.TrimSpace(first)
			}
		}
		if xr := r.Header.Get("X-Real-IP"); xr != "" {
			return strings.TrimSpace(xr)
		}
	}
	return host
}
