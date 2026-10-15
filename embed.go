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
	_, _ = w.Write([]byte(html))
}
