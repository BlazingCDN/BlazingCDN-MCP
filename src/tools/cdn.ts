import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import type { Config } from "../config.js";
import { compact, DESTRUCTIVE, READ_ONLY, toolHandler, WRITE } from "./util.js";

const uuid = z.string().uuid();

const settingsSchema = z
  .object({})
  .passthrough()
  .describe(
    "aCDN resource settings to change. Common keys: name, origin_url, source ('origin'|'storage'), " +
      "proxy_cache (the 'Use CDN cache' master toggle) + proxy_buffering, " +
      "active_ttl, use_active_ttl, browser_active_ttl, use_browser_active_ttl, inactive_ttl, " +
      "default_ttl (TTL for HTTP codes not listed in custom_ttls), " +
      "custom_ttls (object mapping HTTP code to TTL seconds as INTEGERS, e.g. {\"200\": 172800}), cache_min_uses, " +
      "honor_response_ttl_headers, edge_compression, compression_methods (comma-separated 'gzip,br'; zstd may be unavailable), " +
      "origin_shield_enabled, origin_shield_type ('auto'|'custom'), shield_retest, shield_change_notify, " +
      "redirect_to_https, http2, cors, hsts (NUMBER: max-age seconds, e.g. 31536000), ssl, shared_ssl, " +
      "hotlink_protection + hotlink_protection_type ('allow'|'block'): in allow mode set hotlink_domains " +
      "(newline-separated; becomes the allowed list), in block mode set hotlink_blocked_domains + " +
      "deny_blocked_referrers=true (hotlink_domains feeds the ALLOWED list even in block mode); " +
      "related fields: hotlink_allowed_domains, deny_none_referrers, " +
      "country_protection_enabled + country_protection_type ('allow'|'block') + country_protection_list (ISO 3166 codes, e.g. ['BY','CN']), " +
      "ip_protection_enabled + ip_protection_type ('allow'|'block') + ip_protection_list (IP addresses) " +
      "(IMPORTANT: country/hotlink protection changes can take several HOURS to reach edge enforcement, unlike " +
      "other settings (~10 min) — verify with a real test request before reporting them active), " +
      "securelink_enabled (must be set together with securelink_arg and securelink_value) + securelink_expiration/" +
      "securelink_expiration_arg/securelink_addr, " +
      "truncate_url_params, truncate_url_params_ext (only when truncate_url_params is false), " +
      "allow_proxy_extensions + proxy_extensions (newline-separated with dots, e.g. '.mp4\\n.zip'), " +
      "resolve_origin_ips, origin_ips, origin_ips_v6, speed_test_fastest_ip + speed_test_path (origin IP prioritization " +
      "by speed test), preferred_origin_ip_version ('v4'|'v6'), ipv6_enabled (serve over IPv6), origin_sni_enabled, " +
      "if_modified_since ('off'|'exact'|'before'), " +
      "folder_name, bucket_id, external_storage_id. " +
      "Streaming: hls_support_enabled, hls_chunk_type ('common'|'specific'), hls_chunk_ext (ARRAY, e.g. ['.ts']), " +
      "per-playlist and per-chunk TTL/cache keys (hls_playlist_active_ttl + hls_playlist_use_active_ttl, " +
      "hls_chunk_active_ttl + hls_chunk_use_active_ttl, plus _browser_active_ttl/_custom_ttls/_default_ttl/" +
      "_cache_min_uses/_proxy_cache families for both), and the mpeg_dash_* equivalents (mpeg_dash_support_enabled, " +
      "mpeg_dash_chunk_ext accepts ONLY ['.mp4'] — '.m4s' is rejected, though .m4s segments still proxy as regular files). " +
      "For live streams set playlist TTL to 1-2s and chunk TTL to minutes. " +
      "Image processing: image_processing_enabled + image_processing_extensions (ARRAY with dots, e.g. ['.jpg','.png']; " +
      "conflicts with truncate_url_params_ext; its TTLs must be 2-365 days — pass auto_resolve=true to let the API fix bounds) " +
      "plus its own cache family (image_processing_active_ttl/_browser_active_ttl/_custom_ttls/_default_ttl/_cache_min_uses/" +
      "_proxy_cache/_proxy_buffering/_honor_response_ttl_headers). " +
      "The live API accepts and returns more fields than the OpenAPI spec documents (e.g. dnssec, restricted_countries) — " +
      "call get_cdn_resource to see everything (~147 fields); unknown keys pass through unchanged. " +
      "Zone creation and every settings change can take up to ~10 minutes to reach the edge (DNS of a new zone included) — " +
      "re-test before assuming a change failed.",
  );

