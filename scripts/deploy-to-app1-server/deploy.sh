#!/usr/bin/env bash
# 将 Moltbot 以 Docker 方式部署到 app1-server (10.0.55.131)。
# 应用根目录：宿主机 /zouchengfang/moltbot。
# 代理：10.5.0.8:3128；NO_PROXY：DeepSeek/Qwen API、本地网段（10.0.55.x, 10.0.66.x, 10.8.0.x, 10.5.x.x）、*.cn。
#
# 用法（在 moltbot 仓库根目录执行）:
#   ./scripts/deploy-to-app1-server/deploy.sh [sync|remote]
#   sync   - 仅同步代码到服务器（rsync）
#   remote - 仅在服务器上执行构建与启动（不同步）
#   无参数 - 先同步再在服务器上构建并启动
#
# 环境变量:
#   REMOTE        - SSH 目标，默认 root@10.0.55.131
#   APP_ROOT      - 服务器上应用根目录，默认 /zouchengfang/moltbot
#   NODES_CONFIG  - nodes_config.yaml 路径，用于解析 REMOTE/APP_ROOT（可选）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REMOTE="${REMOTE:-root@10.0.55.131}"
APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
NODES_CONFIG="${NODES_CONFIG:-$REPO_ROOT/../network_home/nodes_config.yaml}"

if [[ -f "${NODES_CONFIG}" ]]; then
  if command -v yq >/dev/null 2>&1; then
    _ip=$(yq '.local_nodes.virtual_machines[]? | select(.name == "app1-server") | .ip_address' "$NODES_CONFIG" 2>/dev/null | head -1)
    _path=$(yq '.local_nodes.virtual_machines[]? | select(.name == "app1-server") | .paths.custom_dir' "$NODES_CONFIG" 2>/dev/null | head -1)
    [[ -n "$_ip" && "$_ip" != "null" ]] && REMOTE="root@${_ip}"
    [[ -n "$_path" && "$_path" != "null" ]] && APP_ROOT="${_path}/moltbot"
  fi
fi

do_sync() {
  echo "==> Syncing repo to $REMOTE:$APP_ROOT"
  rsync -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '**/node_modules' \
    --exclude '.pnpm-store' \
    --exclude 'dist' \
    --exclude 'coverage' \
    --exclude '.turbo' \
    --exclude '*.log' \
    "$REPO_ROOT/" "$REMOTE:$APP_ROOT/"
}

do_remote() {
  echo "==> On $REMOTE: prepare dirs, .env, build and start"
  ssh "$REMOTE" "set -euo pipefail
    cd $APP_ROOT
    mkdir -p .clawdbot clawd
    chown -R 1000:1000 .clawdbot clawd 2>/dev/null || true
    if [[ ! -f .env ]]; then
      if [[ -f scripts/deploy-to-app1-server/.env.app1-server.example ]]; then
        cp scripts/deploy-to-app1-server/.env.app1-server.example .env
        echo 'Generated .env from example; set CLAWDBOT_GATEWAY_TOKEN (openssl rand -hex 32)'
      else
        echo 'CLAWDBOT_CONFIG_DIR=/zouchengfang/moltbot/.clawdbot' > .env
        echo 'CLAWDBOT_WORKSPACE_DIR=/zouchengfang/moltbot/clawd' >> .env
        echo 'HTTP_PROXY=http://10.5.0.8:3128' >> .env
        echo 'HTTPS_PROXY=http://10.5.0.8:3128' >> .env
        echo 'NO_PROXY=api.deepseek.com,chat.qwen.ai,portal.qwen.ai,dashscope.aliyun.com,10.0.55.0/24,10.0.66.0/24,10.8.0.0/24,10.5.0.0/16,.cn' >> .env
      fi
    fi
    export \$(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
    export CLAWDBOT_CONFIG_DIR=\${CLAWDBOT_CONFIG_DIR:-/zouchengfang/moltbot/.clawdbot}
    export CLAWDBOT_WORKSPACE_DIR=\${CLAWDBOT_WORKSPACE_DIR:-/zouchengfang/moltbot/clawd}
    if [[ -z \"\${CLAWDBOT_GATEWAY_TOKEN:-}\" ]]; then
      CLAWDBOT_GATEWAY_TOKEN=\$(openssl rand -hex 32 2>/dev/null || echo '')
      grep -q '^CLAWDBOT_GATEWAY_TOKEN=' .env && sed -i \"s/^CLAWDBOT_GATEWAY_TOKEN=.*/CLAWDBOT_GATEWAY_TOKEN=\$CLAWDBOT_GATEWAY_TOKEN/\" .env || echo \"CLAWDBOT_GATEWAY_TOKEN=\$CLAWDBOT_GATEWAY_TOKEN\" >> .env
      export CLAWDBOT_GATEWAY_TOKEN
    fi
    echo '==> Building image (BuildKit for pnpm cache)'
    export DOCKER_BUILDKIT=1
    docker build -t moltbot:local -f Dockerfile .
    echo '==> Starting gateway (compose + app1-server override)'
    docker compose -f docker-compose.yml -f docker-compose.app1-server.yml up -d moltbot-gateway
    echo 'Done. Gateway: http://\$(hostname -I | awk \"{print \\\$1}\"):18789/  Token: '\$CLAWDBOT_GATEWAY_TOKEN
  "
}

MODE="${1:-}"
case "$MODE" in
  sync)  do_sync ;;
  remote) do_remote ;;
  *)
    do_sync
    do_remote
    ;;
esac
