# ⚓ ObjDock

**Your object storage, docked.** — A self-hosted web client for S3-compatible object storage.

[English](README.md) | [中文](README.zh-CN.md)

Browse buckets like local folders: upload, download, preview, share, and monitor usage from a dashboard — without handing your cloud credentials to any third-party app. Your keys stay AES-256-GCM encrypted on your own server.

Supports **Cloudflare R2**, **Amazon S3**, **Alibaba Cloud OSS**, **Tencent Cloud COS**, **Qiniu Kodo**, **MinIO**, and any S3-compatible endpoint.

---

## ✨ Features

| Area | Details |
|---|---|
| 📊 **Dashboard** | Total usage, file/folder counts, per-folder storage bars, per-type donut chart, daily growth trend, 30-day activity chart, manual quota card with progress bar |
| 📁 **File manager** | Grid / list views, breadcrumbs, three thumbnail sizes, sorting (name/size/date), click-to-enter folders, inline preview (images, video, audio, PDF, text) |
| ⬆️ **Upload** | Browser-direct upload via presigned URLs (files never pass through the server), progress display |
| 🔗 **Share links** | Time-limited presigned URLs — recipients need no login |
| 🪣 **Multi-account** | Bind many storage accounts across providers; one-click switching between accounts and buckets |
| 🧙 **Guided setup** | Provider cards auto-fill endpoints; multi-bucket wizard (one account per bucket); connection test before saving |
| 🔐 **Security** | Argon2id password hashing, login rate limiting, registration on/off switch, AES-256-GCM encrypted credentials at rest |
| 🎨 **UI** | Clean modern design, SVG icon set, responsive layout |

---

## 🚀 Quick Start (Docker)

Prerequisites: Docker 20.10+ and Docker Compose v2 on any Linux host.

```bash
# 1. Clone
git clone https://github.com/pal537/objdock.git && cd objdock

# 2. Generate the encryption key (do this ONCE — it encrypts stored cloud credentials)
docker compose build
docker run --rm objdock:latest /objdock genkey
# → prints a base64 key, e.g. 4fJ9...==

# 3. Save it to .env (keep this file private!)
echo 'OBJDOCK_ENCRYPTION_KEY=<paste-key-here>' > .env

# 4. Start
docker compose up -d
```

Open **http://your-server-ip:8080** → register the first account → add your storage.

