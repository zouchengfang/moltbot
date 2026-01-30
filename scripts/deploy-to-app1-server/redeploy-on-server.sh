#!/usr/bin/env bash
# 在 131 服务器上直接执行：仅重新构建镜像并强制重建、启动网关（不创建 .env/目录，假定已部署过）。
# 适用：在服务器上 git pull 或更新代码后，本地重新打包并重启。
#
# 在服务器上执行：
#   cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/redeploy-on-server.sh
# 或本机执行：
#   ssh root@10.0.55.131 'cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/redeploy-on-server.sh'
set -euo pipefail

APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
cd "$APP_ROOT"

if [[ -f .env ]]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
fi
export CLAWDBOT_CONFIG_DIR="${CLAWDBOT_CONFIG_DIR:-/zouchengfang/moltbot/.clawdbot}"
export CLAWDBOT_WORKSPACE_DIR="${CLAWDBOT_WORKSPACE_DIR:-/zouchengfang/moltbot/clawd}"

# 中国境内构建可使用国内镜像（USE_CHINA_MIRROR=1，默认开启）
USE_CHINA_MIRROR="${USE_CHINA_MIRROR:-1}"
BUILD_ARGS=(--build-arg "CLAWDBOT_DOCKER_APT_PACKAGES=${CLAWDBOT_DOCKER_APT_PACKAGES:-}")
if [[ "$USE_CHINA_MIRROR" =~ ^(1|yes|true)$ ]]; then
  BUILD_ARGS+=(--build-arg "NODE_IMAGE=docker.1ms.run/library/node:22-bookworm")
  BUILD_ARGS+=(--build-arg "PNPM_REGISTRY=https://registry.npmmirror.com")
  echo "==> Building image (China mirrors: Node 1ms, npm npmmirror)"
else
  echo "==> Building image"
fi
docker build -t moltbot:local -f Dockerfile . "${BUILD_ARGS[@]}"

echo "==> Recreating and starting gateway"
docker compose -f docker-compose.yml -f docker-compose.app1-server.yml up -d --force-recreate moltbot-gateway

echo "Done. Gateway: http://$(hostname -I | awk '{print $1}'):18789/"
