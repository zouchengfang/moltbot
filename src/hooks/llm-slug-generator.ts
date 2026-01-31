/**
 * LLM-based slug generator for session memory filenames
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
import type { MoltbotConfig } from "../config/config.js";
import {
  resolveDefaultAgentId,
  resolveAgentWorkspaceDir,
  resolveAgentDir,
} from "../agents/agent-scope.js";

/** Reject slugs that look like API/model error messages (e.g. "400-model-not-exist"). */
function looksLikeErrorSlug(slug: string): boolean {
  const lower = slug.toLowerCase();
  if (/^\d+(-|$)/.test(lower)) return true; // starts with status code
  if (/\b(400|401|403|404|500)\b/.test(lower)) return true;
  if (/model-not-exist|unknown-model|error|failed/.test(lower)) return true;
  if (lower.length < 3) return true; // too short to be meaningful
  return false;
}

/**
 * Generate a short 1-2 word filename slug from session content using LLM
 */
export async function generateSlugViaLLM(params: {
  sessionContent: string;
  cfg: MoltbotConfig;
}): Promise<string | null> {
  let tempSessionFile: string | null = null;

  try {
    const agentId = resolveDefaultAgentId(params.cfg);
    const workspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
    const agentDir = resolveAgentDir(params.cfg, agentId);

    // Create a temporary session file for this one-off LLM call
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-slug-"));
    tempSessionFile = path.join(tempDir, "session.jsonl");

    const prompt = `Based on this conversation, generate a short 1-2 word filename slug (lowercase, hyphen-separated, no file extension).

Conversation summary:
${params.sessionContent.slice(0, 2000)}

Reply with ONLY the slug, nothing else. Examples: "vendor-pitch", "api-design", "bug-fix"`;

    const modelRef = resolveDefaultModelForAgent({ cfg: params.cfg, agentId });
    console.log("[llm-slug-generator] Using model:", `${modelRef.provider}/${modelRef.model}`);

    const result = await runEmbeddedPiAgent({
      sessionId: `slug-generator-${Date.now()}`,
      sessionKey: "temp:slug-generator",
      sessionFile: tempSessionFile,
      workspaceDir,
      agentDir,
      config: params.cfg,
      provider: modelRef.provider,
      model: modelRef.model,
      prompt,
      timeoutMs: 15_000, // 15 second timeout
      runId: `slug-gen-${Date.now()}`,
    });

    // Extract text from payloads
    if (result.payloads && result.payloads.length > 0) {
      const text = result.payloads[0]?.text;
      if (text) {
        // Clean up the response - extract just the slug
        const slug = text
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 30); // Max 30 chars

        if (slug && !looksLikeErrorSlug(slug)) return slug;
      }
    }

    return null;
  } catch (err) {
    console.error("[llm-slug-generator] Failed to generate slug:", err);
    return null;
  } finally {
    // Clean up temporary session file
    if (tempSessionFile) {
      try {
        await fs.rm(path.dirname(tempSessionFile), { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
