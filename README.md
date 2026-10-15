# ⚓ ObjDock

**对象存储的码头** — a self-hosted web client for S3-compatible object storage.

Manage your buckets like local folders: browse, upload, download, preview, share, and watch your storage on a dashboard — without handing your cloud credentials to any third-party app. Your keys stay encrypted on your own server.

Supports Cloudflare R2, Amazon S3, Alibaba Cloud OSS, Tencent Cloud COS, Qiniu, MinIO, and any S3-compatible endpoint.

## ✨ Features

- 📊 **Dashboard** — total usage, file counts, per-folder bars, per-type donut, growth trend, activity heatmap
- 📁 **File manager** — grid/list views, breadcrumbs, drag-free upload with progress, inline preview (images, video, audio, PDF, text)
- 🔗 **Share links** — time-limited presigned URLs, no login required for recipients
- 🪣 **Multi-account** — bind many storage accounts, one-click switching between accounts and buckets
- 🧙 **Guided setup** — provider cards auto-fill endpoints; only name + key + secret to type
- 🔐 **Security first** — Argon2id passwords, login rate limiting, AES-256-GCM encrypted credentials, files never pass through the server (presigned URLs, browser ↔ storage directly)

## 🚀 Quick start (Docker)

```bash
# 1. Generate an encryption key (used to encrypt stored cloud credentials)
docker run --rm --entrypoint /objdock ghcr.io/<you>/objdock:latest genkey

# 2. Put it in .env
echo "OBJDOCK_ENCRYPTION_KEY=<paste-key-here>" > .env

# 3. Run
docker compose up -d
```

Open http://localhost:8080, register the first account (it becomes admin), and add your storage.

> Behind a reverse proxy? Set `OBJDOCK_SECURE_COOKIES=1` (already default in compose) and point your proxy at `127.0.0.1:8080`.

## 🔧 Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `OBJDOCK_ENCRYPTION_KEY` | ✅ | — | base64 32-byte key (`objdock genkey`) |
| `OBJDOCK_DATA_DIR` | | `/data` | SQLite directory |
| `OBJDOCK_ADDR` | | `0.0.0.0:8080` | listen address |
| `OBJDOCK_SECURE_COOKIES` | | `0` | `1` when served over HTTPS |

Data lives in `$OBJDOCK_DATA_DIR/objdock.db` — back up that single file and you're safe.

## 🏗️ Build from source

```bash
go build -o objdock .
OBJDOCK_ENCRYPTION_KEY=$(./objdock genkey) ./objdock
```

Requires Go 1.24+. The frontend is embedded in the binary — no Node.js, no extra assets.

## 🔐 Security model

- Passwords: Argon2id hashing; login attempts rate-limited per IP
- Cloud secrets: AES-256-GCM encrypted in SQLite; the key comes from `OBJDOCK_ENCRYPTION_KEY` and never touches the database or code
- Sessions: server-side, HttpOnly + Secure + SameSite cookies
- File transfers: presigned URLs — file bytes go browser ↔ storage directly; the server never sees them
- What is stored: login info, encrypted storage configs, settings, daily stat snapshots. **No file content, ever.**

## 📄 License

MIT
