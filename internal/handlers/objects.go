package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"io"
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
		Bucket   string   `json:"bucket"`
		Key      string   `json:"key"`
		Keys     []string `json:"keys"`
		Expires  int      `json:"expires"`
		Password string   `json:"password"`
		MaxViews int64    `json:"maxViews"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" {
		writeErr(w, http.StatusBadRequest, "bucket is required")
		return
	}
	keys := in.Keys
	if len(keys) == 0 && in.Key != "" {
		keys = []string{in.Key}
	}
	if len(keys) == 0 {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	for _, k := range keys {
		if strings.Contains(k, "..") {
			writeErr(w, http.StatusBadRequest, "invalid key")
			return
		}
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
	firstKey := keys[0]
	shareName := firstKey[strings.LastIndex(firstKey, "/")+1:]
	if len(keys) > 1 {
		shareName = fmt.Sprintf("%s 等 %d 个文件", shareName, len(keys))
	}
	sh := &db.Share{
		Token:        token,
		UserID:       u.ID,
		AccountID:    a.ID,
		Bucket:       in.Bucket,
		Key:          firstKey,
		Name:         shareName,
		CreatedAt:    now,
		ExpiresAt:    now + int64(exp),
		PasswordHash: pwHash,
		MaxViews:     in.MaxViews,
	}
	if err := s.DB.CreateShare(sh); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot create share")
		return
	}
	for _, k := range keys {
		name := k[strings.LastIndex(k, "/")+1:]
		s.DB.AddShareItem(token, k, name, 0)
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

// GET /api/accounts/{id}/list-all?bucket=&prefix= — list all keys under prefix recursively.
func (s *Server) handleListAll(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	bucket := r.URL.Query().Get("bucket")
	prefix := r.URL.Query().Get("prefix")
	if bucket == "" {
		writeErr(w, http.StatusBadRequest, "bucket is required")
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	var keys []string
	token := ""
	for {
		page, err := client.ListPrefixPage(ctx, bucket, prefix, token)
		if err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		for _, o := range page.Objects {
			if !strings.HasSuffix(o.Key, "/") {
				keys = append(keys, o.Key)
			}
		}
		if page.NextToken == "" || len(keys) >= 5000 {
			break
		}
		token = page.NextToken
	}
	writeJSON(w, http.StatusOK, map[string]any{"keys": keys, "total": len(keys)})
}

// GET /api/accounts/{id}/search?bucket=&q= — search keys containing q (max 5000 scanned).
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	bucket := r.URL.Query().Get("bucket")
	q := strings.ToLower(r.URL.Query().Get("q"))
	if bucket == "" || q == "" {
		writeErr(w, http.StatusBadRequest, "bucket and q are required")
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	var matches []map[string]any
	token := ""
	scanned := 0
	for {
		page, err := client.ListPrefixPage(ctx, bucket, "", token)
		if err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		for _, o := range page.Objects {
			scanned++
			if strings.HasSuffix(o.Key, "/") {
				continue
			}
			if strings.Contains(strings.ToLower(o.Key), q) {
				matches = append(matches, map[string]any{
					"key": o.Key, "name": o.Key[strings.LastIndex(o.Key, "/")+1:],
					"size": o.Size, "lastModified": o.LastModified,
				})
				if len(matches) >= 100 {
					break
				}
			}
		}
		if page.NextToken == "" || scanned >= 5000 || len(matches) >= 100 {
			break
		}
		token = page.NextToken
	}
	writeJSON(w, http.StatusOK, map[string]any{"results": matches, "scanned": scanned, "truncated": len(matches) >= 100})
}

// POST /api/accounts/{id}/upload-link {bucket, prefix, password, maxUses, expires} — create reverse share.
func (s *Server) handleCreateUploadLink(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket   string `json:"bucket"`
		Prefix   string `json:"prefix"`
		Password string `json:"password"`
		MaxUses  int64  `json:"maxUses"`
		Expires  int    `json:"expires"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" {
		writeErr(w, http.StatusBadRequest, "bucket is required")
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
	pwHash := ""
	if in.Password != "" {
		h, err := auth.HashPassword(in.Password)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		pwHash = h
	}
	prefix := strings.Trim(in.Prefix, "/")
	if prefix != "" {
		prefix += "/"
	}
	now := time.Now().Unix()
	ul := &db.UploadLink{
		Token: token, UserID: u.ID, AccountID: a.ID, Bucket: in.Bucket, Prefix: prefix,
		PasswordHash: pwHash, MaxUses: in.MaxUses, ExpiresAt: now + int64(exp), CreatedAt: now,
	}
	if err := s.DB.CreateUploadLink(ul); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot create link")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": s.siteBaseURL(r) + "/u/" + token})
}

