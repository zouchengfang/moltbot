/**
 * Resolve MCP tools from Cursor-configured MCP servers (.cursor/mcp.json, ~/.cursor/mcp.json).
 * Connects to each server (stdio or Streamable HTTP), lists tools, and exposes them as AnyAgentTool.
 */

import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { MoltbotConfig } from "../../config/config.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getMergedMcpConfig, type CursorMcpServerConfig } from "../skills/mcp-cursor.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const log = createSubsystemLogger("mcp-tools");

/** MCP SDK 1.25: Client from @modelcontextprotocol/sdk/client; Transport = connect() argument type. */
type McpClient = (typeof import("@modelcontextprotocol/sdk/client"))["Client"];
type McpTransport = InstanceType<McpClient> extends { connect(t: infer T): unknown } ? T : never;

function isMcpEnabled(config?: MoltbotConfig): boolean {
  const raw = config?.skills?.mcp;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "object" && raw !== null && "enabled" in raw) {
    return (raw as { enabled?: boolean }).enabled !== false;
  }
  return true;
}

/** Unique tool name: mcp_<serverKey>_<toolName> to avoid clashes across servers. */
function mcpToolName(serverKey: string, toolName: string): string {
  const safeServer = serverKey.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "mcp";
  const safeTool = toolName.replace(/\W+/g, "_") || "tool";
  return `mcp_${safeServer}_${safeTool}`;
}

/** MCP tool list item (from tools/list). */
type McpTool = {
  name: string;
  description?: string;
  inputSchema?: { type?: string; properties?: Record<string, unknown>; [k: string]: unknown };
};

/** MCP call result content item. */
type McpContentItem =
  | { type: "text"; text: string }
  | { type: "image"; data?: string; mimeType?: string }
  | { type: string; [k: string]: unknown };

/** Convert MCP content items to AgentToolResult content (text/image with required fields). */
function mcpContentToAgentResult(content: McpContentItem[]): {
  content: AgentToolResult<unknown>["content"];
  details?: unknown;
} {
  const blocks: AgentToolResult<unknown>["content"] = content.map((item) => {
    if (item.type === "text" && "text" in item) {
      return { type: "text" as const, text: String((item as { text: string }).text) };
    }
    if (item.type === "image") {
      return {
        type: "image" as const,
        data: (item as { data?: string }).data ?? "",
        mimeType: (item as { mimeType?: string }).mimeType ?? "image/png",
      };
    }
    return { type: "text" as const, text: JSON.stringify(item) };
  });
  return {
    content: blocks,
    details: content.length === 1 ? content[0] : content,
  };
}

