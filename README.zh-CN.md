# ⚓ ObjDock · 对象存储网页管理

**对象存储的码头** — 自托管的 S3 兼容对象存储网页管理工具。

[English](README.md) | [中文](README.zh-CN.md)

像本地文件夹一样管理存储桶：上传、下载、预览、分享、仪表盘监控用量——不用把云密钥交给任何第三方应用。密钥经 AES-256-GCM 加密，只存在你自己的服务器上。

支持 **Cloudflare R2**、**Amazon S3**、**阿里云 OSS**、**腾讯云 COS**、**七牛云 Kodo**、**Backblaze B2**、**MinIO**，以及任何 S3 兼容服务端。

> 关键词：对象存储管理, OSS 管理工具, S3 浏览器, R2 管理, self-hosted S3 client, S3 web UI, 图床管理

---

## ✨ 功能

| 分类 | 说明 |
|---|---|
| 📊 **仪表盘** | 总用量、文件/文件夹数、分文件夹用量条、按类型环形图、每日增长趋势、30 天活跃热力图、存储桶快速切换条、手动配额卡（带进度条） |
| 📁 **文件管理** | 网格/列表视图、3 档缩略图、面包屑导航、排序（名称/大小/日期）、点击进入文件夹、右键菜单、在线预览（图片/视频/音频/PDF/文本）、多选批量打包 zip 下载、重命名、移动、复制、删除 |
| ⬆️ **上传** | 浏览器直传（预签名 URL，文件不经过你的服务器）、拖拽上传、单文件进度显示 |
| 📤 **上传链接** | 公开上传链接——别人无需登录就能往指定目录传文件；可设有效期、访问密码、使用次数上限；可撤销 |
| 🔗 **分享链接** | 私密分享链接，可设有效期、密码、浏览次数；可撤销；公开落地页跟随访客浏览器语言 |
| 🪣 **多账户** | 跨服务商绑定多个存储账户；侧边栏一键切换账户和存储桶 |
| 🧙 **添加向导** | 服务商卡片自动填 endpoint；多桶向导；保存前测试连接；按桶显示配额；自定义域名生成公开链接 |
| 👥 **用户** | 注册（首个用户自动成为管理员）；管理员用户管理；每用户独立语言偏好 |
| 🌍 **多语言** | 简体中文 · English · 日本語 · 한국어 · Español —— 界面全翻译，零中英混杂 |
| 🌙 **深色模式** | 一键切换，完整深色主题 |
| 🔐 **安全** | Argon2id 密码哈希、登录限流、注册开关、AES-256-GCM 静态加密、HTTPS 就绪 |

---

## 🚀 快速开始（Docker）

要求：任意 Linux 主机，Docker 20.10+ 和 Docker Compose v2。

**一行命令，搞定：**

```bash
curl -fsSL https://raw.githubusercontent.com/pal537/objdock/main/install.sh | bash
```

或手动：

```bash
git clone https://github.com/pal537/objdock.git && cd objdock && docker compose up -d
```

打开 **http://your-server-ip:8080** → 注册第一个账号（自动成为管理员）→ 添加你的存储。

> 一键脚本拉取 Docker Hub 上的预构建多架构镜像（[pal537/objdock](https://hub.docker.com/r/pal537/objdock)，amd64/arm64），无需编译，1 分钟内跑起来。想自己编译？`docker compose up -d --build`。
>
> 不用手动配密钥：首次启动时 ObjDock 会自动生成凭据加密密钥，保存在数据卷里。（想用自己的密钥？在 `.env` 里设 `OBJDOCK_ENCRYPTION_KEY` —— 见[配置](#️-配置)。）

> ⚠️ **上线前必做：** 前面加反向代理开 HTTPS（见[生产部署](#-生产部署)），建好自己的账号后去设置里关掉开放注册。

---

## ⚙️ 配置

全部走环境变量（或 `docker-compose.yml` 旁的 `.env` 文件）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OBJDOCK_ENCRYPTION_KEY` | *(自动生成)* | base64 32 字节密钥，给存储的云密钥加密。留空则首次运行时自动生成并存到 `<dataDir>/.encryption_key`。⚠️ 之后绝不要改 —— 存着的云密钥会解密失败。 |
| `OBJDOCK_DATA_DIR` | `./data`（Docker 里 `/data`） | `objdock.db` 存放位置 |
| `OBJDOCK_ADDR` | `127.0.0.1:8080`（Docker 里 `0.0.0.0:8080`） | 监听地址 |
| `OBJDOCK_SECURE_COOKIES` | `0`（Docker 里 `1`） | 走 HTTPS 时设为 `1` |

手动生成密钥：`docker run --rm objdock:latest /objdock genkey`

---

## 🏭 生产部署

推荐拓扑：

```
浏览器 ──HTTPS──> 反向代理 (nginx/Caddy) ──HTTP──> ObjDock (127.0.0.1:8080)
```

ObjDock 本体只监听 `127.0.0.1:8080`（见 `docker-compose.yml`），TLS 在反向代理上终止。

### 步骤 1 — DNS

把域名（如 `oss.example.com`）指到服务器：

- **A 记录** `oss` → 服务器公网 IP，或
- **CNAME** `oss` → 服务器主机名。

用 Cloudflare 的话开橙色云朵（代理模式）即可。

### 步骤 2 — 装 Docker（Ubuntu/Debian）

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # 之后重新登录
```

### 步骤 3 — 部署 ObjDock

```bash
sudo mkdir -p /opt/objdock && cd /opt/objdock
curl -fsSL https://raw.githubusercontent.com/pal537/objdock/main/install.sh | sudo bash
docker logs objdock   # 应显示 "listening on 0.0.0.0:8080"
```

### 步骤 4 — 反向代理 + HTTPS（nginx）

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/conf.d/objdock.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name oss.example.com;
    client_max_body_size 500M;   # 允许大文件上传
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

# 免费 Let's Encrypt 证书：
sudo certbot --nginx -d oss.example.com
```

### 步骤 5 — 上锁

1. 打开 `https://oss.example.com`，注册你的账号（第一个 = 管理员）。
2. 去 **设置 → 站点** 关掉开放注册。

### 备份

SQLite 数据库和自动生成的加密密钥都在 Docker 卷 `objdock-data` 里，定期备份：

```bash
docker run --rm -v objdock-data:/data -v /root/backups:/backup alpine \
  tar czf /backup/objdock-data-$(date +%F).tar.gz -C / data
```

卷丢了（或换了加密密钥），存着的云密钥就解密不出来了——得重新添加账户。

---

## 📄 许可证

MIT — 见 [LICENSE](LICENSE)。
