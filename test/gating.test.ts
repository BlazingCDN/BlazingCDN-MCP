import { describe, expect, it } from "vitest";
import { listToolNames } from "./helpers.js";

const FORBIDDEN_EVERYWHERE = [
  "delete_cdn_resource",
  "delete_bucket",
  "delete_external_storage",
  "delete_vcdn_domain",
  "delete_vcdn_files",
  "delete_auto_import",
  "delete_ftp_login",
  "delete_account",
  "delete_user",
];

describe("tool gating", () => {
  it("read-only mode exposes read tools and cache actions but no write/delete tools", async () => {
    const names = await listToolNames();
    expect(names).toContain("list_cdn_resources");
    expect(names).toContain("get_cdn_metrics");
    expect(names).toContain("purge_cache");
    expect(names).toContain("warmup_cache");
    expect(names).toContain("search_docs");
    expect(names).toContain("list_buckets");
    expect(names).toContain("list_vcdn_resources");

    expect(names).not.toContain("create_cdn_resource");
    expect(names).not.toContain("update_cdn_resource");
    expect(names).not.toContain("delete_custom_domain");
    expect(names).not.toContain("delete_vcdn_resource");
  });

  it("allowWrite enables create/update tools but not delete tools", async () => {
    const names = await listToolNames({ allowWrite: true });
    expect(names).toContain("create_cdn_resource");
    expect(names).toContain("update_cdn_resource");
    expect(names).toContain("bulk_update_cdn_resources");
    expect(names).toContain("add_custom_domain");
    expect(names).toContain("create_bucket");
    expect(names).toContain("upload_vcdn_file");
    expect(names).toContain("manage_ftp_login");

    expect(names).not.toContain("delete_custom_domain");
    expect(names).not.toContain("delete_vcdn_resource");
  });

  it("allowDelete enables only the two permitted delete tools", async () => {
    const names = await listToolNames({ allowWrite: true, allowDelete: true });
    expect(names).toContain("delete_custom_domain");
    expect(names).toContain("delete_vcdn_resource");
  });

  it("never exposes excluded destructive operations in any mode", async () => {
    const names = await listToolNames({ allowWrite: true, allowDelete: true });
    for (const name of FORBIDDEN_EVERYWHERE) {
      expect(names).not.toContain(name);
    }
    // DNS zones and account/user management are out of scope entirely
    expect(names.filter((n) => n.includes("dns_zone") && !n.includes("system_dns_zones"))).toEqual([]);
    expect(names.filter((n) => n.includes("user") || n.includes("account"))).toEqual([]);
  });
});
