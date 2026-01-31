import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";

import type { MoltbotConfig } from "../config/config.js";
import { resolveAgentIdentity, resolveHumanDelayConfig, resolveIdentityName } from "./identity.js";

describe("resolveAgentIdentity with identityByChannelAccount", () => {
  it("returns agent identity when no channel context", () => {
    const cfg: MoltbotConfig = {
      agents: {
        list: [
          {
            id: "main",
            identity: { name: "Main", emoji: "🤖" },
            identityByChannelAccount: {
              "telegram:bot1": { name: "屁屁", emoji: "🥚" },
              "telegram:bot2": { name: "蛋蛋", emoji: "🐣" },
            },
          },
        ],
      },
    };
    expect(resolveAgentIdentity(cfg, "main")).toEqual({ name: "Main", emoji: "🤖" });
  });

  it("merges identityByChannelAccount over agent identity when sessionKey has channel:account", () => {
    const cfg: MoltbotConfig = {
      agents: {
        list: [
          {
            id: "main",
            identity: { name: "Main", emoji: "🤖", avatar: "M" },
            identityByChannelAccount: {
              "telegram:bot1": { name: "屁屁", emoji: "🥚" },
              "telegram:bot2": { name: "蛋蛋" },
            },
          },
        ],
      },
    };
    expect(
      resolveAgentIdentity(cfg, "main", {
        sessionKey: "agent:main:telegram:bot1:dm:123",
      }),
    ).toEqual({ name: "屁屁", emoji: "🥚", avatar: "M" });
    expect(
      resolveAgentIdentity(cfg, "main", {
        sessionKey: "agent:main:telegram:bot2:dm:456",
      }),
    ).toEqual({ name: "蛋蛋", emoji: "🤖", avatar: "M" });
  });

  it("uses channel:default when sessionKey has no account in key", () => {
    const cfg: MoltbotConfig = {
      agents: {
        list: [
          {
            id: "main",
            identity: { name: "Main" },
            identityByChannelAccount: {
              "telegram:default": { name: "TG Default" },
            },
          },
        ],
      },
    };
    expect(resolveIdentityName(cfg, "main", { sessionKey: "agent:main:telegram:dm:123" })).toBe(
      "TG Default",
    );
  });

  it("merges per-channel-account identity file over config when sessionKey has channel:account", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-identity-"));
    const identityDir = path.join(tmpDir, "identity");
    fs.mkdirSync(identityDir, { recursive: true });
    fs.writeFileSync(
      path.join(identityDir, "IDENTITY.telegram.bot1.md"),
      "- Name: FromFile\n- Emoji: 📄\n",
      "utf-8",
    );
    const cfg: MoltbotConfig = {
      agents: {
        list: [
          {
            id: "main",
            workspace: tmpDir,
            identity: { name: "Main", emoji: "🤖" },
            identityByChannelAccount: {
              "telegram:bot1": { name: "FromConfig" },
            },
          },
        ],
      },
    };
    const resolved = resolveAgentIdentity(cfg, "main", {
      sessionKey: "agent:main:telegram:bot1:dm:123",
    });
    expect(resolved?.name).toBe("FromFile");
    expect(resolved?.emoji).toBe("📄");
  });
});

describe("resolveHumanDelayConfig", () => {
  it("returns undefined when no humanDelay config is set", () => {
    const cfg: MoltbotConfig = {};
    expect(resolveHumanDelayConfig(cfg, "main")).toBeUndefined();
  });

  it("merges defaults with per-agent overrides", () => {
    const cfg: MoltbotConfig = {
      agents: {
        defaults: {
          humanDelay: { mode: "natural", minMs: 800, maxMs: 1800 },
        },
        list: [{ id: "main", humanDelay: { mode: "custom", minMs: 400 } }],
      },
    };

    expect(resolveHumanDelayConfig(cfg, "main")).toEqual({
      mode: "custom",
      minMs: 400,
      maxMs: 1800,
    });
  });
});
