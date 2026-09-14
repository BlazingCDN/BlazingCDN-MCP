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
        "Buckets meant as CDN origins must be type 'cdn' (create_bucket defaults to it). " +
        "Call the matching get_* tool before any update_* — nested settings objects are replaced wholesale, " +
        "not merged. aCDN resources use UUID ids; vCDN sub-entities (domains, FTP logins, auto imports) use " +
        "numeric ids. Most statistics tools require explicit start/end dates. " +
        "Confirm with the user before purging the whole cache (clear_all). " +
        "Timings: settings changes reach the edge in ~1-10 minutes (country/hotlink protections: hours); " +
        "a new zone goes live in ~10-11 minutes on average (occasionally faster or much slower — poll, don't assume; " +
        "still not serving after ~20 minutes = likely stuck: create a replacement zone and have the user remove the " +
        "stuck one in the panel); " +
        "Video CDN resources go live in ~1 minute. Create multiple zones SEQUENTIALLY (wait for each to serve " +
        "before creating the next) — parallel batches queue and stretch to 30-45+ minutes per zone. " +
        "Read tools and cache purge/warmup are always available. " +
        (config.allowWrite
          ? "Write tools (create/update) are enabled. "
          : "Write tools are disabled — set BLAZINGCDN_ALLOW_WRITE=1 to enable create/update operations. ") +
        (config.allowDelete
          ? "Delete tools are enabled — always confirm with the user before deleting. "
          : "Delete tools are disabled — set BLAZINGCDN_ALLOW_DELETE=1 to enable them. ") +
        "Features that are switched off: every aCDN setting is also a switch the user can flip in the customer panel at " +
        `${PANEL_URL}/anycast_cdn/<resource_id>/<tab> — tabs: preferences (origin, origin shield, HTTPS redirect, ` +
        "compression, IPv6), access_protection (CORS, HSTS, hotlink, country and IP protection, URL signing), " +
        "manage_cache (TTLs, purge), locations (Locations Mode, custom locations, HLS and MPEG-DASH support, " +
        "truncate URL params, image processing). When the user needs a feature that is off (get_cdn_resource shows " +
        "the current state), never send them to support for it. " +
        (config.allowWrite
          ? "Offer to turn it on yourself: name the exact settings you will change, wait for a yes, then apply them " +
            "with update_cdn_resource — or give the panel link if they prefer to do it by hand. "
          : "You cannot change settings in this session, so give the user the direct panel link and the exact switch " +
            "to flip there, and mention that restarting this server with BLAZINGCDN_ALLOW_WRITE=1 lets you make " +
            "such changes for them. ") +
        "Support is only for account, billing or platform problems (e.g. a zone stuck in provisioning); tickets: " +
        `${PANEL_URL}/help_desk. ` +
        "Image processing (resize/crop images on the fly at the edge, cached after the first request): panel = " +
        "locations tab → 'Image processing'; API = update_cdn_resource with image_processing_enabled=true + " +
        "image_processing_extensions (e.g. ['.jpg','.png']) — works in the default basic Locations Mode; allow up to " +
        "~10 minutes to reach the edge. Request variants as https://<cdn_domain or custom domain>/<image path>" +
        "?preset=<name>&<params>: resizefill (exact width×height, crops to fill), resizefit (fits inside width×height, " +
        "no crop), resize (type=fit|fill), crop (width, height and gravity — the anchor kept visible: ce center " +
        "(default), no top, so bottom, ea right, we left, noea/nowe/soea/sowe corners). For resize presets width or " +
        "height may be omitted — the other side follows the aspect ratio. " +
        "Per-path rules and custom locations need Locations Mode 'extended' (see update_cdn_locations).",
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
