import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "./client.js";
import type { Config } from "./config.js";
import { registerCacheTools } from "./tools/cache.js";
import { registerCdnTools } from "./tools/cdn.js";
import { registerDocsTools } from "./tools/docs.js";
import { registerDomainTools } from "./tools/domains.js";
import { registerMetricsTools } from "./tools/metrics.js";
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
        "search_docs answers product and API questions. " +
        "Call the matching get_* tool before any update_* — nested settings objects are replaced wholesale, " +
        "not merged. aCDN resources use UUID ids; vCDN sub-entities (domains, FTP logins, auto imports) use " +
        "numeric ids. Most statistics tools require explicit start/end dates. " +
        "Confirm with the user before purging the whole cache (clear_all). " +
        "Settings changes reach the edge in ~1-2 minutes; a new zone's DNS provisions in ~3-5 minutes. " +
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

  return server;
}
