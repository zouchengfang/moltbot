---
summary: "企业微信群机器人通知渠道配置"
read_when:
  - 配置企业微信通知
  - 通过群机器人 Webhook 发送消息
---

# 企业微信 (WeCom)

状态：以插件形式支持，仅出站通知（群机器人 Webhook）。无入站、无会话路由。

通过企业微信群机器人 Webhook 发送文本通知。参考 [企业微信 - 群机器人](https://developer.work.weixin.qq.com/document/path/91770)。

## 安装插件

```bash
moltbot plugins install @moltbot/wecom
```

本地开发时：

```bash
moltbot plugins install ./extensions/wecom
```

## 配置

1. 在企业微信群中添加群机器人，获取 **Webhook 地址**（形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）。
2. 在 Moltbot 配置中填写该地址。

单账号示例：

```json5
{
  channels: {
    wecom: {
      enabled: true,
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"
    }
  }
}
```

多账号示例：

```json5
{
  channels: {
    wecom: {
      enabled: true,
      accounts: {
        default: {
          webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=KEY1",
          name: "群 A"
        },
        group2: {
          webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=KEY2",
          name: "群 B"
        }
      }
    }
  }
}
```

## 使用

- 发送通知：`moltbot message send --channel wecom --to default "通知内容"`（单账号时可省略 `--to`）。
- 作为心跳或告警目标：在 agent 配置中指定 `heartbeat.target: wecom` 或路由到 `wecom` 渠道。

## 限制

- 仅支持出站；无入站消息、无会话。
- 每个机器人每分钟最多约 20 条消息（企业微信限制）。
- 请勿将 Webhook 地址泄露到公开仓库。
