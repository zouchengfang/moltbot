#!/usr/bin/env bash
# 在新加坡节点上合并配置：Telegram、推理模式、网页抓取。
# 用法（在新加坡节点上执行，或通过 ssh 执行）：
#   export TELEGRAM_BOT_TOKEN='YOUR_BOT_TOKEN'
#   CONFIG_PATH=/root/.openclaw/openclaw.json ./scripts/apply-singapore-openclaw-config.sh
# 或从本机：
#   ssh root@43.153.195.124 'export TELEGRAM_BOT_TOKEN="YOUR_TOKEN"; bash -s' < scripts/apply-singapore-openclaw-config.sh
set -euo pipefail

CONFIG_PATH="${CONFIG_PATH:-/root/.openclaw/openclaw.json}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

if [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
  echo "Error: set TELEGRAM_BOT_TOKEN (e.g. export TELEGRAM_BOT_TOKEN='123:ABC...')" >&2
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

BACKUP="${CONFIG_PATH}.bak.$(date +%Y%m%d%H%M%S)"
cp -a "$CONFIG_PATH" "$BACKUP"
echo "Backed up to $BACKUP"

jq --arg token "$TELEGRAM_BOT_TOKEN" '
  (.channels.telegram = {
    enabled: true,
    botToken: $token,
    dmPolicy: "pairing",
    groups: { "*": { requireMention: true } }
  }) |
  (.agents.defaults //= {} | .agents.defaults.reasoningDefault = "on") |
  (.tools.web //= {} | .tools.web.fetch //= {} | .tools.web.fetch.enabled = true)
' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"
mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"

echo "Updated: $CONFIG_PATH"
echo "  - channels.telegram (enabled, botToken, dmPolicy, groups)"
echo "  - agents.defaults.reasoningDefault: on"
echo "  - tools.web.fetch.enabled: true"
echo ""
echo "Restart the gateway to apply (e.g. pkill -9 -f moltbot-gateway; nohup moltbot gateway run --bind lan --port 18789 --force &)."
