import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getIdentityFilePathForChannelAccount,
  loadAgentIdentityFromWorkspaceForChannelAccount,
  parseIdentityMarkdown,
} from "./identity-file.js";

describe("parseIdentityMarkdown", () => {
  it("ignores identity template placeholders", () => {
    const content = `
# IDENTITY.md - Who Am I?

- **Name:** *(pick something you like)*
- **Creature:** *(AI? robot? familiar? ghost in the machine? something weirder?)*
- **Vibe:** *(how do you come across? sharp? warm? chaotic? calm?)*
- **Emoji:** *(your signature - pick one that feels right)*
- **Avatar:** *(workspace-relative path, http(s) URL, or data URI)*
`;
    const parsed = parseIdentityMarkdown(content);
    expect(parsed).toEqual({});
  });

  it("parses explicit identity values", () => {
    const content = `
- **Name:** Samantha
- **Creature:** Robot
- **Vibe:** Warm
- **Emoji:** :robot:
- **Avatar:** avatars/clawd.png
`;
    const parsed = parseIdentityMarkdown(content);
    expect(parsed).toEqual({
      name: "Samantha",
      creature: "Robot",
      vibe: "Warm",
      emoji: ":robot:",
      avatar: "avatars/clawd.png",
    });
  });
});

describe("getIdentityFilePathForChannelAccount", () => {
  it("returns path under identity subdir with channel and accountId", () => {
    const p = getIdentityFilePathForChannelAccount("/workspace", "telegram", "bot1");
    expect(p).toBe(path.join("/workspace", "identity", "IDENTITY.telegram.bot1.md"));
  });

  it("normalizes channel and accountId to safe filename", () => {
    const p = getIdentityFilePathForChannelAccount("/w", "Telegram", "Bot-One");
    expect(p).toBe(path.join("/w", "identity", "IDENTITY.telegram.bot-one.md"));
  });
});

describe("loadAgentIdentityFromWorkspaceForChannelAccount", () => {
  it("returns null when file does not exist", () => {
    expect(
      loadAgentIdentityFromWorkspaceForChannelAccount("/nonexistent/workspace", "telegram", "bot1"),
    ).toBeNull();
  });

  it("loads identity from identity/IDENTITY.channel.accountId.md when present", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const tmp = mkdtempSync(join(tmpdir(), "moltbot-identity-"));
    const identityDir = join(tmp, "identity");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(identityDir, { recursive: true });
    writeFileSync(
      join(identityDir, "IDENTITY.telegram.bot1.md"),
      "- Name: 屁屁\n- Emoji: 🥚\n",
      "utf-8",
    );
    const loaded = loadAgentIdentityFromWorkspaceForChannelAccount(tmp, "telegram", "bot1");
    expect(loaded?.name).toBe("屁屁");
    expect(loaded?.emoji).toBe("🥚");
  });
});
