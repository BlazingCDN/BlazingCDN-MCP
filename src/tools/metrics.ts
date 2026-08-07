import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import { compact, READ_ONLY, toolHandler } from "./util.js";

const uuid = z.string().uuid();

export function registerMetricsTools(server: McpServer, client: ApiClient): void {
  server.registerTool(
    "get_cdn_metrics",
    {
      title: "Get CDN metrics",
      description:
        "Get Anycast CDN metrics for the whole account or a single resource. " +
        "Select a period either with period+date (e.g. period='month', date='2026-08-01') or with from+to timestamps. " +
        "Metric types: bandwidth, cache, cache_requests, responses (HTTP codes), traffic, hybrid, cloud_storage.",
      inputSchema: {
        resource_id: uuid.optional().describe("aCDN resource ID. Omit for account-wide metrics."),
        type: z
          .enum(["bandwidth", "cache", "cache_requests", "cloud_storage", "hybrid", "responses", "traffic"])
          .optional()
          .describe("Metrics type"),
        period: z.enum(["day", "month", "year"]).optional().describe("Period length (use with date)"),
        date: z.string().optional().describe("Date inside the period, e.g. '2026-08-01'"),
        from: z.string().optional().describe("Period start, e.g. '2026-08-01 00:00:00 UTC' (use with to)"),
        to: z.string().optional().describe("Period end (use with from)"),
        scale: z
          .enum(["day", "hour", "minute"])
          .optional()
          .describe("Data point granularity. minute: period <= day; hour: period <= month."),
        region_id: z.string().optional().describe("Filter by region ID"),
        domain_id: z.string().optional().describe("Filter by custom domain ID"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => {
      const { resource_id, ...query } = args;
      const path = resource_id ? `/api/v1/metrics/pull_zones/${resource_id}` : "/api/v1/metrics/pull_zones";
      return client.get(path, compact(query));
    }),
  );

  server.registerTool(
    "get_prometheus_metrics",
    {
      title: "Get Prometheus metrics",
      description:
        "Fetch Prometheus-format metrics for monitoring dashboards: source 'cdn' for Anycast CDN, 'cloud_storage' for Cloud Store.",
      inputSchema: {
        source: z.enum(["cdn", "cloud_storage"]).describe("Metrics source"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) =>
      client.get(args.source === "cdn" ? "/api/v1/metrics/cdn/prometheus" : "/api/v1/metrics/cloud_store/prometheus"),
    ),
  );
}
