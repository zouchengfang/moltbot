#!/usr/bin/env bash
# 在 131 服务器上查看 moltbot 网关日志与配置路径。
# 用法：在 131 上执行
#   cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/view-logs-and-config.sh
# 或本机：ssh root@10.0.55.131 'cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/view-logs-and-config.sh'
set -euo pipefail

APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
CONFIG_DIR="${CLAWDBOT_CONFIG_DIR:-/zouchengfang/moltbot/.clawdbot}"
CONFIG_FILE="${CONFIG_DIR}/moltbot.json"
cd "$APP_ROOT"

echo "=== Gateway container status ==="
docker compose -f docker-compose.yml -f docker-compose.app1-server.yml ps

echo ""
echo "=== Config path ==="
echo "  CONFIG_DIR:  $CONFIG_DIR"
echo "  CONFIG_FILE: $CONFIG_FILE"
if [[ -f "$CONFIG_FILE" ]]; then
  echo "  (file exists)"
else
  echo "  (file not found)"
fi

echo ""
echo "=== Last 150 lines of moltbot-gateway logs ==="
docker compose -f docker-compose.yml -f docker-compose.app1-server.yml logs moltbot-gateway --tail 150

echo ""
echo "=== To edit config on server ==="
echo "  vi $CONFIG_FILE"
echo "  # or: cat $CONFIG_FILE | head -200"