/** Build env object with only string values (MCP stdio transport expects Record<string, string>). */
function toEnvRecord(
  env: Record<string, string | undefined> | undefined,
): Record<string, string> | undefined {
  if (!env) return undefined;
  const entries = Object.entries(env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return Object.fromEntries(entries) as Record<string, string>;
}

async function connectAndListTools(params: {
  serverKey: string;
  serverConfig: CursorMcpServerConfig;
}): Promise<{ serverKey: string; tools: McpTool[] } | null> {
  const { serverKey, serverConfig } = params;
  let Client: McpClient;
  let StdioClientTransport: new (opts: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }) => McpTransport;
  let StreamableHTTPClientTransport: new (url: URL) => McpTransport;
  let ListToolsResultSchema: unknown;

  try {
    const clientMod = await import("@modelcontextprotocol/sdk/client");
    const stdioMod = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const streamableMod = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const typesMod = await import("@modelcontextprotocol/sdk/types.js");
    Client = clientMod.Client;
    StdioClientTransport = stdioMod.StdioClientTransport;
    StreamableHTTPClientTransport = streamableMod.StreamableHTTPClientTransport;
    ListToolsResultSchema = typesMod.ListToolsResultSchema;
  } catch (err) {
    log.warn(`MCP SDK not available: ${err}`);
    return null;
  }

  const command =
    typeof serverConfig.command === "string" ? serverConfig.command.trim() : undefined;
  const args = Array.isArray(serverConfig.args) ? serverConfig.args.map((a) => String(a)) : [];
  const url = typeof serverConfig.url === "string" ? serverConfig.url.trim() : undefined;
  const envRaw =
    serverConfig.env && typeof serverConfig.env === "object" ? serverConfig.env : undefined;
  const env = envRaw
    ? toEnvRecord({ ...process.env, ...envRaw } as Record<string, string | undefined>)
    : undefined;

  const client = new Client({ name: "moltbot-mcp", version: "1.0.0" }, { capabilities: {} });

  let transport: { close?: () => Promise<void> };
  try {
    if (command) {
      transport = new StdioClientTransport({
        command,
        args,
        env,
      });
    } else if (url) {
      transport = new StreamableHTTPClientTransport(new URL(url));
    } else {
      log.warn(`MCP server ${serverKey}: missing command and url`);
      return null;
    }
  } catch (err) {
    log.warn(`MCP server ${serverKey} transport failed: ${err}`);
    return null;
  }

  try {
    await client.connect(transport as McpTransport);
  } catch (err) {
    log.warn(`MCP server ${serverKey} connect failed: ${err}`);
    return null;
  }

  try {
    // SDK expects Zod schema for request(); we load it from types.js
    const result = await client.request(
      { method: "tools/list", params: {} as Record<string, unknown> },
      ListToolsResultSchema as Parameters<InstanceType<McpClient>["request"]>[1],
    );
    const tools = (result as { tools?: McpTool[] }).tools ?? [];
    if (typeof transport.close === "function") {
      await transport.close();
    }
    return { serverKey, tools };
  } catch (err) {
    log.warn(`MCP server ${serverKey} tools/list failed: ${err}`);
    if (typeof transport.close === "function") {
      await transport.close().catch(() => {});
    }
    return null;
  }
}

