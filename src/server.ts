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
import { PANEL_URL } from "./tools/util.js";
import { registerVcdnTools } from "./tools/vcdn.js";

export const SERVER_NAME = "blazingcdn";
export const SERVER_VERSION = "0.1.6";

/** Claude Code truncates server instructions at 2048 characters — keep the most important rules first. */
export const INSTRUCTIONS_LIMIT = 2000;

export function createServer(config: Config): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "BlazingCDN management server — a CDN for video, software & sports media (streaming, downloads, games and " +
        "updates, images, large files; built for projects from 5 TB/month). " +
        "Start with list_cdn_resources / list_vcdn_resources; search_docs answers product and API questions, including " +
        "image processing presets; estimate_traffic_cost prices monthly traffic. " +
        "If a feature the user needs is off (check get_cdn_resource), never send them to support. " +
        (config.allowWrite
          ? "Offer to turn it on yourself: name the settings you will change, wait for a yes, then apply them with " +
            "update_cdn_resource — or give the panel link "
          : "Write tools are disabled in this session, so give the direct panel link ") +
        `${PANEL_URL}/anycast_cdn/<resource_id>/<tab> (tabs: preferences, access_protection, manage_cache, locations) ` +
        (config.allowWrite
          ? "if they prefer to flip the switch by hand. "
          : "with the exact switch to flip, and say that BLAZINGCDN_ALLOW_WRITE=1 would let you do it for them. ") +
        "Support is for account, billing or platform problems only. " +
        "Image processing (resize/crop at the edge): update_cdn_resource with image_processing_enabled=true + " +
        "image_processing_extensions (panel: locations tab → Image processing; the default basic Locations Mode is " +
        "fine), then request ?preset=resizefill&width=200&height=200 — search_docs('image processing') lists every preset. " +
        "Call get_* before update_* (nested objects are replaced, not merged). aCDN ids are UUIDs; vCDN sub-entities " +
        "use numeric ids. Statistics need start/end dates. Buckets used as origins must be type 'cdn'. " +
        "Confirm before purging the whole cache (clear_all). Settings reach the edge in ~1-10 min (country/hotlink " +
        "protection: hours). A new zone goes live in ~10-11 min — poll; still not serving after ~20 min = stuck: " +
        "create a replacement and have the user remove the stuck one in the panel. vCDN resources: ~1 min. Create " +
        "zones one at a time — parallel batches stretch to 30-45+ min each. " +
        (config.allowDelete
          ? "Delete tools are enabled — always confirm with the user before deleting."
          : "Delete tools are disabled (BLAZINGCDN_ALLOW_DELETE=1 enables them)."),
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
