#!/usr/bin/env bash
# ObjDock one-click installer.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/pal537/objdock/main/install.sh | bash
set -euo pipefail

command -v docker >/dev/null 2>&1 || { echo "❌ 请先安装 Docker（https://docs.docker.com/engine/install/）"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ 需要 Docker Compose v2"; exit 1; }

if [ ! -f docker-compose.yml ]; then
  command -v git >/dev/null 2>&1 || { echo "❌ 请先安装 git"; exit 1; }
  echo "📥 下载 ObjDock..."
  git clone --depth 1 https://github.com/pal537/objdock.git objdock
  cd objdock
fi

echo "🚀 启动 ObjDock..."
docker compose up -d --build

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
IP=${IP:-your-server-ip}
echo ""
echo "✅ 完成！打开 http://${IP}:8080"
echo "   第一次打开时注册一个账号，它会自动成为管理员。"
echo ""
echo "⚠️  上线前请做这两件事："
echo "   1. 在前面加反向代理开 HTTPS（nginx/Caddy，见 README）"
echo "   2. 建好自己的账号后，去 设置 关掉开放注册"
