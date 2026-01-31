#!/usr/bin/env bash
# 在本机（如 150）上合并 MCP 配置到 moltbot 的 skills.mcp.servers。
# 从指定 mcp.json 读取 mcpServers，写入 CONFIG_PATH，并可选重启 gateway。
#
# 用法（登录 150 后在该机执行）：
#   cd /zouchengfang/moltbot && ./scripts/apply-mcp-config.sh
#   CONFIG_PATH=/zouchengfang/moltbot/.clawdbot/moltbot.json MCP_JSON=/path/to/mcp.json ./scripts/apply-mcp-config.sh
#
# 环境变量：
#   CONFIG_PATH  moltbot 配置文件（默认 APP_ROOT/.clawdbot/moltbot.json 或 ~/.clawdbot/moltbot.json）
#   MCP_JSON    本机 mcp.json 路径（默认 APP_ROOT/.cursor/mcp.json，若无则 ~/.cursor/mcp.json）
#   APP_ROOT    应用根目录（默认 /zouchengfang/moltbot），用于默认 CONFIG_PATH / MCP_JSON
#   RESTART     合并后是否重启 gateway（默认 1；0 不重启）
set -euo pipefail

APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
RESTART="${RESTART:-1}"

if [[ -z "${CONFIG_PATH:-}" ]]; then
  if [[ -f "${APP_ROOT}/.clawdbot/moltbot.json" ]]; then
    CONFIG_PATH="${APP_ROOT}/.clawdbot/moltbot.json"
  else
    CONFIG_PATH="${HOME:-/root}/.clawdbot/moltbot.json"
  fi
fi
if [[ -z "${MCP_JSON:-}" ]]; then
  if [[ -f "${APP_ROOT}/.cursor/mcp.json" ]]; then
    MCP_JSON="${APP_ROOT}/.cursor/mcp.json"
  else
    MCP_JSON="${HOME:-/root}/.cursor/mcp.json"
  fi
fi

if [[ ! -f "$MCP_JSON" ]]; then
  echo "Error: MCP config not found: $MCP_JSON" >&2
  echo "Copy your .cursor/mcp.json to this path, or set MCP_JSON=/path/to/mcp.json" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Error: config not found: $CONFIG_PATH" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq required. Install: apt-get install -y jq" >&2
  exit 1
fi

SERVERS=$(jq -c '.mcpServers // {}' "$MCP_JSON" 2>/dev/null || echo '{}')
if [[ "$SERVERS" == "{}" ]]; then
  echo "Error: no mcpServers in $MCP_JSON" >&2
  exit 1
fi

BACKUP="${CONFIG_PATH}.bak.$(date +%Y%m%d%H%M%S)"
cp -a "$CONFIG_PATH" "$BACKUP"
echo "Backed up to $BACKUP"

jq --argjson servers "$SERVERS" \
  '.skills.mcp = ((.skills.mcp // {}) | .servers = $servers)' \
  "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"
mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"

echo "Updated: $CONFIG_PATH (skills.mcp.servers from $MCP_JSON)"

if [[ "$RESTART" == "1" ]]; then
  if [[ -d "$APP_ROOT" ]] && [[ -f "${APP_ROOT}/docker-compose.yml" ]]; then
    echo "Restarting moltbot-gateway..."
    (cd "$APP_ROOT" && docker compose -f docker-compose.yml -f docker-compose.app1-server.yml restart moltbot-gateway 2>/dev/null) || true
    echo "Done."
  else
    echo "To apply, restart the gateway (e.g. cd $APP_ROOT && docker compose restart moltbot-gateway)."
  fi
fi
