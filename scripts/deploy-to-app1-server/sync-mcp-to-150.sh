#!/usr/bin/env bash
# 将本机当前 MCP 配置同步到 150 的 moltbot 配置（skills.mcp.servers）。
# 从本机 ~/.cursor/mcp.json（及可选的项目 .cursor/mcp.json）读取 mcpServers，
# 合并进 150 上的 APP_ROOT/.clawdbot/moltbot.json，并可选重启 gateway。
#
# 用法（在能 SSH 到 150 的本机执行）：
#   ./scripts/deploy-to-app1-server/sync-mcp-to-150.sh
#   MCP_PROJECT_JSON=./.cursor/mcp.json ./scripts/deploy-to-app1-server/sync-mcp-to-150.sh
#
# 环境变量：
#   MCP_GLOBAL_JSON   本机全局 MCP 配置（默认 ~/.cursor/mcp.json）
#   MCP_PROJECT_JSON  本机项目 MCP 配置（可选，与全局合并，同名校准覆盖）
#   TARGET_HOST       目标主机 150（默认 root@10.0.55.150）
#   APP_ROOT          150 上应用根目录（默认 /zouchengfang/moltbot）
#   RESTART           同步后是否重启 150 的 gateway（默认 1，设 0 不重启）
set -euo pipefail

TARGET_HOST="${TARGET_HOST:-root@10.0.55.150}"
APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
RESTART="${RESTART:-1}"
CONFIG_JSON="${APP_ROOT}/.clawdbot/moltbot.json"
MCP_GLOBAL_JSON="${MCP_GLOBAL_JSON:-$HOME/.cursor/mcp.json}"
MCP_PROJECT_JSON="${MCP_PROJECT_JSON:-}"

if ! command -v jq &>/dev/null; then
  echo "Error: jq required. Install: brew install jq (macOS) or apt-get install -y jq (Linux)" >&2
  exit 1
fi

# 合并本机 MCP：全局 + 项目（项目覆盖同名校准）
merge_local_mcp() {
  local global="$1"
  local project="$2"
  local merged='{}'
  if [[ -f "$global" ]]; then
    merged=$(jq -c '.mcpServers // {}' "$global" 2>/dev/null || echo '{}')
  fi
  if [[ -n "$project" && -f "$project" ]]; then
    local proj_servers
    proj_servers=$(jq -c '.mcpServers // {}' "$project" 2>/dev/null || echo '{}')
    merged=$(printf '%s\n%s' "$merged" "$proj_servers" | jq -s '.[0] * .[1]')
  fi
  echo "$merged"
}

SERVERS_JSON=$(merge_local_mcp "$MCP_GLOBAL_JSON" "$MCP_PROJECT_JSON")
if [[ "$SERVERS_JSON" == "{}" ]]; then
  echo "No MCP servers found in ${MCP_GLOBAL_JSON}"
  if [[ -n "$MCP_PROJECT_JSON" ]]; then
    echo "  or ${MCP_PROJECT_JSON}"
  fi
  echo "Create one of these files with mcpServers (see docs/tools/mcp-servers.md) and re-run." >&2
  exit 1
fi

echo "==> Syncing MCP config to ${TARGET_HOST}"
echo "    Source: ${MCP_GLOBAL_JSON}"
[[ -n "$MCP_PROJECT_JSON" ]] && echo "    + ${MCP_PROJECT_JSON}"
echo "    Target: ${CONFIG_JSON} (skills.mcp.servers)"

# 拉取 150 当前配置，在本地合并后写回
REMOTE_CONFIG=$(ssh -o StrictHostKeyChecking=accept-new "${TARGET_HOST}" "cat '${CONFIG_JSON}' 2>/dev/null || echo '{}'")
BACKUP="${CONFIG_JSON}.bak.$(date +%Y%m%d%H%M%S)"
MERGED=$(echo "$REMOTE_CONFIG" | jq --argjson servers "$SERVERS_JSON" \
  '.skills.mcp = ((.skills.mcp // {}) | .servers = $servers)')
echo "$MERGED" | ssh -o StrictHostKeyChecking=accept-new "${TARGET_HOST}" \
  "mkdir -p $(dirname "${CONFIG_JSON}") && cp -a '${CONFIG_JSON}' '${BACKUP}' 2>/dev/null || true; cat > '${CONFIG_JSON}'"

echo "    Backed up on remote to ${BACKUP}"
echo "    Updated: skills.mcp.servers on ${TARGET_HOST}"

if [[ "${RESTART}" == "1" ]]; then
  echo "==> Restarting moltbot-gateway on ${TARGET_HOST}"
  ssh -o StrictHostKeyChecking=accept-new "${TARGET_HOST}" \
    "cd ${APP_ROOT} && docker compose -f docker-compose.yml -f docker-compose.app1-server.yml restart moltbot-gateway 2>/dev/null || true"
  echo "    Gateway restarted."
fi

echo "==> MCP sync complete."
