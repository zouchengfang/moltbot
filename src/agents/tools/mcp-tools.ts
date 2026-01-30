/**
 * Resolve MCP tools from Cursor-configured MCP servers (.cursor/mcp.json, ~/.cursor/mcp.json).
 * Connects to each server (stdio or Streamable HTTP), lists tools, and exposes them as AnyAgentTool.
 */

import type { MoltbotConfig } from "../../config/config.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  loadCursorMcpConfig,
  type CursorMcpServerConfig,
} from "../skills/mcp-cursor.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const log = createSubsystemLogger("mcp-tools");

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

function mcpContentToAgentResult(content: McpContentItem[]): { content: McpContentItem[]; details?: unknown } {
  const blocks = content.map((item) => {
    if (item.type === "text" && "text" in item) {
      return { type: "text" as const, text: item.text };
    }
    if (item.type === "image" && "data" in item) {
      return {
        type: "image" as const,
        data: item.data ?? "",
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

async function connectAndListTools(params: {
  serverKey: string;
  serverConfig: CursorMcpServerConfig;
}): Promise<{ serverKey: string; tools: McpTool[] } | null> {
  const { serverKey, serverConfig } = params;
  let Client: new (a: { name: string; version: string }, b: { capabilities?: object }) => {
    connect(t: { start(): Promise<void>; close(): Promise<void> }): Promise<void>;
    request(req: { method: string; params: object }, schema: { parse: (v: unknown) => unknown }): Promise<unknown>;
  };
  let StdioClientTransport: new (opts: { command: string; args: string[]; env?: Record<string, string> }) => { close?(): Promise<void> };
  let StreamableHTTPClientTransport: new (url: URL) => { close?(): Promise<void> };
  let ListToolsResultSchema: { parse: (v: unknown) => unknown };

  try {
    const sdk = await import("@modelcontextprotocol/sdk/client");
    Client = sdk.Client;
    StdioClientTransport = sdk.StdioClientTransport;
    StreamableHTTPClientTransport = sdk.StreamableHTTPClientTransport;
    ListToolsResultSchema = sdk.ListToolsResultSchema;
  } catch (err) {
    log.warn(`MCP SDK not available: ${err}`);
    return null;
  }

  const command =
    typeof serverConfig.command === "string" ? serverConfig.command.trim() : undefined;
  const args = Array.isArray(serverConfig.args)
    ? serverConfig.args.map((a) => String(a))
    : [];
  const url = typeof serverConfig.url === "string" ? serverConfig.url.trim() : undefined;
  const env = serverConfig.env && typeof serverConfig.env === "object" ? serverConfig.env : undefined;

  const client = new Client(
    { name: "moltbot-mcp", version: "1.0.0" },
    { capabilities: {} },
  );

  let transport: { close?: () => Promise<void> };
  try {
    if (command) {
      transport = new StdioClientTransport({
        command,
        args,
        env: env ? { ...process.env, ...env } : undefined,
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
    await client.connect(transport as { start(): Promise<void>; close(): Promise<void> });
  } catch (err) {
    log.warn(`MCP server ${serverKey} connect failed: ${err}`);
    return null;
  }

  try {
    const result = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema as { parse: (v: unknown) => unknown },
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
  let Client: new (a: { name: string; version: string }, b: { capabilities?: object }) => {
    connect(t: { start(): Promise<void>; close(): Promise<void> }): Promise<void>;
    request(req: { method: string; params: object }, schema: { parse: (v: unknown) => unknown }): Promise<unknown>;
  };
  let StdioClientTransport: new (opts: { command: string; args: string[]; env?: Record<string, string> }) => { close?(): Promise<void> };
  let StreamableHTTPClientTransport: new (url: URL) => { close?(): Promise<void> };
  let CallToolResultSchema: { parse: (v: unknown) => unknown };

  try {
    const sdk = await import("@modelcontextprotocol/sdk/client");
    Client = sdk.Client;
    StdioClientTransport = sdk.StdioClientTransport;
    StreamableHTTPClientTransport = sdk.StreamableHTTPClientTransport;
    CallToolResultSchema = sdk.CallToolResultSchema;
  } catch {
    return {
      content: [{ type: "text", text: "MCP SDK not available." }],
      isError: true,
    };
  }

  const command =
    typeof serverConfig.command === "string" ? serverConfig.command.trim() : undefined;
  const cmdArgs = Array.isArray(serverConfig.args)
    ? serverConfig.args.map((a) => String(a))
    : [];
  const url = typeof serverConfig.url === "string" ? serverConfig.url.trim() : undefined;
  const env = serverConfig.env && typeof serverConfig.env === "object" ? serverConfig.env : undefined;

  const client = new Client(
    { name: "moltbot-mcp", version: "1.0.0" },
    { capabilities: {} },
  );

  let transport: { close?: () => Promise<void> };
  try {
    if (command) {
      transport = new StdioClientTransport({
        command,
        args: cmdArgs,
        env: env ? { ...process.env, ...env } : undefined,
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
    await client.connect(transport as { start(): Promise<void>; close(): Promise<void> });
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
        params: { name: toolName, arguments: args ?? {} },
      },
      CallToolResultSchema,
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
  const properties = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
  return { type, properties, ...(schema.required ? { required: schema.required } : {}) };
}

/**
 * Resolve MCP tools from Cursor MCP config. Each server is contacted (stdio or HTTP),
 * tools are listed, and wrapper AnyAgentTools are returned. Tool names are prefixed
 * with mcp_<server>_ to avoid clashes. Disabled when skills.mcp.enabled is false.
 */
export async function resolveMcpTools(params: {
  workspaceDir?: string;
  config?: MoltbotConfig;
}): Promise<AnyAgentTool[]> {
  if (!isMcpEnabled(params.config)) return [];
  const workspaceDir = params.workspaceDir?.trim();
  if (!workspaceDir) return [];

  const servers = loadCursorMcpConfig(workspaceDir);
  if (Object.keys(servers).length === 0) return [];

  const tools: AnyAgentTool[] = [];
  const existingNames = new Set<string>();

  for (const [serverKey, serverConfig] of Object.entries(servers)) {
    const discovered = await connectAndListTools({ serverKey, serverConfig });
    if (!discovered || discovered.tools.length === 0) continue;

    for (const mcpTool of discovered.tools) {
      const name = mcpToolName(discovered.serverKey, mcpTool.name);
      if (existingNames.has(name)) continue;
      existingNames.add(name);

      const description =
        typeof mcpTool.description === "string" && mcpTool.description.trim()
          ? mcpTool.description.trim()
          : `MCP tool ${mcpTool.name} (server: ${discovered.serverKey})`;
      const parameters = mcpInputSchemaToParameters(mcpTool.inputSchema);

      tools.push({
        label: name,
        name,
        description,
        parameters,
        execute: async (_toolCallId, args) => {
          const result = await callMcpTool({
            serverKey: discovered.serverKey,
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
          return {
            content: converted.content,
            details: converted.details,
          };
        },
      });
    }
  }

  return tools;
}
