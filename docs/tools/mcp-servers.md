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

## Troubleshooting

If MCP servers fail to connect after project start, check the following.

### `spawn docker EACCES` or `spawn uvx EACCES`

**Cause:** Cursor (or the process that runs MCP servers) is in an environment where `docker` or `uvx` is not executable—e.g. dev container, sandbox, or PATH not including those binaries.

**Fixes:**

- **Run Cursor on the host** (not inside a dev container) so your normal PATH and Docker/uv are available; or
- **Install and expose the binary** in that environment:
  - Docker: install Docker CLI and ensure the process can run `docker` (e.g. add to PATH, or disable the server if Docker isn’t needed).
  - `uvx`: from [uv](https://docs.astral.sh/uv/) (Python). Install uv, then ensure `uvx` is on PATH and executable (`which uvx`).
- **Disable servers you don’t need:** remove or comment out the `prometheus` (docker) and any `uvx`-based servers in `~/.cursor/mcp.json` or `.cursor/mcp.json` if you’re in a restricted environment.

### `lsof: Permission denied` / `kill` (e.g. browsermcp)

**Cause:** The MCP server (e.g. browsermcp) tries to run `lsof -ti:9009 | xargs kill -9` to free a port; the environment denies execution of `lsof` or `kill`.

**Fix:** Run Cursor on the host where `lsof`/`kill` are allowed, or disable that MCP server in `mcp.json` when inside a sandbox/container.

### `dbhub`: config file not found

**Cause:** Dbhub expects a config file (e.g. `~/.cursor/dbhub.toml` or path given by `--config`).

**Fix:** Create the config file at the path Dbhub expects, or remove the dbhub entry from `mcp.json` if you don’t use it.

### `telegram`: invalid `TG_APP_ID`

**Cause:** Env var `TG_APP_ID` is still the placeholder `YOUR_TG_APP_ID`, which is not a valid int64.

**Fix:** Set a real Telegram app ID in your environment or in the server’s `env` in `mcp.json`; or disable the telegram MCP server if not needed.

### `gitlab-mr-mcp`: 404 Not Found

**Cause:** The package `@kopfrechner/gitlab-mr-mcp` is not published (or was removed) from the npm registry.

**Fix:** Remove the `gitlab-mr-mcp` entry from `mcp.json`, or replace it with another GitLab MCP server if available.

### `kubectl-mcp-server`: No module named pip

**Cause:** The server is started with Python but `pip` is not installed in that Python environment.

**Fix:** Install pip for the Python used to run the server (e.g. `python3 -m ensurepip` or install `python3-pip`), or disable the server in `mcp.json`.

### `server-json-mcp`: Permission denied

**Cause:** The `server-json-mcp` (or `json-mcp`) binary launched by npx is not executable in the current environment (e.g. sandbox blocking execution of scripts in cache).

**Fix:** Run Cursor on the host, or ensure the npx cache directory is writable and the spawned script is executable; if not needed, disable the server in `mcp.json`.

### npm cache ENOTEMPTY / mcp-webresearch connection closed

**Cause:** npx cache race or corrupted cache when running a server (e.g. mcp-webresearch); or npm access token expired.

**Fix:** Clear npx cache (`npx clear-npx-cache` or delete `~/.npm/_cache/_npx`) and retry; re-run `npm login` if you see “Access token expired or revoked”.

### Discovery timeouts (url-get, sysom_mcp, browsermcp, iterm-mcp, windows-cli)

**Cause:** Server takes longer than the discovery timeout (e.g. 15s) to start or respond—often after one of the above errors (e.g. lsof failure, stack overflow).

**Fix:** Fix the underlying error for that server (see above); then restart. Reducing the number of MCP servers in `mcp.json` to only what you need also speeds startup and avoids timeouts.

## See also

- [Skills config](/tools/skills-config) for `skills.mcp` and other skill options.
- [mcporter](https://mcporter.dev) skill for ad-hoc MCP calls from the CLI.
