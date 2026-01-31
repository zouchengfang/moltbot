#!/usr/bin/env bash
# 在 131 节点上合并配置：图片用 Qwen，语音用 OpenAI 默认模型。
# 图片理解：qwen-portal/vision-model；语音转录：openai/gpt-4o-mini-transcribe。
# 用法（在 131 节点上执行）：
#   CONFIG_PATH=~/.clawdbot/moltbot.json ./scripts/apply-131-media-config.sh
# 或 openclaw 路径：
#   CONFIG_PATH=/root/.openclaw/openclaw.json ./scripts/apply-131-media-config.sh
set -euo pipefail

CONFIG_PATH="${CONFIG_PATH:-$HOME/.clawdbot/moltbot.json}"

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

jq '
  (.tools.media //= {} | .tools.media.image //= {} | .tools.media.image.enabled = true) |
  (.tools.media.image.models = [{ provider: "qwen-portal", model: "vision-model" }]) |
  (.tools.media.image.defaultModels = { "qwen-portal": "vision-model" }) |
  (.tools.media.audio //= {} | .tools.media.audio.enabled = true) |
  (.tools.media.audio.models = [{ provider: "openai", model: "gpt-4o-mini-transcribe" }]) |
  (.tools.media.audio.defaultModels = { "openai": "gpt-4o-mini-transcribe" })
' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"
mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"

echo "Updated: $CONFIG_PATH"
echo "  - tools.media.image.enabled: true"
echo "  - tools.media.image.models: [{ provider: \"qwen-portal\", model: \"vision-model\" }]"
echo "  - tools.media.image.defaultModels: { \"qwen-portal\": \"vision-model\" }"
echo "  - tools.media.audio.enabled: true"
echo "  - tools.media.audio.models: [{ provider: \"openai\", model: \"gpt-4o-mini-transcribe\" }]"
echo "  - tools.media.audio.defaultModels: { \"openai\": \"gpt-4o-mini-transcribe\" }"
echo ""
echo "Restart the gateway to apply (e.g. pkill -9 -f moltbot-gateway; nohup moltbot gateway run --bind lan --port 18789 --force &)."
echo "Ensure Qwen OAuth is logged in on this node: moltbot models auth login --provider qwen-portal"
