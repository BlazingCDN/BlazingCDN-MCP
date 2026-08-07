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
      "active_ttl, use_active_ttl, browser_active_ttl, use_browser_active_ttl, inactive_ttl, default_ttl, " +
      "custom_ttls (object mapping HTTP code to TTL seconds, e.g. {\"200\": \"172800\"}), cache_min_uses, " +
      "honor_response_ttl_headers, edge_compression, compression_methods ('gzip'|'br'|'zstd'), " +
      "origin_shield_enabled, origin_shield_type ('auto'|'custom'), origin_shield_attributes, " +
      "redirect_to_https, http2, cors, hsts, ssl, shared_ssl, hotlink_protection, hotlink_protection_type, " +
      "hotlink_domains, truncate_url_params, proxy_extensions, allow_proxy_extensions, resolve_origin_ips, " +
      "origin_ips, origin_ips_v6, folder_name, bucket_id, external_storage_id",
  );

export function registerCdnTools(server: McpServer, client: ApiClient, config: Config): void {
  server.registerTool(
    "list_cdn_resources",
    {
      title: "List CDN resources",
      description:
        "List all Anycast CDN resources (pull zones) in the account with their settings, domains and state.",
      inputSchema: {
        traffic_distribution: z
          .boolean()
          .optional()
          .describe("Include traffic distribution data for each resource"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) =>
      client.get("/api/v1/pull_zones", compact({ traffic_distribution: args.traffic_distribution })),
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
          "Optionally attach a cloud storage bucket or external storage as the origin, and create a custom domain in one call.",
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
          "truncate_url_params, if_modified_since_enabled, if_modified_since, _destroy (true to remove the location).",
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