// GET /api/upload-links — list my upload links.
func (s *Server) handleListUploadLinks(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	links, err := s.DB.UploadLinksByUser(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	base := s.siteBaseURL(r)
	out := make([]map[string]any, 0, len(links))
	for _, ul := range links {
		out = append(out, map[string]any{
			"token": ul.Token, "bucket": ul.Bucket, "prefix": ul.Prefix,
			"url":       base + "/u/" + ul.Token,
			"createdAt": ul.CreatedAt, "expiresAt": ul.ExpiresAt,
			"expired":   time.Now().Unix() > ul.ExpiresAt,
			"hasPassword": ul.PasswordHash != "",
			"maxUses":   ul.MaxUses, "useCount": ul.UseCount,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"links": out})
}

// DELETE /api/upload-links/{token} — revoke.
func (s *Server) handleDeleteUploadLink(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if err := s.DB.DeleteUploadLink(r.PathValue("token"), u.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// GET /u/{token} — public upload page.
func (s *Server) handleUploadPage(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	ul, err := s.DB.UploadLinkByToken(token)
	if err != nil || time.Now().Unix() > ul.ExpiresAt {
		http.NotFound(w, r)
		return
	}
	if ul.MaxUses > 0 && ul.UseCount >= ul.MaxUses {
		http.Error(w, "link expired", http.StatusGone)
		return
	}
	needPw := ul.PasswordHash != ""
	authed := false
	if needPw {
		if c, _ := r.Cookie("ul_auth_"+token); c != nil && c.Value == "1" {
			authed = true
		}
	} else {
		authed = true
	}
	if r.Method == "POST" && needPw && !authed {
		r.ParseForm()
		if auth.VerifyPassword(r.Form.Get("password"), ul.PasswordHash) {
			http.SetCookie(w, &http.Cookie{Name: "ul_auth_" + token, Value: "1", Path: "/u/" + token, MaxAge: 3600, HttpOnly: true, SameSite: http.SameSiteLaxMode})
			authed = true
		} else {
			s.renderUploadPage(w, token, true)
			return
		}
	}
	if !authed {
		s.renderUploadPage(w, token, false)
		return
	}
	s.renderUploadPage(w, token, false)
}

func (s *Server) renderUploadPage(w http.ResponseWriter, token string, pwFailed bool) {
	ul, _ := s.DB.UploadLinkByToken(token)
	needPw := ul != nil && ul.PasswordHash != ""
	msg := ""
	if pwFailed {
		msg = "<p style='color:#dc2626;font-size:14px'>密码错误，请重试</p>"
	}
	pwSection := ""
	upSection := ""
	if needPw {
		pwSection = `<div id="pwWrap" style="text-align:center">
			<div style="font-size:48px;margin-bottom:16px">🔒</div>
			<h2 style="margin:0 0 8px;font-size:20px">需要密码</h2>
			<p style="color:#64748b;font-size:14px;margin:0 0 20px">此上传链接受密码保护</p>` + msg + `
			<input type="password" id="upPw" placeholder="输入密码" autofocus
				style="width:100%;padding:14px;border:2px solid #e2e8f0;border-radius:12px;font-size:15px;box-sizing:border-box;outline:none">
			<button onclick="unlockUpload()" style="width:100%;margin-top:12px;padding:14px;background:#3b82f6;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">解锁</button>
		</div><div id="upWrap" hidden>`
		upSection = `</div>`
	} else {
		pwSection = `<div id="upWrap">`
		upSection = `</div>`
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>上传文件 - ObjDock</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, system-ui, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
.card { background: #fff; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.3); max-width: 520px; width: 100%; }
.logo { font-size: 56px; text-align: center; margin-bottom: 8px; }
h2 { text-align: center; margin: 0 0 8px; font-size: 22px; }
.sub { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px; }
.drop { border: 2px dashed #cbd5e1; border-radius: 14px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all .2s; margin-bottom: 16px; }
.drop:hover, .drop.over { border-color: #3b82f6; background: #eff6ff; }
.drop input { display: none; }
.file-list { max-height: 240px; overflow-y: auto; margin-bottom: 16px; }
.file-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f8fafc; border-radius: 10px; margin-bottom: 8px; font-size: 14px; }
.file-item .fn { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-item .st { font-size: 12px; color: #64748b; }
.file-item .ok { color: #16a34a; }
.file-item .err { color: #dc2626; }
.file-item .rm { cursor: pointer; color: #94a3b8; font-size: 18px; }
.file-item .rm:hover { color: #dc2626; }
.btn-up { width: 100%; padding: 16px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-up:disabled { opacity: .5; cursor: not-allowed; }
.progress { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 6px; }
.progress > div { height: 100%; background: #3b82f6; width: 0; transition: width .2s; }
.done-msg { text-align: center; padding: 20px; color: #16a34a; font-size: 16px; font-weight: 600; }
</style></head><body>
<div class="card">` + pwSection + `
	<div class="logo">📤</div>
	<h2>上传文件</h2>
	<p class="sub">无需登录，直接上传到对方的存储空间</p>
	<div class="drop" id="dropZone" onclick="document.getElementById('fileInput').click()">
		<div style="font-size:40px;margin-bottom:8px">📁</div>
		<div style="font-weight:600;margin-bottom:4px">点击选择或拖拽文件到这里</div>
		<div style="font-size:13px;color:#94a3b8">可多次选择，支持多文件</div>
		<input type="file" id="fileInput" multiple>
	</div>
	<div class="file-list" id="fileList"></div>
	<button class="btn-up" id="upBtn" onclick="doUpload()" disabled>开始上传</button>
	<div id="doneMsg"></div>` + upSection + `
</div>
<script>
const token = "` + token + `";
let files = [];
const dz = document.getElementById('dropZone');
const fi = document.getElementById('fileInput');
dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); addFiles(e.dataTransfer.files); });
fi.addEventListener('change', () => { addFiles(fi.files); fi.value = ''; });
function addFiles(newFiles) {
  for (const f of newFiles) {
    if (!files.find(x => x.name === f.name && x.size === f.size)) files.push(f);
  }
  renderList();
}
function removeFile(i) { files.splice(i, 1); renderList(); }
function renderList() {
  const list = document.getElementById('fileList');
  document.getElementById('upBtn').disabled = !files.length;
  list.innerHTML = files.map((f, i) =>
    '<div class="file-item" id="fi-' + i + '">' +
      '<span class="fn" title="' + f.name + '">' + f.name + '</span>' +
      '<span class="st">' + (f.size/1024).toFixed(1) + ' KB</span>' +
      '<span class="rm" onclick="removeFile(' + i + ')">×</span>' +
    '</div>').join('');
}
async function unlockUpload() {
  const pw = document.getElementById('upPw').value;
  const r = await fetch('/u/' + token, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'password=' + encodeURIComponent(pw)});
  if (r.ok) { document.getElementById('pwWrap').hidden = true; document.getElementById('upWrap').hidden = false; }
  else location.reload();
}
async function doUpload() {
  if (!files.length) return;
  const btn = document.getElementById('upBtn');
  btn.disabled = true; btn.textContent = '上传中…';
  let ok = 0, fail = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const el = document.getElementById('fi-' + i);
    const st = el.querySelector('.st');
    st.innerHTML = '<div class="progress"><div></div></div>';
    const bar = st.querySelector('.progress > div');
    try {
      const r = await fetch('/api/upload-token/' + token + '/presign?key=' + encodeURIComponent(f.name));
      if (!r.ok) throw new Error('获取上传地址失败');
      const {url} = await r.json();
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) bar.style.width = (e.loaded/e.total*100) + '%'; };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('HTTP ' + xhr.status));
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.send(f);
      });
      st.innerHTML = '<span class="ok">✅ 完成</span>'; ok++;
      el.querySelector('.rm').style.display = 'none';
    } catch (e) { st.innerHTML = '<span class="err">❌ ' + e.message + '</span>'; fail++; }
  }
  btn.textContent = '开始上传';
  document.getElementById('doneMsg').innerHTML = `<div class="done-msg">🎉 上传完成！成功 ${ok} 个${fail ? '，失败 ' + fail + ' 个' : ''}</div>`;
  files = [];
}
</script></body></html>`))
}

// GET /api/upload-token/{token}/presign?key= — public presigned upload URL.
// GET /api/upload-token/{token}/presign?key= — public presigned upload URL.
func (s *Server) handleUploadTokenPresign(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	ul, err := s.DB.UploadLinkByToken(token)
	if err != nil || time.Now().Unix() > ul.ExpiresAt {
		writeErr(w, http.StatusNotFound, "link not found")
		return
	}
	if ul.MaxUses > 0 && ul.UseCount >= ul.MaxUses {
		writeErr(w, http.StatusGone, "link expired")
		return
	}
	if ul.PasswordHash != "" {
		if c, _ := r.Cookie("ul_auth_"+token); c == nil || c.Value != "1" {
			writeErr(w, http.StatusUnauthorized, "password required")
			return
		}
	}
	key := r.URL.Query().Get("key")
	if key == "" || strings.Contains(key, "..") {
		writeErr(w, http.StatusBadRequest, "invalid key")
		return
	}
	fullKey := ul.Prefix + key[strings.LastIndex(key, "/")+1:]
	a, err := s.DB.AccountByID(ul.AccountID, ul.UserID)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "account unavailable")
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	url, err := client.PresignUpload(ctx, ul.Bucket, fullKey, 15*time.Minute)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	s.DB.IncrementUploadUse(token)
	writeJSON(w, http.StatusOK, map[string]any{"url": url})
}

// GET /api/accounts/{id}/text?bucket=&key= — get text file content (max 1MB).
func (s *Server) handleGetText(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	bucket := r.URL.Query().Get("bucket")
	key := r.URL.Query().Get("key")
	if bucket == "" || key == "" {
		writeErr(w, http.StatusBadRequest, "bucket and key required")
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	// Get object head first to check size
	url, err := client.PresignDownload(ctx, bucket, key, 60*time.Second, false)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	// Fetch via presigned URL (server-side, max 1MB)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	defer resp.Body.Close()
	if resp.ContentLength > 1024*1024 {
		writeErr(w, http.StatusBadRequest, "file too large (max 1MB)")
		return
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024+1))
	if err != nil || int64(len(body)) > 1024*1024 {
		writeErr(w, http.StatusBadRequest, "file too large (max 1MB)")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"content": string(body)})
}

// PUT /api/accounts/{id}/text {bucket, key, content} — save text file.
func (s *Server) handlePutText(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		Bucket  string `json:"bucket"`
		Key     string `json:"key"`
		Content string `json:"content"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Bucket == "" || in.Key == "" {
		writeErr(w, http.StatusBadRequest, "bucket, key, content required")
		return
	}
	if len(in.Content) > 1024*1024 {
		writeErr(w, http.StatusBadRequest, "content too large (max 1MB)")
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	url, err := client.PresignUpload(ctx, in.Bucket, in.Key, 5*time.Minute)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	req, _ := http.NewRequestWithContext(ctx, "PUT", url, strings.NewReader(in.Content))
	req.Header.Set("Content-Type", "text/plain; charset=utf-8")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	resp.Body.Close()
	if resp.StatusCode >= 300 {
		writeErr(w, http.StatusBadGateway, "upload failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/accounts/{id}/copy {srcBucket, srcKey, dstBucket, dstKey, move} — cross-bucket copy/move.
func (s *Server) handleCopy(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in struct {
		SrcBucket string `json:"srcBucket"`
		SrcKey    string `json:"srcKey"`
		DstBucket string `json:"dstBucket"`
		DstKey    string `json:"dstKey"`
		Move      bool   `json:"move"`
	}
	if err := decodeJSON(r, &in); err != nil || in.SrcBucket == "" || in.SrcKey == "" || in.DstBucket == "" || in.DstKey == "" {
		writeErr(w, http.StatusBadRequest, "all fields required")
		return
	}
	if strings.Contains(in.DstKey, "..") {
		writeErr(w, http.StatusBadRequest, "invalid dst key")
		return
	}
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	if err := client.CopyObjectCrossBucket(ctx, in.SrcBucket, in.SrcKey, in.DstBucket, in.DstKey); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if in.Move {
		// Delete source after successful copy
		delCtx, delCancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer delCancel()
		if err := client.DeleteObjects(delCtx, in.SrcBucket, []string{in.SrcKey}); err != nil {
			// Copy succeeded but delete failed — report partial
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "warning": "copied but failed to delete source"})
			return
		}
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
	// 获取分享的文件列表
	items, _ := s.DB.ShareItems(token)
	if len(items) == 0 {
		items = []map[string]any{{"key": sh.Key, "name": sh.Name, "size": int64(0)}}
	}
	// 为每个文件生成预签名 URL（5分钟有效）
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	var files []map[string]any
	for _, it := range items {
		key := it["key"].(string)
		name := it["name"].(string)
		url, err := client.PresignDownload(ctx, sh.Bucket, key, 300*time.Second, false)
		if err != nil {
			continue
		}
		lower := strings.ToLower(name)
		isImg := strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") ||
			strings.HasSuffix(lower, ".png") || strings.HasSuffix(lower, ".gif") ||
			strings.HasSuffix(lower, ".webp") || strings.HasSuffix(lower, ".svg")
		files = append(files, map[string]any{"name": name, "url": url, "isImage": isImg})
	}
	s.renderSharePage(w, sh, files)
}

// renderSharePage 渲染分享页面
func (s *Server) renderSharePage(w http.ResponseWriter, sh *db.Share, files []map[string]any) {
	// 简化：直接用 map
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	var fileHtml string
	for _, f := range files {
		name := f["name"].(string)
		url := f["url"].(string)
		isImage := f["isImage"].(bool)
		preview := ""
		if isImage {
			preview = fmt.Sprintf(`<img src="%s" style="max-width:100%%;max-height:300px;border-radius:12px;margin-bottom:12px">`, url)
		}
		// HTML 转义
		nameEsc := strings.ReplaceAll(strings.ReplaceAll(name, "&", "&amp;"), "<", "&lt;")
		fileHtml += fmt.Sprintf(`
		<div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:12px">
			%s
			<div style="font-weight:600;margin-bottom:8px">%s</div>
			<a href="%s" download style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">⬇ 下载</a>
		</div>`, preview, nameEsc, url)
	}
	if len(files) == 0 {
		fileHtml = `<p style="color:#94a3b8;text-align:center">暂无文件</p>`
	}
	title := sh.Name
	if title == "" {
		title = "分享文件"
	}
	w.Write([]byte(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>` + title + ` - ObjDock 分享</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, system-ui, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; }
.card { background: #fff; border-radius: 20px; padding: 32px; max-width: 640px; margin: 0 auto; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
h1 { margin: 0 0 8px; font-size: 22px; }
.sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
</style></head><body>
<div class="card">
<h1>📁 ` + title + `</h1>
<p class="sub">通过 ObjDock 分享</p>` + fileHtml + `
</div></body></html>`))
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
