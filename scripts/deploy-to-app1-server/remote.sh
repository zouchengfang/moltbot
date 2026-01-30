#!/usr/bin/env bash
# 在 app1-server 上执行：准备目录、.env、构建镜像并启动网关。
# 用法（在服务器上）：cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/remote.sh
# 或本机执行：ssh root@10.0.55.131 'cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/remote.sh'
set -euo pipefail

APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
cd "$APP_ROOT"

mkdir -p .clawdbot clawd
chown -R 1000:1000 .clawdbot clawd 2>/dev/null || true

if [[ ! -f .env ]]; then
  if [[ -f scripts/deploy-to-app1-server/.env.app1-server.example ]]; then
    cp scripts/deploy-to-app1-server/.env.app1-server.example .env
    echo "Generated .env from example; set CLAWDBOT_GATEWAY_TOKEN (openssl rand -hex 32)"
  else
    cat > .env << 'ENVEOF'
CLAWDBOT_CONFIG_DIR=/zouchengfang/moltbot/.clawdbot
CLAWDBOT_WORKSPACE_DIR=/zouchengfang/moltbot/clawd
HTTP_PROXY=http://10.5.0.8:3128
HTTPS_PROXY=http://10.5.0.8:3128
NO_PROXY=api.deepseek.com,chat.qwen.ai,portal.qwen.ai,dashscope.aliyun.com,10.0.55.0/24,10.0.66.0/24,10.8.0.0/24,10.5.0.0/16,.cn
ENVEOF
  fi
fi

export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
export CLAWDBOT_CONFIG_DIR="${CLAWDBOT_CONFIG_DIR:-/zouchengfang/moltbot/.clawdbot}"
export CLAWDBOT_WORKSPACE_DIR="${CLAWDBOT_WORKSPACE_DIR:-/zouchengfang/moltbot/clawd}"

if [[ -z "${CLAWDBOT_GATEWAY_TOKEN:-}" ]]; then
  CLAWDBOT_GATEWAY_TOKEN=$(openssl rand -hex 32 2>/dev/null || true)
  if [[ -n "$CLAWDBOT_GATEWAY_TOKEN" ]]; then
    if grep -q '^CLAWDBOT_GATEWAY_TOKEN=' .env 2>/dev/null; then
      sed -i "s/^CLAWDBOT_GATEWAY_TOKEN=.*/CLAWDBOT_GATEWAY_TOKEN=$CLAWDBOT_GATEWAY_TOKEN/" .env
    else
      echo "CLAWDBOT_GATEWAY_TOKEN=$CLAWDBOT_GATEWAY_TOKEN" >> .env
    fi
    export CLAWDBOT_GATEWAY_TOKEN
  fi
fi

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

echo "==> Starting gateway (compose + app1-server override)"
docker compose -f docker-compose.yml -f docker-compose.app1-server.yml up -d --force-recreate moltbot-gateway

echo "Done. Gateway: http://$(hostname -I | awk '{print $1}'):18789/  Token: ${CLAWDBOT_GATEWAY_TOKEN:-<see .env>}"