export function registerCdnTools(server: McpServer, client: ApiClient, config: Config): void {
  server.registerTool(
    "list_cdn_resources",
    {
      title: "List CDN resources",
      description:
        "List Anycast CDN resources (pull zones) in the account with their settings, domains and state. " +
        "The API paginates (its own default is 25 per page, undocumented) — this tool requests up to 100 per call. " +
        "ALWAYS check meta.total in the response: if it exceeds the number of returned zones, fetch the remaining " +
        "pages with the page parameter before reporting the account's zones.",
      inputSchema: {
        traffic_distribution: z
          .boolean()
          .optional()
          .describe("Include traffic distribution data for each resource"),
        page: z.number().int().min(1).optional().describe("Page number (default 1)"),
        per_page: z.number().int().min(1).max(100).optional().describe("Zones per page (default 100, max 100)"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) =>
      client.get(
        "/api/v1/pull_zones",
        compact({
          traffic_distribution: args.traffic_distribution,
          page: args.page,
          per_page: args.per_page ?? 100,
        }),
      ),
    ),
  );

  server.registerTool(
    "get_cdn_resource",
    {
      title: "Get CDN resource",
      description:
        "Get full details of one Anycast CDN resource (pull zone): origin, TTLs, compression, origin shield, domains, locations.",
      inputSchema: { resource_id: uuid.describe("aCDN resource (pull zone) ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/pull_zones/${args.resource_id}`)),
  );

  if (config.allowWrite) {
    server.registerTool(
      "create_cdn_resource",
      {
        title: "Create CDN resource",
        description:
          "Create a new Anycast CDN resource (pull zone). Requires name, source and origin_url. " +
          "Optionally attach a cloud storage bucket or external storage as the origin, and create a custom domain in one call. " +
          "Provisioning: a new zone typically becomes fully live (DNS + serving) in ~10-11 minutes (sometimes 2-6, " +
          "rarely hours) — poll the zone's cdn_domain rather than assuming failure. If a zone is still not serving " +
          "after ~20 minutes, treat it as stuck: create a replacement zone with a new name and use that one instead " +
          "(this server cannot delete zones — ask the user to remove the stuck zone in the panel and mention it to " +
          "support). When creating SEVERAL zones, create them SEQUENTIALLY — wait until each zone serves before " +
          "creating the next; parallel batches queue up and push individual zones to 30-45+ minutes.",
        inputSchema: {
          name: z.string().describe("Pull zone name"),
          source: z.enum(["origin", "storage"]).describe("Source type"),
          origin_url: z.string().describe("URL of the origin server"),
          external_storage_id: uuid.optional().describe("External storage ID to use as origin"),
          external_storage_alias: z.string().optional().describe("External storage alias"),
          bucket_id: uuid.optional().describe("Cloud storage bucket ID to use as origin"),
          folder_name: z.string().optional().describe("Bucket folder to serve from (bucket origins only)"),
          domain: z.string().optional().describe("Custom domain to create for the resource"),
          system_dns_zone_id: uuid.optional().describe("System DNS zone ID for the CDN domain"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => client.post("/api/v1/pull_zones", { pull_zone: compact(args) })),
    );

    server.registerTool(
      "update_cdn_resource",
      {
        title: "Update CDN resource",
        description: "Update settings of an Anycast CDN resource (pull zone): TTLs, compression, origin shield, origin, etc.",
        inputSchema: {
          resource_id: uuid.describe("aCDN resource (pull zone) ID"),
          settings: settingsSchema,
          auto_resolve: z
            .boolean()
            .optional()
            .describe("Automatically resolve conflicting settings"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.put(
          `/api/v1/pull_zones/${args.resource_id}`,
          compact({ pull_zone: args.settings, auto_resolve: args.auto_resolve }),
        ),
      ),
    );

    server.registerTool(
      "bulk_update_cdn_resources",
      {
        title: "Bulk update CDN resources",
        description: "Apply the same settings to several Anycast CDN resources (pull zones) at once.",
        inputSchema: {
          resource_ids: z.array(uuid).min(1).describe("List of aCDN resource IDs"),
          settings: settingsSchema,
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.put("/api/v1/pull_zones", { ids: args.resource_ids, pull_zone: args.settings }),
      ),
    );

    server.registerTool(
      "update_cdn_locations",
      {
        title: "Update CDN resource locations",
        description:
          "Update per-location (URL path) cache rules of an aCDN resource. Each location supports: id (to update existing), " +
          "url, modifier ('='|'~'|'~*'|'^~'), position, cache_enabled, active_ttl, browser_active_ttl, default_ttl, " +
          "custom_ttls, cache_min_uses, honor_response_ttl_headers, proxy_buffering, proxy_cache, deny_traffic, " +
          "truncate_url_params, if_modified_since_enabled, if_modified_since, _destroy (true to remove the location), " +
          "image_processing_enabled, image_processing_default_presets (object mapping preset name to an operation " +
          "string, e.g. {\"resizefit\": \"resize:fit:$arg_width:$arg_height\", \"crop\": \"crop:$arg_width:$arg_height:$arg_gravity\"}; " +
          "clients then request images as ?preset=resizefit&width=100&height=100 and the CDN transforms on the fly). " +
          "Note: the API rejects location management for resources in basic mode (409) — the resource must have " +
          "advanced/custom locations enabled.",
        inputSchema: {
          resource_id: uuid.describe("aCDN resource (pull zone) ID"),
          locations: z
            .array(z.object({}).passthrough())
            .min(1)
            .describe("Location definitions (locations_attributes)"),
          auto_resolve: z.boolean().optional().describe("Automatically resolve conflicting settings"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.put(
          `/api/v1/pull_zones/${args.resource_id}/locations`,
          compact({
            pull_zone: { locations_attributes: args.locations },
            auto_resolve: args.auto_resolve,
          }),
        ),
      ),
    );
  }

  // Deliberately no delete_cdn_resource: pull zone deletion is excluded from this server by design.
  void DESTRUCTIVE;
}
