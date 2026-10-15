package handlers

import (
	"context"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"
)

// GET /api/accounts/{id}/objects?bucket=&prefix=&token=
// Lists one "folder". Files and subfolders are separated, like a file manager.
func (s *Server) handleListObjects(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = a.Bucket
	}
	if bucket == "" {
		writeErr(w, http.StatusBadRequest, "bucket is required")
		return
	}
	prefix := r.URL.Query().Get("prefix")
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	objects, folders, nextToken, err := client.ListObjects(ctx, bucket, prefix, r.URL.Query().Get("token"))
	if err != nil {
		writeErr(w, http.StatusBadGateway, "list failed: "+friendlyS3Err(err))
		return
	}
	// Present clean names relative to the prefix.
	files := make([]map[string]any, 0, len(objects))
	for _, o := range objects {
		name := strings.TrimPrefix(o.Key, prefix)
		if name == "" || strings.Contains(name, "/") {
			continue
		}
		files = append(files, map[string]any{
			"key":          o.Key,
			"name":         name,
			"size":         o.Size,
			"lastModified": o.LastModified,
			"kind":         fileKind(name),
		})
	}
	dirs := make([]map[string]any, 0, len(folders))
	for _, f := range folders {
		name := strings.TrimSuffix(strings.TrimPrefix(f, prefix), "/")
		if name == "" {
			continue
		}
		dirs = append(dirs, map[string]any{"prefix": f, "name": name})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"bucket": bucket, "prefix": prefix,
		"folders": dirs, "files": files, "nextToken": nextToken,
	})
}

// fileKind classifies a file for icons and preview handling.
func fileKind(name string) string {
	ext := strings.ToLower(path.Ext(name))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico":
		return "image"
	case ".mp4", ".webm", ".mov", ".mkv", ".avi":
		return "video"
	case ".mp3", ".wav", ".ogg", ".flac", ".m4a":
		return "audio"
	case ".pdf":
		return "pdf"
	case ".txt", ".md", ".log", ".json", ".xml", ".yaml", ".yml", ".csv":
		return "text"
	case ".zip", ".tar", ".gz", ".rar", ".7z":
		return "archive"
	case ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx":
		return "office"
	}
	return "file"
}

// GET /api/accounts/{id}/presign?bucket=&key=&op=download|upload&expires=3600&filename=
// Returns a time-limited URL. The browser talks to storage directly;
// the secret key never leaves the server.
func (s *Server) handlePresign(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	q := r.URL.Query()
	bucket, key, op := q.Get("bucket"), q.Get("key"), q.Get("op")
	if bucket == "" || key == "" {
		writeErr(w, http.StatusBadRequest, "bucket and key are required")
		return
	}
	// Safety: never allow escaping the bucket via "..".
	if strings.Contains(key, "..") {
		writeErr(w, http.StatusBadRequest, "invalid key")
		return
	}
	expiresSec, _ := strconv.Atoi(q.Get("expires"))
	if expiresSec <= 0 || expiresSec > 7*24*3600 {
		expiresSec = 3600
	}
	// Share links default to a week; plain previews/downloads to an hour.
	if op == "share" && q.Get("expires") == "" {
		expiresSec = 7 * 24 * 3600
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	var url string
	switch op {
	case "upload":
		url, err = client.PresignUpload(ctx, bucket, key, time.Duration(expiresSec)*time.Second)
	case "download", "share", "preview", "":
		url, err = client.PresignDownload(ctx, bucket, key, time.Duration(expiresSec)*time.Second)
	default:
		writeErr(w, http.StatusBadRequest, "unknown op")
		return
	}
	if err != nil {
		writeErr(w, http.StatusBadGateway, "presign failed: "+friendlyS3Err(err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expiresIn": expiresSec})
}

// POST /api/accounts/{id}/mkdir {bucket, path}
func (s *Server) handleMkdir(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket string `json:"bucket"`
		Path   string `json:"path"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" || in.Path == "" {
		writeErr(w, http.StatusBadRequest, "bucket and path are required")
		return
	}
	key := strings.Trim(in.Path, "/") + "/"
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	if err := client.PutEmptyObject(ctx, in.Bucket, key); err != nil {
		writeErr(w, http.StatusBadGateway, "mkdir failed: "+friendlyS3Err(err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/accounts/{id}/rename {bucket, src, dst}
// Rename is copy + delete (S3 has no native rename).
func (s *Server) handleRename(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket string `json:"bucket"`
		Src    string `json:"src"`
		Dst    string `json:"dst"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" || in.Src == "" || in.Dst == "" {
		writeErr(w, http.StatusBadRequest, "bucket, src and dst are required")
		return
	}
	if strings.Contains(in.Dst, "..") {
		writeErr(w, http.StatusBadRequest, "invalid destination")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	if err := client.CopyObject(ctx, in.Bucket, in.Src, in.Dst); err != nil {
		writeErr(w, http.StatusBadGateway, "rename failed: "+friendlyS3Err(err))
		return
	}
	if err := client.DeleteObjects(ctx, in.Bucket, []string{in.Src}); err != nil {
		writeErr(w, http.StatusBadGateway, "renamed but failed to remove original: "+friendlyS3Err(err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/accounts/{id}/delete {bucket, keys[]}
func (s *Server) handleDeleteObjects(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket string   `json:"bucket"`
		Keys   []string `json:"keys"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" || len(in.Keys) == 0 {
		writeErr(w, http.StatusBadRequest, "bucket and keys are required")
		return
	}
	if len(in.Keys) > 1000 {
		writeErr(w, http.StatusBadRequest, "too many keys (max 1000)")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	// Delete in chunks of 1000 (S3 limit per call).
	for i := 0; i < len(in.Keys); i += 1000 {
		end := i + 1000
		if end > len(in.Keys) {
			end = len(in.Keys)
		}
		if err := client.DeleteObjects(ctx, in.Bucket, in.Keys[i:end]); err != nil {
			writeErr(w, http.StatusBadGateway, "delete failed: "+friendlyS3Err(err))
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "deleted": len(in.Keys)})
}
