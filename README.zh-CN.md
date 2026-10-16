# ⚓ ObjDock

**对象存储的码头** — 自托管的 S3 兼容对象存储网页客户端。

[English](README.md) | [中文](README.zh-CN.md)

像管理本地文件夹一样管理你的存储桶：上传、下载、预览、分享、仪表盘监控——不用把云密钥交给任何第三方应用。密钥经 AES-256-GCM 加密，只存在你自己的服务器上。

支持 **Cloudflare R2**、**Amazon S3**、**阿里云 OSS**、**腾讯云 COS**、**七牛云 Kodo**、**MinIO** 以及任何 S3 兼容接口。

---

## ✨ 功能

| 模块 | 说明 |
|---|---|
| 📊 **仪表盘** | 总用量、文件/文件夹数、分文件夹用量条、分类型饼图、每日增长趋势、30 天活跃度、手动配额卡片（带进度条） |
| 📁 **文件管理** | 网格/列表视图、面包屑、三档缩略图、排序（名称/大小/时间）、单击进入文件夹、在线预览（图片/视频/音频/PDF/文本） |
| ⬆️ **上传** | 浏览器直传（预签名 URL，文件不经过服务器），显示进度 |
| 🔗 **分享链接** | 限时预签名 URL，接收方无需登录 |
| 🪣 **多账户** | 跨服务商绑定多个存储账户，一键切换账户和桶 |
| 🧙 **添加向导** | 服务商卡片自动填充 endpoint；支持多桶（逗号分隔，一个桶建一个账户）；保存前测试连接 |
| 🔐 **安全** | Argon2id 密码哈希、登录限流、注册开关、云密钥 AES-256-GCM 落盘加密 |
| 🎨 **界面** | 简洁现代设计，SVG 线性图标，响应式布局 |

---

## 🚀 快速开始（Docker）

环境要求：任意 Linux 主机，Docker 20.10+ 和 Docker Compose v2。

```bash
# 1. 克隆
git clone https://github.com/pal537/objdock.git && cd objdock

# 2. 生成加密密钥（只做一次，用于加密存储的云密钥）
docker compose build
docker run --rm objdock:latest /objdock genkey
# → 输出一串 base64 密钥，如 4fJ9...==

# 3. 写入 .env（这个文件要保管好！）
echo 'OBJDOCK_ENCRYPTION_KEY=<把密钥粘贴在这里>' > .env

# 4. 启动
docker compose up -d
```

打开 **http://服务器IP:8080** → 注册第一个账号 → 添加存储。

