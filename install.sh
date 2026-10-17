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
# 安全检查：本机已有同名容器时直接退出，避免把别人的生产容器重建掉
# （compose 项目名默认取目录名，二次运行安装脚本会撞名）
if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx 'objdock'; then
  echo "⚠️ 检测到本机已有一个名为 objdock 的容器，为保护现有部署，本次跳过启动。"
  echo "   如需重装：请先备份好 .env（里面有加密密钥），再到原部署目录执行 docker compose down，然后重新运行本脚本。"
  exit 0
fi
# 直接拉取预构建镜像（Docker Hub pal537/objdock，多架构），无需本地编译
docker compose up -d

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
IP=${IP:-your-server-ip}
echo ""
echo "✅ 完成！打开 http://${IP}:8080"
echo "   第一次打开时注册一个账号，它会自动成为管理员。"
echo ""
echo "⚠️  上线前请做这两件事："
echo "   1. 在前面加反向代理开 HTTPS（nginx/Caddy，见 README）"
echo "   2. 建好自己的账号后，去 设置 关掉开放注册"
