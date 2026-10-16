package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"github.com/pal537/objdock/internal/auth"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/pal537/objdock/internal/db"
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
		url, err = client.PresignDownload(ctx, bucket, key, time.Duration(expiresSec)*time.Second, op == "download")
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

// POST /api/accounts/{id}/share {bucket, key, expires} — creates a short public link.
// Returns {"url": "https://host/s/<token>"}.
func (s *Server) handleCreateShare(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket   string `json:"bucket"`
		Key      string `json:"key"`
		Expires  int    `json:"expires"`
		Password string `json:"password"`
		MaxViews int64  `json:"maxViews"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" || in.Key == "" {
		writeErr(w, http.StatusBadRequest, "bucket and key are required")
		return
	}
	if strings.Contains(in.Key, "..") {
		writeErr(w, http.StatusBadRequest, "invalid key")
		return
	}
	exp := in.Expires
	if exp <= 0 || exp > 30*24*3600 {
		exp = 7 * 24 * 3600
	}
	tok := make([]byte, 9)
	if _, err := rand.Read(tok); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot generate token")
		return
	}
	token := base64.RawURLEncoding.EncodeToString(tok)[:12]
	now := time.Now().Unix()
	pwHash := ""
	if in.Password != "" {
		h, err := auth.HashPassword(in.Password)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		pwHash = h
	}
	sh := &db.Share{
		Token:        token,
		UserID:       u.ID,
		AccountID:    a.ID,
		Bucket:       in.Bucket,
		Key:          in.Key,
		Name:         in.Key[strings.LastIndex(in.Key, "/")+1:],
		CreatedAt:    now,
		ExpiresAt:    now + int64(exp),
		PasswordHash: pwHash,
		MaxViews:     in.MaxViews,
	}
	if err := s.DB.CreateShare(sh); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot create share")
		return
	}
	url := s.siteBaseURL(r) + "/s/" + token
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expiresIn": exp})
}

// renderSharePassword shows a password prompt for protected shares.
func (s *Server) renderSharePassword(w http.ResponseWriter, token string, failed bool) {
	msg := ""
	if failed {
		msg = "<p style='color:#dc2626'>密码错误，请重试</p>"
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>需要密码 - ObjDock 分享</title></head>
<body style="font-family:system-ui;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="background:#fff;padding:32px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:360px;width:90%">
<h2 style="margin:0 0 8px">🔒 需要密码</h2>
<p style="color:#64748b;font-size:14px">这个分享链接受密码保护</p>` + msg + `
<form method="POST"><input type="password" name="password" placeholder="输入分享密码" autofocus
style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:10px;font-size:15px;box-sizing:border-box">
<button type="submit" style="width:100%;margin-top:12px;padding:12px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:15px;cursor:pointer">打开</button></form>
</div></body></html>`))
}

// GET /api/shares — list my shares (login required).
func (s *Server) handleListShares(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	shares, err := s.DB.SharesByUser(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	base := s.siteBaseURL(r)
	out := make([]map[string]any, 0, len(shares))
	for _, sh := range shares {
		out = append(out, map[string]any{
			"token": sh.Token, "name": sh.Name, "bucket": sh.Bucket, "key": sh.Key,
			"url":       base + "/s/" + sh.Token,
			"createdAt": sh.CreatedAt, "expiresAt": sh.ExpiresAt,
			"expired":   time.Now().Unix() > sh.ExpiresAt,
			"hasPassword": sh.PasswordHash != "",
			"maxViews":    sh.MaxViews,
			"viewCount":   sh.ViewCount,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"shares": out})
}

// DELETE /api/shares/{token} — revoke a share (login required).
func (s *Server) handleDeleteShare(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if err := s.DB.DeleteShare(r.PathValue("token"), u.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// GET /s/{token} — public redirect to a presigned URL.
func (s *Server) handleShareRedirect(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	sh, err := s.DB.ShareByToken(token)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if time.Now().Unix() > sh.ExpiresAt {
		http.NotFound(w, r)
		return
	}
	if sh.MaxViews > 0 && sh.ViewCount >= sh.MaxViews {
		http.Error(w, "link expired (view limit reached)", http.StatusGone)
		return
	}
	// Password protection
	if sh.PasswordHash != "" {
		cookie, _ := r.Cookie("share_auth_" + token)
		if cookie == nil || cookie.Value != "1" {
			// Show password form
			if r.Method == "POST" {
				r.ParseForm()
				if auth.VerifyPassword(r.Form.Get("password"), sh.PasswordHash) {
					http.SetCookie(w, &http.Cookie{
						Name: "share_auth_" + token, Value: "1",
						Path: "/s/" + token, MaxAge: 3600, HttpOnly: true, SameSite: http.SameSiteLaxMode,
					})
				} else {
					s.renderSharePassword(w, token, true)
					return
				}
			} else {
				s.renderSharePassword(w, token, false)
				return
			}
		}
	}
	a, err := s.DB.AccountByID(sh.AccountID, sh.UserID)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		http.Error(w, "unavailable", http.StatusBadGateway)
		return
	}
	s.DB.IncrementShareView(token)
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	url, err := client.PresignDownload(ctx, sh.Bucket, sh.Key, 300*time.Second, false)
	if err != nil {
		http.Error(w, "unavailable", http.StatusBadGateway)
		return
	}
	http.Redirect(w, r, url, http.StatusFound)
}

// POST /api/accounts/{id}/presign-batch — signs many keys in one round trip.
// Body: {bucket, keys: [], op, expires}. Used for thumbnail grids.
func (s *Server) handlePresignBatch(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket  string   `json:"bucket"`
		Keys    []string `json:"keys"`
		Op      string   `json:"op"`
		Expires int      `json:"expires"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad request")
		return
	}
	if in.Bucket == "" || len(in.Keys) == 0 {
		writeErr(w, http.StatusBadRequest, "bucket and keys are required")
		return
	}
	if len(in.Keys) > 200 {
		writeErr(w, http.StatusBadRequest, "too many keys (max 200)")
		return
	}
	expiresSec := in.Expires
	if expiresSec <= 0 || expiresSec > 7*24*3600 {
		expiresSec = 600
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	urls := make(map[string]string, len(in.Keys))
	for _, key := range in.Keys {
		if strings.Contains(key, "..") {
			continue
		}
		var url string
		if in.Op == "upload" {
			url, err = client.PresignUpload(ctx, in.Bucket, key, time.Duration(expiresSec)*time.Second)
		} else {
			url, err = client.PresignDownload(ctx, in.Bucket, key, time.Duration(expiresSec)*time.Second, in.Op == "download")
		}
		if err == nil {
			urls[key] = url
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"urls": urls})
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
