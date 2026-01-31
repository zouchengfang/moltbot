# 131 节点：图片与语音使用 Qwen 模型

适用于 131 节点，将**图片理解**和（在支持范围内）**语音识别**配置为使用 Qwen 下可用模型。

- **图片理解**：使用 Qwen Portal 的 `vision-model`（需已登录 Qwen OAuth）。
- **语音转录**：使用 OpenAI 默认模型 `gpt-4o-mini-transcribe`（需在 131 上配置 OpenAI API Key）。

配置文件路径：`~/.clawdbot/moltbot.json`（或 `CLAWDBOT_CONFIG_PATH`；若 131 使用 openclaw 则为 `~/.openclaw/openclaw.json`）。

## 方式一：脚本合并（推荐）

在 **131 节点**上执行（先确保已 `moltbot models auth login --provider qwen-portal` 登录 Qwen）：

```bash
# 若使用 moltbot 默认配置路径
CONFIG_PATH=~/.clawdbot/moltbot.json ./scripts/apply-131-media-config.sh
```

若 131 使用 openclaw 配置路径：

```bash
CONFIG_PATH=/root/.openclaw/openclaw.json ./scripts/apply-131-media-config.sh
```

脚本会：

1. 备份当前配置到 `moltbot.json.bak.YYYYMMDDHHMMSS`（或对应 CONFIG_PATH）
2. 合并 `tools.media.image`：`models` 与 `defaultModels` 使用 qwen-portal / vision-model
3. 合并 `tools.media.audio`：`models` 与 `defaultModels` 使用 openai / gpt-4o-mini-transcribe
4. 提示重启网关

**依赖**：节点需已安装 `jq`。若未安装：`apt-get update && apt-get install -y jq`

## 方式二：手动编辑

在 131 的配置文件中合并以下内容（若已有同名键则按需覆盖）：

```json
{
  "tools": {
    "media": {
      "image": {
        "enabled": true,
        "models": [
          { "provider": "qwen-portal", "model": "vision-model" }
        ],
        "defaultModels": {
          "qwen-portal": "vision-model"
        }
      },
      "audio": {
        "enabled": true,
        "models": [
          { "provider": "openai", "model": "gpt-4o-mini-transcribe" }
        ],
        "defaultModels": {
          "openai": "gpt-4o-mini-transcribe"
        }
      }
    }
  }
}
```

说明：

- **图片**：`tools.media.image.models` 显式指定使用 `qwen-portal` 的 `vision-model`；`defaultModels` 保证其他逻辑（如 image-tool fallback）也优先用 Qwen。
- **语音**：`tools.media.audio.models` 与 `defaultModels` 指定使用 OpenAI 默认转录模型 `gpt-4o-mini-transcribe`；131 上需已配置 OpenAI API Key。

保存后重启网关。

## 重启网关

配置生效需重启网关，例如：

```bash
pkill -9 -f moltbot-gateway || true
nohup moltbot gateway run --bind lan --port 18789 --force > /tmp/moltbot-gateway.log 2>&1 &
```

验证：

```bash
moltbot channels status --probe
ss -ltnp | grep 18789
tail -n 120 /tmp/moltbot-gateway.log
```

## 前置条件

- 131 上已安装 moltbot，且网关可正常启动。
- **图片使用 Qwen**：必须先完成 Qwen OAuth 登录，例如在本机或 131 上执行：
  - `moltbot models auth login --provider qwen-portal`  
  登录后，`vision-model` 会出现在模型目录中，图片理解才会走 qwen-portal。
- **语音使用 OpenAI**：131 上需已配置 OpenAI API Key（如写入 `~/.clawdbot/agents/<agentId>/agent/auth-profiles.json` 或通过 `moltbot models auth login --provider openai` 等）。

## 安全提醒

- 不要将配置文件或 token 提交到 Git。
- 若使用脚本，避免在脚本内写死 token；敏感信息用环境变量或已有凭证目录。
