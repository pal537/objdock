# ObjDock — 部署说明（VPS 部署）

> 面向自动化部署 agent。域名 oss.example.com（Cloudflare 代理中），VPS 为你的服务器 IP。

## 架构

```
浏览器 ──HTTPS──> Cloudflare ──HTTP──> VPS nginx(:80) ──> Docker objdock(127.0.0.1:8080)
```

Cloudflare 代理已开启，边缘 HTTPS 由 Cloudflare 提供；源站走 HTTP（Flexible 模式）。

## 首次部署

```bash
# 1. 代码目录
mkdir -p /opt/objdock && cd /opt/objdock

# 2. 生成加密密钥（只做一次，妥善保存）
docker run --rm --entrypoint /objdock objdock:latest genkey
# 写入 .env：OBJDOCK_ENCRYPTION_KEY=<key>

# 3. 启动
docker compose up -d --build

# 4. nginx 反代
cat > /etc/nginx/conf.d/objdock.conf <<'EOF'
server {
    listen 80;
    server_name oss.example.com;
    client_max_body_size 500M;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
nginx -t && systemctl reload nginx
```

## 日常运维

- 更新：`cd /opt/objdock && git pull && docker compose up -d --build`
- 日志：`docker logs -f objdock`
- 备份：备份 Docker volume `objdock-data`（内含 objdock.db 单文件）
- 重启：`docker compose restart`

## 备份

按网站备份标准：每日备份 objdock.db 到 Google Drive「Muse日常备份」/objdock备份/，保留最新 3 份。
