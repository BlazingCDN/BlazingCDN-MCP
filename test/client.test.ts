import { describe, expect, it } from "vitest";
import { ApiClient, ApiError } from "../src/client.js";
import { mockFetch } from "./helpers.js";

const client = () => new ApiClient("https://wapi.blazingcdn.com", "secret-token");

describe("ApiClient", () => {
  it("sends bearer auth and serializes query params (arrays as rails-style)", async () => {
    const requests = mockFetch({ data: [] });
    await client().get("/api/v1/custom_domains", { domains: ["a.com", "b.com"], page: 2, skip: undefined });
    expect(requests).toHaveLength(1);
    const req = requests[0];
    expect(req.headers.Authorization).toBe("Bearer secret-token");
    expect(req.url.searchParams.getAll("domains[]")).toEqual(["a.com", "b.com"]);
    expect(req.url.searchParams.get("page")).toBe("2");
    expect(req.url.searchParams.has("skip")).toBe(false);
  });

  it("throws ApiError with status and body excerpt on non-2xx", async () => {
    mockFetch({ error: "Unauthorized" }, 401);
    await expect(client().get("/api/v1/pull_zones")).rejects.toThrowError(ApiError);
    await expect(client().get("/api/v1/pull_zones")).rejects.toThrow(/401/);
  });

  it("returns parsed JSON bodies and raw text for non-JSON", async () => {
    mockFetch({ id: "x" });
    expect(await client().get("/api/v1/me")).toEqual({ id: "x" });

    globalThis.fetch = (async () =>
      new Response("metric_total 42", { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch;
    expect(await client().get("/api/v1/metrics/cdn/prometheus")).toBe("metric_total 42");
  });
});
