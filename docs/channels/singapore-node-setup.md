# 新加坡节点配置（Telegram + 推理模式 + 网页抓取）

适用于新加坡节点（43.153.195.124），将以下配置合并到 `/root/.openclaw/openclaw.json`：

- **Telegram**：启用 @Zoucf_bot，私聊配对、群聊需 @ 提及
- **推理模式**：`agents.defaults.reasoningDefault: "on"`，同时显示思考过程与最终回答
- **网页抓取**：`tools.web.fetch.enabled: true`，启用 web_fetch 工具

## 方式一：脚本合并（推荐）

在**新加坡节点**上执行（token 通过环境变量传入，不落盘到脚本）：

```bash
# 登录新加坡节点
ssh root@43.153.195.124

# 设置 Telegram Bot Token（不要提交到 Git）
export TELEGRAM_BOT_TOKEN='8596530078:AAGiobRJSEKcJw4fH7Mi4dv4foCfgsRkRF4'

# 若脚本已在节点上（例如 git clone 了本仓库）
CONFIG_PATH=/root/.openclaw/openclaw.json ./scripts/apply-singapore-openclaw-config.sh
```

或从**本机**直接通过 SSH 传脚本执行（无需在节点上拉代码）：

```bash
export TELEGRAM_BOT_TOKEN='8596530078:AAGiobRJSEKcJw4fH7Mi4dv4foCfgsRkRF4'
ssh root@43.153.195.124 "CONFIG_PATH=/root/.openclaw/openclaw.json TELEGRAM_BOT_TOKEN='$TELEGRAM_BOT_TOKEN' bash -s" < scripts/apply-singapore-openclaw-config.sh
```

脚本会：

1. 备份当前配置到 `openclaw.json.bak.YYYYMMDDHHMMSS`
2. 用 `jq` 合并：`channels.telegram`、`agents.defaults.reasoningDefault: "on"`、`tools.web.fetch.enabled: true`
3. 提示重启网关

**依赖**：节点需已安装 `jq`。若未安装：`apt-get update && apt-get install -y jq`

## 方式二：手动编辑

SSH 到新加坡节点后编辑 `/root/.openclaw/openclaw.json`，在现有 JSON 中合并以下内容（若已有同名键则覆盖或按需合并）：

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "8596530078:AAGiobRJSEKcJw4fH7Mi4dv4foCfgsRkRF4",
      "dmPolicy": "pairing",
      "groups": { "*": { "requireMention": true } }
    }
  },
  "agents": {
    "defaults": {
      "reasoningDefault": "on"
    }
  },
  "tools": {
    "web": {
      "fetch": {
        "enabled": true
      }
    }
  }
}
```

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

## Telegram 配对（私聊）

若使用 `dmPolicy: "pairing"`，用户首次私聊 bot 后需在本机或能执行 moltbot 的机器上审批：

```bash
moltbot pairing list telegram
moltbot pairing approve telegram <code>
```

## 安全提醒

- 不要将 `TELEGRAM_BOT_TOKEN` 或配置文件提交到 Git。
- 若 token 泄露，请在 @BotFather 撤销并重新生成，再更新配置。
