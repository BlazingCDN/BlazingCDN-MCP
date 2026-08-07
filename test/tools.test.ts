import { describe, expect, it } from "vitest";
import { connectClient, mockFetch } from "./helpers.js";

const RID = "65202fd5-55e8-47ac-a952-162c7a102a04";

describe("tool handlers", () => {
  it("purge_cache with resource_id and urls hits the per-zone purge endpoint", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    const result = await client.callTool({
      name: "purge_cache",
      arguments: { resource_id: RID, urls: ["/img/a.png"] },
    });
    expect(result.isError).toBeFalsy();
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url.pathname).toBe(`/api/v1/pull_zones/${RID}/purges`);
    expect(requests[0].body).toEqual({ cache_purge: { urls: ["/img/a.png"] } });
  });

  it("purge_cache without resource_id uses the cross-zone endpoint", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    await client.callTool({
      name: "purge_cache",
      arguments: { urls: ["https://cdn.example.com/a.js"] },
    });
    expect(requests[0].url.pathname).toBe("/api/v1/pull_zones/clear_caches");
    expect(requests[0].body).toEqual({ urls: ["https://cdn.example.com/a.js"] });
  });

  it("purge_cache rejects a zone purge with neither urls nor clear_all — without calling the API", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    const result = await client.callTool({ name: "purge_cache", arguments: { resource_id: RID } });
    expect(result.isError).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it("get_cdn_metrics targets account-wide or per-resource endpoint", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    await client.callTool({
      name: "get_cdn_metrics",
      arguments: { type: "bandwidth", period: "month", date: "2026-08-01" },
    });
    await client.callTool({
      name: "get_cdn_metrics",
      arguments: { resource_id: RID, type: "responses", from: "2026-08-01", to: "2026-08-07" },
    });
    expect(requests[0].url.pathname).toBe("/api/v1/metrics/pull_zones");
    expect(requests[0].url.searchParams.get("type")).toBe("bandwidth");
    expect(requests[1].url.pathname).toBe(`/api/v1/metrics/pull_zones/${RID}`);
    expect(requests[1].url.searchParams.get("from")).toBe("2026-08-01");
  });

  it("update_cdn_resource wraps settings into pull_zone", async () => {
    const requests = mockFetch();
    const client = await connectClient({ allowWrite: true });
    await client.callTool({
      name: "update_cdn_resource",
      arguments: { resource_id: RID, settings: { active_ttl: 3600, edge_compression: true } },
    });
    expect(requests[0].method).toBe("PUT");
    expect(requests[0].body).toEqual({ pull_zone: { active_ttl: 3600, edge_compression: true } });
  });

  it("add_custom_domain sends bulk create shape", async () => {
    const requests = mockFetch();
    const client = await connectClient({ allowWrite: true });
    await client.callTool({
      name: "add_custom_domain",
      arguments: { resource_id: RID, names: ["cdn.example.com"] },
    });
    expect(requests[0].body).toEqual({ domains: [{ name: "cdn.example.com" }] });
  });

  it("get_vcdn_statistics routes reports to the right endpoints", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    await client.callTool({
      name: "get_vcdn_statistics",
      arguments: { report: "monthly_totals", resource_id: RID },
    });
    await client.callTool({
      name: "get_vcdn_statistics",
      arguments: {
        report: "bandwidth",
        start_date: "2026-08-01T00:00:00Z",
        end_date: "2026-08-07T23:59:59Z",
      },
    });
    expect(requests[0].url.pathname).toBe(`/api/v1/vcdn_resources/${RID}/stats`);
    expect(requests[1].url.pathname).toBe("/api/v1/vcdn_statistics/bandwidth");

    const missing = await client.callTool({
      name: "get_vcdn_statistics",
      arguments: { report: "timeseries" },
    });
    expect(missing.isError).toBe(true);

    const noDates = await client.callTool({
      name: "get_vcdn_statistics",
      arguments: { report: "cache_storage" },
    });
    expect(noDates.isError).toBe(true);
    expect((noDates.content as Array<{ text: string }>)[0].text).toContain("start_date");
  });

  it("manage_ftp_login accepts numeric IDs (vCDN sub-entities are not UUIDs)", async () => {
    const requests = mockFetch();
    const client = await connectClient({ allowWrite: true });
    const result = await client.callTool({
      name: "manage_ftp_login",
      arguments: { resource_id: RID, action: "disable", ftp_login_id: 507533241 },
    });
    expect(result.isError).toBeFalsy();
    expect(requests[0].url.pathname).toBe(`/api/v1/vcdn_resources/${RID}/ftp_logins/507533241/disable`);
  });

  it("API errors surface as isError results with the status code, not exceptions", async () => {
    mockFetch({ error: "rate limited" }, 429);
    const client = await connectClient();
    const result = await client.callTool({ name: "list_cdn_resources", arguments: {} });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("429");
    expect(text).not.toContain("test-token");
  });

  it("estimate_traffic_cost computes progressive Flex pricing offline", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    const result = await client.callTool({
      name: "estimate_traffic_cost",
      arguments: { tb_per_month: 190 },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    // 5*5 + 20*4.5 + 75*4 + 90*3.5 = 25 + 90 + 300 + 315
    expect(data.total_usd).toBe(730);
    expect(data.breakdown).toHaveLength(4);
    expect(requests).toHaveLength(0);

    const small = await client.callTool({ name: "estimate_traffic_cost", arguments: { tb_per_month: 2 } });
    expect(JSON.parse((small.content as Array<{ text: string }>)[0].text).total_usd).toBe(25);
  });

  it("search_docs returns ranked pages without network access", async () => {
    const requests = mockFetch();
    const client = await connectClient();
    const result = await client.callTool({ name: "search_docs", arguments: { query: "purge cache api" } });
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("wapi.blazingcdn.com/api-docs");
    expect(requests).toHaveLength(0);
  });
});
