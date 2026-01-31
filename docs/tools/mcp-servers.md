---
summary: "Configure MCP servers for agent tools (Cursor mcp.json + config)"
read_when:
  - Adding MCP servers as agent tools
  - Configuring MCP without editing Cursor mcp.json
---
# MCP servers

Moltbot exposes [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) servers as agent tools. Each server’s tools are prefixed with `mcp_<server>_` so they don’t clash across servers.

## Config sources (merged)

MCP server list is built from:

1. **Cursor global**: `~/.cursor/mcp.json` → `mcpServers`
2. **Cursor project**: `<workspace>/.cursor/mcp.json` → `mcpServers` (overrides global for same name)
3. **Moltbot config**: `skills.mcp.servers` in `~/.clawdbot/moltbot.json` (overrides Cursor for same name)

So you can:

- Use only Cursor config (no change to Moltbot config).
- Add or override servers in Moltbot config so the same list works in Cursor and Moltbot.

## Adding servers in config

In `~/.clawdbot/moltbot.json`:

```json5
{
  skills: {
    mcp: {
      enabled: true,
      servers: {
        "my-stdio-server": {
          command: "npx",
          args: ["-y", "my-mcp-server"]
        },
        "my-http-server": {
          url: "https://api.example.com/sse"
        }
      }
    }
  }
}
```

- **stdio**: `command` (required) and `args` (optional array). Optional `env` object for extra env vars.
- **HTTP**: `url` (Streamable HTTP / SSE endpoint).

Same format as Cursor’s `mcp.json`; see [Cursor MCP docs](https://docs.cursor.com/context/model-context-protocol) for details.

## Behavior

- **Discovery**: At startup, Moltbot connects to each server in **parallel** and lists tools. Per-server timeout 15s so one slow server doesn’t block the rest.
- **Tool names**: Tools appear as `mcp_<serverKey>_<toolName>` (e.g. `mcp_my-server_list_issues`).
- **Disable MCP**: Set `skills.mcp.enabled: false` to turn off MCP tools and skill entries.

## See also

- [Skills config](/tools/skills-config) for `skills.mcp` and other skill options.
- [mcporter](https://mcporter.dev) skill for ad-hoc MCP calls from the CLI.
