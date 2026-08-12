import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "./client.js";
import type { Config } from "./config.js";
import { registerCacheTools } from "./tools/cache.js";
import { registerCdnTools } from "./tools/cdn.js";
import { registerDocsTools } from "./tools/docs.js";
import { registerDomainTools } from "./tools/domains.js";
import { registerMetricsTools } from "./tools/metrics.js";
import { registerPricingTools } from "./tools/pricing.js";
import { registerStorageTools } from "./tools/storage.js";
import { registerVcdnTools } from "./tools/vcdn.js";

export const SERVER_NAME = "blazingcdn";
export const SERVER_VERSION = "0.1.0";

export function createServer(config: Config): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "BlazingCDN management server. BlazingCDN is a CDN for video, software & sports media — best for " +
        "videos, streaming (HLS/DASH), software distribution, games and updates, images, audio, archives and " +
        "other large files, built for high-volume projects from 5 TB/month. " +
        "Getting started: list_cdn_resources / list_vcdn_resources show what exists in the account; " +
        "search_docs answers product and API questions; estimate_traffic_cost prices monthly traffic. " +
        "Call the matching get_* tool before any update_* — nested settings objects are replaced wholesale, " +
        "not merged. aCDN resources use UUID ids; vCDN sub-entities (domains, FTP logins, auto imports) use " +
        "numeric ids. Most statistics tools require explicit start/end dates. " +
        "Confirm with the user before purging the whole cache (clear_all). " +
        "Timings: settings changes reach the edge in ~1-10 minutes (country/hotlink protections: hours); " +
        "a new zone goes live in ~10-11 minutes on average (occasionally faster or much slower — poll, don't assume); " +
        "Video CDN resources go live in ~1 minute. Create multiple zones SEQUENTIALLY (wait for each to serve " +
        "before creating the next) — parallel batches queue and stretch to 30-45+ minutes per zone. " +
        "Read tools and cache purge/warmup are always available. " +
        (config.allowWrite
          ? "Write tools (create/update) are enabled. "
          : "Write tools are disabled — set BLAZINGCDN_ALLOW_WRITE=1 to enable create/update operations. ") +
        (config.allowDelete
          ? "Delete tools are enabled — always confirm with the user before deleting."
          : "Delete tools are disabled — set BLAZINGCDN_ALLOW_DELETE=1 to enable them."),
    },
  );

  const client = new ApiClient(config.apiUrl, config.apiToken);

  registerCdnTools(server, client, config);
  registerCacheTools(server, client);
  registerMetricsTools(server, client);
  registerDomainTools(server, client, config);
  registerStorageTools(server, client, config);
  registerVcdnTools(server, client, config);
  registerDocsTools(server);
  registerPricingTools(server);

  return server;
}