> ⚠️ **对外提供服务之前务必做**：前面加带 HTTPS 的反向代理（见下方[生产部署](#-生产部署)），建好自己的账号后去设置里**关闭开放注册**。

---

## 🏭 生产部署

推荐架构：

```
浏览器 ──HTTPS──> 反向代理 (nginx/Caddy) ──HTTP──> ObjDock (127.0.0.1:8080)
```

ObjDock 只监听 `127.0.0.1:8080`（见 `docker-compose.yml`），TLS 在反向代理层终止。

### 第 1 步 — 域名解析

把域名（比如 `oss.example.com`）指向服务器：

- **A 记录** `oss` → 服务器公网 IP，或
- **CNAME** `oss` → 服务器主机名。

用 Cloudflare 的话开橙色云朵（代理模式）即可。

### 第 2 步 — 安装 Docker（Ubuntu/Debian）

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # 之后重新登录
```

### 第 3 步 — 部署 ObjDock

```bash
sudo mkdir -p /opt/objdock && cd /opt/objdock
sudo git clone https://github.com/pal537/objdock.git .

# 生成密钥（只做一次！）并写入 .env
docker compose build
docker run --rm objdock:latest /objdock genkey
# 复制输出的密钥：
nano .env
# --- .env 内容 ---
# OBJDOCK_ENCRYPTION_KEY=<把密钥粘贴在这里>

docker compose up -d
docker logs objdock   # 应看到 "listening on 0.0.0.0:8080"
```

### 第 4 步 — 反向代理 + HTTPS（nginx）

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

# 申请免费 Let's Encrypt 证书
sudo certbot --nginx -d oss.example.com
```

### 第 5 步 — 加固

1. 打开 `https://oss.example.com`，注册你的管理员账号。
2. 进**设置** → **关闭开放注册**（防止陌生人注册）。
3. `.env` 里 compose 已默认 `OBJDOCK_SECURE_COOKIES=1` —— 走 HTTPS 时保持为 `1`。

### 第 6 步 — 添加第一个存储账户

1. 点 **＋ 添加账户**（或设置 → 添加）。
2. 选服务商卡片（R2 / S3 / OSS / COS / MinIO…）。
3. 填写密钥。**Cloudflare R2** 需要的是**对象读写范围的 API Token**（它没有 `ListBuckets` 权限，向导会改用 `HeadBucket` 逐个验证桶）。
4. 多个桶用逗号分隔——向导会一个桶建一个账户。
5. 可选填**空间配额**（如 `10 GB`）——S3 协议没有配额接口，填了仪表盘才会显示已用/总计/剩余。

---

## ⚙️ 配置

全部通过环境变量配置（`.env` / compose `environment`）：

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `OBJDOCK_ENCRYPTION_KEY` | ✅ | — | `/objdock genkey` 生成的 base64 32 字节密钥，加密数据库里的云密钥。**丢了它 = 存的云密钥全作废。** |
| `OBJDOCK_SECURE_COOKIES` | — | `0` | 走 HTTPS 时设为 `1`（给 session cookie 加 `Secure` 标记）。 |
| `OBJDOCK_DATA_DIR` | — | `/data` | `objdock.db`（SQLite）存放目录。 |
| `OBJDOCK_ADDR` | — | `0.0.0.0:8080` | 容器内监听地址。 |

---

## 💾 备份与恢复

所有数据都在 `objdock-data` 这个 Docker volume 里的**单个 SQLite 文件**。

**备份**（在宿主机执行）：
```bash
docker run --rm -v objdock-data:/data -v $(pwd):/backup alpine \
  cp /data/objdock.db /backup/objdock-$(date +%F).db
```

**恢复**：停掉容器，把备份拷回 volume 并命名为 `objdock.db`，再启动。

> 建议：保留最近 3 份，每天一次 cron + 轮转就够了。

---

## 🔄 更新

```bash
cd /opt/objdock
git pull
docker compose up -d --build
```

SQLite 表结构启动时自动迁移，无需手动操作。

---

## 🔐 安全说明

- 云密钥落盘前用 **AES-256-GCM** 加密，密钥只在你的 `.env` 里。
- 密码用 **Argon2id** 哈希；登录**限流**。
- 文件传输走**预签名 URL**——数据在浏览器和存储之间直连，不经过你的服务器。
- 分享链接也是预签名的：设个过期时间，接收方无需账号。
- 容器只绑 localhost；不要直接暴露 8080 端口——务必走 HTTPS 反向代理。

---

## ❓ 常见问题

**Q: R2 测试连接时报 "AccessDenied"（ListBuckets）？**
A: R2 的范围 Token 本来就没有 `ListBuckets` 权限。ObjDock 会改用 `HeadBucket` 逐桶验证——桶名填对就能通过。

**Q: 仪表盘有已用空间，但不显示总量？**
A: S3 协议没有配额接口。添加/编辑账户时手动填一个配额，仪表盘就会显示已用/总计/剩余。

**Q: `OBJDOCK_ENCRYPTION_KEY` 丢了怎么办？**
A: 存的云密钥解不开了。用当初同一密钥加密的备份恢复，或者重新添加账户。

**Q: 不用 Docker 能跑吗？**
A: 可以——单个 Go 二进制，前端已嵌入：`go build -o objdock .` 然后 `./objdock`，设置 `OBJDOCK_ENCRYPTION_KEY` 和 `OBJDOCK_DATA_DIR` 环境变量即可。

---

## 🛠 开发

```bash
go run .                    # 开发服务器 :8080
# 前端在 web/static，通过 go:embed 打进二进制——
# 改完直接重新构建，无需单独的前端构建步骤。
```

---

## 📄 开源协议

MIT — 见 [LICENSE](LICENSE)。