> ⚠️ **Do this before exposing to the internet:** put a reverse proxy with HTTPS in front (see [Production deployment](#-production-deployment) below), and turn off open registration in Settings once your own account exists.

---

## 🏭 Production Deployment

Recommended topology:

```
Browser ──HTTPS──> Reverse proxy (nginx/Caddy) ──HTTP──> ObjDock (127.0.0.1:8080)
```

ObjDock itself binds to `127.0.0.1:8080` only (see `docker-compose.yml`). TLS terminates at the reverse proxy.

### Step 1 — DNS

Point your domain (e.g. `oss.example.com`) to the server:

- **A record** `oss` → your server's public IP, or
- **CNAME** `oss` → your server hostname.

If you use Cloudflare, the orange-cloud (proxied) mode works fine.

### Step 2 — Install Docker (Ubuntu/Debian)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login afterwards
```

### Step 3 — Deploy ObjDock

```bash
sudo mkdir -p /opt/objdock && cd /opt/objdock
sudo git clone https://github.com/pal537/objdock.git .

# Generate key (once!) and write .env
docker compose build
docker run --rm objdock:latest /objdock genkey
# copy the printed key:
nano .env
# --- .env contents ---
# OBJDOCK_ENCRYPTION_KEY=<paste-key-here>

docker compose up -d
docker logs objdock   # should show "listening on 0.0.0.0:8080"
```

### Step 4 — Reverse proxy with HTTPS (nginx)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/conf.d/objdock.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name oss.example.com;
    client_max_body_size 500M;   # allow large uploads
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# Get a free Let's Encrypt certificate
sudo certbot --nginx -d oss.example.com
```

### Step 5 — Harden

1. Open `https://oss.example.com`, register your admin account.
2. Go to **Settings** → turn **open registration OFF** (so strangers can't sign up).
3. In `.env`, the compose file already sets `OBJDOCK_SECURE_COOKIES=1` — keep it `1` whenever you serve over HTTPS.

### Step 6 — Add your first storage account

1. Click **＋ Add account** (or Settings → Add).
2. Pick your provider card (R2 / S3 / OSS / COS / MinIO…).
3. Fill in the credentials. For **Cloudflare R2** you need an **object read/write scoped API token** (it has no `ListBuckets` permission — the wizard verifies each bucket with `HeadBucket` instead).
4. Separate multiple buckets with commas — the wizard creates one account per bucket.
5. Optionally set a **quota** (e.g. `10 GB`) — S3 has no quota API, so the dashboard shows usage against the number you enter.

---

## ⚙️ Configuration

All settings are environment variables (via `.env` / compose `environment`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `OBJDOCK_ENCRYPTION_KEY` | ✅ | — | Base64 32-byte key from `/objdock genkey`. Encrypts cloud credentials in the DB. **Losing it = losing access to stored credentials.** |
| `OBJDOCK_SECURE_COOKIES` | — | `0` | Set `1` when serving over HTTPS (adds `Secure` to session cookies). |
| `OBJDOCK_DATA_DIR` | — | `/data` | Directory for `objdock.db` (SQLite). |
| `OBJDOCK_ADDR` | — | `0.0.0.0:8080` | Listen address inside the container. |

---

## 💾 Backup & Restore

Everything lives in **one SQLite file** inside the `objdock-data` Docker volume.

**Backup** (run on the host):
```bash
docker run --rm -v objdock-data:/data -v $(pwd):/backup alpine \
  cp /data/objdock.db /backup/objdock-$(date +%F).db
```

**Restore**: stop the container, copy your backup back to the volume as `objdock.db`, start again.

> Tip: keep the 3 most recent backups; a daily cron + rotation is enough for most setups.

---

## 🔄 Updating

```bash
cd /opt/objdock
git pull
docker compose up -d --build
```

The SQLite schema migrates automatically on startup — no manual steps.

---

## 🔐 Security Notes

- Cloud credentials are encrypted with **AES-256-GCM** before touching disk; the key lives only in your `.env`.
- Passwords use **Argon2id**; logins are **rate-limited**.
- File transfers use **presigned URLs** — bytes go browser ↔ storage directly, never through your server.
- Share links are presigned too: set an expiry, no account needed for the recipient.
- The container binds to localhost only; never expose port 8080 directly — always use the HTTPS reverse proxy.

---

## ❓ FAQ

**Q: Why does the R2 connection test say "AccessDenied" on ListBuckets?**
A: R2 scoped tokens intentionally lack `ListBuckets`. ObjDock falls back to `HeadBucket` per bucket — if your bucket name is right, the test passes.

**Q: The dashboard shows usage but no total — why?**
A: The S3 protocol has no quota API. Enter a manual quota when adding/editing the account and the dashboard will show used/total/remaining.

**Q: I lost my `OBJDOCK_ENCRYPTION_KEY`.**
A: Stored cloud credentials can't be decrypted anymore. Restore from a backup that was encrypted with the same key, or re-add the accounts.

**Q: Can I run without Docker?**
A: Yes — it's a single Go binary with the frontend embedded: `go build -o objdock .` then `./objdock`. Set `OBJDOCK_ENCRYPTION_KEY` and `OBJDOCK_DATA_DIR` env vars.

---

## 🛠 Development

```bash
go run .                    # dev server on :8080
# Frontend lives in web/static and is embedded via go:embed —
# edit files, rebuild, no separate build step.
```

---

## 📄 License

MIT — see [LICENSE](LICENSE).
