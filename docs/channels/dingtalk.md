---
summary: "钉钉自定义机器人通知渠道配置"
read_when:
  - 配置钉钉通知
  - 通过自定义机器人 Webhook 发送消息
---

# 钉钉 (DingTalk)

状态：以插件形式支持，仅出站通知（自定义机器人 Webhook）。无入站、无会话路由。

通过钉钉群自定义机器人 Webhook 发送文本通知。若机器人开启了「加签」安全设置，需在配置中填写 `secret`。参考 [钉钉自定义机器人](https://open.dingtalk.com/document/robots/custom-robot-access)。

## 安装插件

```bash
moltbot plugins install @moltbot/dingtalk
```

本地开发时：

```bash
moltbot plugins install ./extensions/dingtalk
```

## 配置

1. 在钉钉群中添加自定义机器人，获取 **Webhook 地址**。
2. 若启用「加签」，复制 **密钥**（secret）。
3. 在 Moltbot 配置中填写 Webhook 地址，若使用加签则填写 `secret`。

单账号（无加签）示例：

```json5
{
  channels: {
    dingtalk: {
      enabled: true,
      webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
    }
  }
}
```

单账号（加签）示例：

```json5
{
  channels: {
    dingtalk: {
      enabled: true,
      webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN",
      secret: "SECRET_FOR_SIGN"
    }
  }
}
```

多账号示例：

```json5
{
  channels: {
    dingtalk: {
      enabled: true,
      accounts: {
        default: {
          webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=TOKEN1",
          secret: "SECRET1",
          name: "群 A"
        },
        group2: {
          webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=TOKEN2",
          name: "群 B"
        }
      }
    }
  }
}
```

## 使用

- 发送通知：`moltbot message send --channel dingtalk --to default "通知内容"`（单账号时可省略 `--to`）。
- 作为心跳或告警目标：在 agent 配置中指定 `heartbeat.target: dingtalk` 或路由到 `dingtalk` 渠道。

## 限制

- 仅支持出站；无入站消息、无会话。
- 每个机器人每分钟最多约 20 条消息（钉钉限制）。
- 请勿将 Webhook 地址和 secret 泄露到公开仓库。
