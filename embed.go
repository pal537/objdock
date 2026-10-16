package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed all:web/static
var embeddedStatic embed.FS

// staticFS returns the embedded frontend as an http.FileSystem.
func staticFS() http.FileSystem {
	sub, err := fs.Sub(embeddedStatic, "web/static")
	if err != nil {
		panic(err)
	}
	return http.FS(sub)
}

// appVersion is set at build time via -ldflags "-X main.appVersion=...".
var appVersion = "dev"

// serveIndex writes the embedded SPA shell.
func serveIndex(w http.ResponseWriter, r *http.Request) {
	data, err := embeddedStatic.ReadFile("web/static/index.html")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	html := strings.ReplaceAll(string(data), "__APP_VERSION__", appVersion)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// Shell is tiny and changes per deploy: never cache it.
	w.Header().Set("Cache-Control", "no-cache")
	// Security headers.
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Referrer-Policy", "same-origin")
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; img-src 'self' data: blob: https:; "+
			"media-src 'self' blob: https:; style-src 'self' 'unsafe-inline'; "+
			"script-src 'self'; connect-src 'self' https:; font-src 'self' data:")
	_, _ = w.Write([]byte(html))
}
