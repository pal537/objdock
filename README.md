# ⚓ ObjDock · 对象存储网页管理

**Your object storage, docked.** — A self-hosted web manager for S3-compatible object storage.

[English](README.md) | [中文](README.zh-CN.md)

Browse buckets like local folders: upload, download, preview, share, and monitor usage from a dashboard — without handing your cloud credentials to any third-party app. Your keys stay AES-256-GCM encrypted on your own server.

Supports **Cloudflare R2**, **Amazon S3**, **Alibaba Cloud OSS**, **Tencent Cloud COS**, **Qiniu Kodo**, **Backblaze B2**, **MinIO**, and any S3-compatible endpoint.

> Keywords / 关键词：对象存储管理, OSS 管理工具, S3 浏览器, R2 管理, self-hosted S3 client, S3 web UI, 图床管理

---

## ✨ Features

| Area | Details |
|---|---|
| 📊 **Dashboard** | Total usage, file/folder counts, per-folder storage bars, per-type donut chart, daily growth trend, 30-day activity heatmap, bucket quick-switch bar, manual quota card with progress bar |
| 📁 **File manager** | Grid / list views, 3 thumbnail sizes, breadcrumbs, sorting (name/size/date), click-to-enter folders, right-click context menu, inline preview (images, video, audio, PDF, text), multi-select with batch zip download, rename, move, copy, delete |
| ⬆️ **Upload** | Browser-direct upload via presigned URLs (files never pass through your server), drag & drop, per-file progress |
| 📤 **Upload links** | Public upload links — anyone can upload to a folder without logging in; expiry, password, and max-use limits; revocable |
| 🔗 **Share links** | Private share links with expiry, password, and view limits; revocable; public landing page follows the visitor's browser language |
| 🪣 **Multi-account** | Bind many storage accounts across providers; one-click switching between accounts and buckets from the sidebar |
| 🧙 **Guided setup** | Provider cards auto-fill endpoints; multi-bucket wizard; connection test before saving; per-bucket quota display; custom domains for public links |
| 👥 **Users** | Registration with first-user-becomes-admin; admin user management; per-user language preference |
| 🌍 **Languages** | 简体中文 · English · 日本語 · 한국어 · Español — full UI translation, zero mixed-language leakage |
| 🌙 **Dark mode** | One-click toggle, full dark theme |
| 🔐 **Security** | Argon2id password hashing, login rate limiting, registration on/off switch, AES-256-GCM encrypted credentials at rest, HTTPS-ready |

---

## 🚀 Quick Start (Docker)

Prerequisites: Docker 20.10+ and Docker Compose v2 on any Linux host.

**One line, that's it:**

```bash
curl -fsSL https://raw.githubusercontent.com/pal537/objdock/main/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/pal537/objdock.git && cd objdock && docker compose up -d
```

Open **http://your-server-ip:8080** → register the first account (it becomes admin) → add your storage.

> The one-liner pulls the prebuilt multi-arch image from Docker Hub ([pal537/objdock](https://hub.docker.com/r/pal537/objdock), amd64/arm64) — no compilation needed, up in under a minute. Prefer building from source? `docker compose up -d --build`.
>
> No manual key setup needed: on first start ObjDock generates its credential-encryption key automatically and saves it inside the data volume. (Prefer your own key? Set `OBJDOCK_ENCRYPTION_KEY` in `.env` — see [Configuration](#️-configuration).)

> ⚠️ **Before exposing to the internet:** put a reverse proxy with HTTPS in front (see [Production deployment](#-production-deployment) below), and turn off open registration in Settings once your own account exists.

---

## ⚙️ Configuration

All via environment variables (or a `.env` file next to `docker-compose.yml`):

| Variable | Default | Description |
|---|---|---|
| `OBJDOCK_ENCRYPTION_KEY` | *(auto-generated)* | base64 32-byte key for credential encryption. If unset, generated on first run and saved to `<dataDir>/.encryption_key`. ⚠️ Never change it afterwards — stored credentials would become unreadable. |
| `OBJDOCK_DATA_DIR` | `./data` (`/data` in Docker) | Where `objdock.db` lives |
| `OBJDOCK_ADDR` | `127.0.0.1:8080` (`0.0.0.0:8080` in Docker) | Listen address |
| `OBJDOCK_SECURE_COOKIES` | `0` (`1` in Docker) | Set `1` when serving over HTTPS |

Generate a key manually with: `docker run --rm objdock:latest /objdock genkey`

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
curl -fsSL https://raw.githubusercontent.com/pal537/objdock/main/install.sh | sudo bash
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

# Free Let's Encrypt certificate:
sudo certbot --nginx -d oss.example.com
```

### Step 5 — Lock it down

1. Open `https://oss.example.com`, register your account (first = admin).
2. Go to **Settings → Site** and turn **off** open registration.

### Backing up

The SQLite database and the auto-generated encryption key both live in the Docker volume `objdock-data`. Back it up regularly:

```bash
docker run --rm -v objdock-data:/data -v /root/backups:/backup alpine \
  tar czf /backup/objdock-data-$(date +%F).tar.gz -C / data
```

Lose the volume (or change the encryption key) and stored cloud credentials can't be decrypted — you'd re-add the accounts.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
