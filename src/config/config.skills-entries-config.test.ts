import { describe, expect, it } from "vitest";

import { MoltbotSchema } from "./zod-schema.js";

describe("skills entries config schema", () => {
  it("accepts custom fields under config", () => {
    const res = MoltbotSchema.safeParse({
      skills: {
        entries: {
          "custom-skill": {
            enabled: true,
            config: {
              url: "https://example.invalid",
              token: "abc123",
            },
          },
        },
      },
    });

    expect(res.success).toBe(true);
  });

  it("accepts skills.mcp (enabled and servers)", () => {
    const res = MoltbotSchema.safeParse({
      skills: {
        mcp: {
          enabled: true,
          servers: {
            "my-server": { command: "npx", args: ["-y", "my-mcp"] },
          },
        },
      },
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.skills?.mcp?.enabled).toBe(true);
    expect(res.data.skills?.mcp?.servers?.["my-server"]?.command).toBe("npx");
  });

  it("rejects unknown top-level fields", () => {
    const res = MoltbotSchema.safeParse({
      skills: {
        entries: {
          "custom-skill": {
            url: "https://example.invalid",
          },
        },
      },
    });

    expect(res.success).toBe(false);
    if (res.success) return;

    expect(
      res.error.issues.some(
        (issue) =>
          issue.path.join(".") === "skills.entries.custom-skill" &&
          issue.message.toLowerCase().includes("unrecognized"),
      ),
    ).toBe(true);
  });
});
