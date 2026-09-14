import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { listToolNames } from "./helpers.js";

describe("permission flags", () => {
  it("accept checkbox values (true/false) as well as 1", () => {
    for (const on of ["1", "true", "TRUE", "yes", "on"]) {
      expect(loadConfig({ BLAZINGCDN_ALLOW_WRITE: on }).allowWrite).toBe(true);
    }
    for (const off of ["", "0", "false", undefined]) {
      expect(loadConfig({ BLAZINGCDN_ALLOW_WRITE: off }).allowWrite).toBe(false);
    }
  });

  it("the Claude Desktop extension asks for permissions with checkboxes, both off by default", () => {
    const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
    for (const key of ["allow_write", "allow_delete"]) {
      expect(manifest.user_config[key]).toMatchObject({ type: "boolean", default: false });
    }
    expect(manifest.server.mcp_config.env.BLAZINGCDN_ALLOW_WRITE).toBe("${user_config.allow_write}");
    expect(manifest.server.mcp_config.env.BLAZINGCDN_ALLOW_DELETE).toBe("${user_config.allow_delete}");
  });

  it("the manifest lists every tool (run `npm run build && node scripts/manifest-tools.mjs` after changing tools)", async () => {
    const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
    const listed = (manifest.tools as Array<{ name: string }>).map((tool) => tool.name).sort();
    expect(listed).toEqual(await listToolNames({ allowWrite: true, allowDelete: true }));
    expect(manifest.icon).toBe("assets/logo-400.png");
  });
});