async function callMcpTool(params: {
  serverKey: string;
  serverConfig: CursorMcpServerConfig;
  toolName: string;
  args: Record<string, unknown>;
}): Promise<{ content: McpContentItem[]; isError?: boolean }> {
  const { serverKey, serverConfig, toolName, args } = params;
  let Client: McpClient;
  let StdioClientTransport: new (opts: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }) => McpTransport;
  let StreamableHTTPClientTransport: new (url: URL) => McpTransport;
  let CallToolResultSchema: unknown;

  try {
    const clientMod = await import("@modelcontextprotocol/sdk/client");
    const stdioMod = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const streamableMod = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const typesMod = await import("@modelcontextprotocol/sdk/types.js");
    Client = clientMod.Client;
    StdioClientTransport = stdioMod.StdioClientTransport;
    StreamableHTTPClientTransport = streamableMod.StreamableHTTPClientTransport;
    CallToolResultSchema = typesMod.CallToolResultSchema;
  } catch {
    return {
      content: [{ type: "text", text: "MCP SDK not available." }],
      isError: true,
    };
  }

  const command =
    typeof serverConfig.command === "string" ? serverConfig.command.trim() : undefined;
  const cmdArgs = Array.isArray(serverConfig.args) ? serverConfig.args.map((a) => String(a)) : [];
  const url = typeof serverConfig.url === "string" ? serverConfig.url.trim() : undefined;
  const envRaw =
    serverConfig.env && typeof serverConfig.env === "object" ? serverConfig.env : undefined;
  const env = envRaw
    ? toEnvRecord({ ...process.env, ...envRaw } as Record<string, string | undefined>)
    : undefined;

  const client = new Client({ name: "moltbot-mcp", version: "1.0.0" }, { capabilities: {} });

  let transport: { close?: () => Promise<void> };
  try {
    if (command) {
      transport = new StdioClientTransport({
        command,
        args: cmdArgs,
        env,
      });
    } else if (url) {
      transport = new StreamableHTTPClientTransport(new URL(url));
    } else {
      return {
        content: [{ type: "text", text: "MCP server missing command and url." }],
        isError: true,
      };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Transport failed: ${err}` }],
      isError: true,
    };
  }

  try {
    await client.connect(transport as McpTransport);
  } catch (err) {
    return {
      content: [{ type: "text", text: `Connect failed: ${err}` }],
      isError: true,
    };
  }

  try {
    const result = await client.request(
      {
        method: "tools/call",
        params: { name: toolName, arguments: args ?? {} } as Record<string, unknown>,
      },
      CallToolResultSchema as Parameters<InstanceType<McpClient>["request"]>[1],
    );
    const payload = result as { content?: McpContentItem[]; isError?: boolean };
    const content = payload.content ?? [];
    if (typeof transport.close === "function") {
      await transport.close();
    }
    return { content, isError: payload.isError };
  } catch (err) {
    if (typeof transport.close === "function") {
      await transport.close().catch(() => {});
    }
    return {
      content: [{ type: "text", text: `Tool call failed: ${err}` }],
      isError: true,
    };
  }
}

/** Use MCP inputSchema as tool parameters (JSON Schema object with type, properties). */
function mcpInputSchemaToParameters(schema: McpTool["inputSchema"]): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  const type = schema.type ?? "object";
  const properties =
    schema.properties && typeof schema.properties === "object" ? schema.properties : {};
  return { type, properties, ...(schema.required ? { required: schema.required } : {}) };
}

/** Per-server discovery timeout (ms). One slow server does not block the rest. */
const MCP_DISCOVERY_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        log.warn(`MCP discovery: ${label} timed out after ${ms}ms`);
        resolve(null);
      }, ms),
    ),
  ]).catch((err) => {
    log.warn(`MCP discovery: ${label} failed: ${err}`);
    return null;
  });
}

/**
 * Resolve MCP tools from merged config (Cursor mcp.json + skills.mcp.servers).
 * Servers are discovered in parallel with a per-server timeout. Tool names are
 * prefixed with mcp_<server>_ to avoid clashes. Disabled when skills.mcp.enabled is false.
 */
export async function resolveMcpTools(params: {
  workspaceDir?: string;
  config?: MoltbotConfig;
}): Promise<AnyAgentTool[]> {
  if (!isMcpEnabled(params.config)) return [];
  const workspaceDir = params.workspaceDir?.trim();
  if (!workspaceDir) return [];

  const servers = getMergedMcpConfig(workspaceDir, params.config);
  const serverEntries = Object.entries(servers);
  if (serverEntries.length === 0) return [];

  const discovered = await Promise.all(
    serverEntries.map(([serverKey, serverConfig]) =>
      withTimeout(
        connectAndListTools({ serverKey, serverConfig }),
        MCP_DISCOVERY_TIMEOUT_MS,
        `server ${serverKey}`,
      ),
    ),
  );

  const tools: AnyAgentTool[] = [];
  const existingNames = new Set<string>();

  for (const result of discovered) {
    if (!result || result.tools.length === 0) continue;
    const { serverKey, tools: mcpTools } = result;
    const serverConfig = servers[serverKey];
    if (!serverConfig) continue;

    for (const mcpTool of mcpTools) {
      const name = mcpToolName(serverKey, mcpTool.name);
      if (existingNames.has(name)) continue;
      existingNames.add(name);

      const description =
        typeof mcpTool.description === "string" && mcpTool.description.trim()
          ? mcpTool.description.trim()
          : `MCP tool ${mcpTool.name} (server: ${serverKey})`;
      const parameters = mcpInputSchemaToParameters(mcpTool.inputSchema);

      tools.push({
        label: name,
        name,
        description,
        parameters,
        execute: async (_toolCallId, args): Promise<AgentToolResult<unknown>> => {
          const result = await callMcpTool({
            serverKey,
            serverConfig,
            toolName: mcpTool.name,
            args: (args ?? {}) as Record<string, unknown>,
          });
          const converted = mcpContentToAgentResult(result.content);
          if (result.isError) {
            return jsonResult({
              error: true,
              message: converted.content.find((c) => c.type === "text")
                ? (converted.content.find((c) => c.type === "text") as { text: string }).text
                : "MCP tool failed",
              details: converted.details,
            });
          }
          const toolResult: AgentToolResult<unknown> = {
            content: converted.content,
            details: converted.details,
          };
          return toolResult;
        },
      });
    }
  }

  return tools;
}
