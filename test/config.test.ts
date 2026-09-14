import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

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
});
