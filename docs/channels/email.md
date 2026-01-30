---
summary: "Email (SMTP) notification channel configuration"
read_when:
  - Configuring email notifications
  - Sending via SMTP
---

# Email

Status: supported via plugin; outbound only (SMTP). No inbound, no session routing.

Sends plain-text email via SMTP. Uses nodemailer; supports any SMTP server (Gmail, SendGrid, local relay, etc.).

## Install plugin

```bash
moltbot plugins install @moltbot/email
```

From a local checkout:

```bash
moltbot plugins install ./extensions/email
```

## Configuration

Configure SMTP: `host`, `from` are required. Optional: `port` (default 587), `secure` (default false), `auth.user` / `auth.pass` for authenticated SMTP.

Single account example:

```json5
{
  channels: {
    email: {
      enabled: true,
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: {
        user: "notify@example.com",
        pass: "your-app-password"
      },
      from: "notify@example.com",
      name: "Moltbot"
    }
  }
}
```

Multi-account example:

```json5
{
  channels: {
    email: {
      enabled: true,
      accounts: {
        default: {
          host: "smtp.example.com",
          port: 587,
          from: "notify@example.com",
          auth: { user: "notify@example.com", pass: "..." },
          name: "Moltbot"
        },
        alerts: {
          host: "smtp.sendgrid.net",
          port: 587,
          from: "alerts@example.com",
          auth: { user: "apikey", pass: "SG.xxx" },
          name: "Alerts"
        }
      }
    }
  }
}
```

## Usage

- Send notification: `moltbot message send --channel email --to "user@example.com" "Message body"`.
- As heartbeat or alert target: set `heartbeat.target: email` and `heartbeat.to: "user@example.com"` in agent config, or route to the `email` channel with an explicit `--to` recipient.

## Limits

- Outbound only; no inbound messages, no sessions.
- Recipient (`--to`) is required for every send.
- Default subject is "Moltbot notification"; subject is not configurable per message in the current plugin.
- Do not commit SMTP passwords; use env vars or a secrets manager.
