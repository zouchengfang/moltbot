# Telegram 配置说明（@Zoucf_bot）

## 1. 配置方式（二选一）

**方式 A：CLI 一键添加（推荐）**

在项目或已安装 moltbot 的环境下执行：

```bash
moltbot channels add --channel telegram --token "8596530078:AAGiobRJSEKcJw4fH7Mi4dv4foCfgsRkRF4"
```

会写入当前使用的配置文件（`~/.clawdbot/moltbot.json` 或 `~/.openclaw/openclaw.json`）。

**方式 B：手动编辑配置文件**

将下面第 2 节的 JSON 合并到你的 Moltbot 配置文件中。若已有 `channels` 对象，只合并其中的 `telegram` 即可。

## 2. 配置示例（Telegram 为主要交互渠道）

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "8596530078:AAGiobRJSEKcJw4fH7Mi4dv4foCfgsRkRF4",
      "dmPolicy": "pairing",
      "groups": { "*": { "requireMention": true } }
    }
  }
}
```

说明：

- **enabled**: `true` 表示启用 Telegram 渠道。
- **botToken**: 来自 @BotFather 的 token（当前为 @Zoucf_bot，t.me/Zoucf_bot）。
- **dmPolicy**: `"pairing"` 表示私聊需短码配对后由你审批；若希望任何人可直接私聊，可改为 `"open"` 并设置 `"allowFrom": ["*"]`。
- **groups**: 群聊中默认需要 @提及 bot 才会回复。

## 3. 设为“主要”交互方式

Moltbot 没有单独的“主渠道”开关。只要启用 Telegram 并启动网关，用户通过 Telegram 与 bot 对话即会使用该渠道；会话会记录 `lastChannel`，下次同一用户继续用 Telegram 即可。若你希望仅用 Telegram、不用其他渠道，可在配置中关闭其他渠道（例如 `channels.slack.enabled: false`）。

## 4. 使用步骤

1. 将上述 `channels.telegram` 写入你的配置文件。
2. 启动网关：`moltbot gateway run`（或你当前的启动方式）。
3. 在 Telegram 中打开 t.me/Zoucf_bot，发送一条消息。
4. 若使用 `dmPolicy: "pairing"`，在终端执行 `moltbot pairing list telegram` 查看配对码，再执行 `moltbot pairing approve telegram <code>` 审批。

## 5. 安全提醒

- **不要将 botToken 提交到 Git 或公开环境。** 建议仅放在本机或服务器的配置文件中，并限制文件权限。
- 若 token 已泄露，请在 @BotFather 中撤销并重新生成 token，然后更新配置中的 `botToken`。
