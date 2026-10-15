package main

import (
	"embed"
	"io/fs"
	"net/http"
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

// serveIndex writes the embedded SPA shell.
func serveIndex(w http.ResponseWriter, r *http.Request) {
	data, err := embeddedStatic.ReadFile("web/static/index.html")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(data)
}
