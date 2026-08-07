import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import { compact, toolHandler } from "./util.js";

const uuid = z.string().uuid();

const CACHE_ACTION = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerCacheTools(server: McpServer, client: ApiClient): void {
  server.registerTool(
    "purge_cache",
    {
      title: "Purge CDN cache",
      description:
        "Purge cached content. With resource_id: purge that aCDN resource — everything (clear_all=true) or specific URLs. " +
        "Without resource_id: purge by full URLs across all resources (the zone is matched by domain automatically).",
      inputSchema: {
        resource_id: uuid
          .optional()
          .describe("aCDN resource (pull zone) ID. Omit to purge by URL across all resources."),
        urls: z
          .array(z.string())
          .optional()
          .describe("URLs/paths to purge. Required unless clear_all is true."),
        clear_all: z
          .boolean()
          .optional()
          .describe("Purge the entire cache of the resource (requires resource_id)"),
      },
      annotations: CACHE_ACTION,
    },
    toolHandler(async (args) => {
      if (args.resource_id) {
        if (!args.clear_all && !args.urls?.length) {
          throw new Error("Provide urls to purge, or set clear_all=true to purge everything.");
        }
        return client.post(
          `/api/v1/pull_zones/${args.resource_id}/purges`,
          { cache_purge: compact({ clear_all: args.clear_all, urls: args.urls }) },
        );
      }
      if (!args.urls?.length) {
        throw new Error("Without resource_id, provide full URLs to purge (the resource is matched by domain).");
      }
      return client.post("/api/v1/pull_zones/clear_caches", { urls: args.urls });
    }),
  );

  server.registerTool(
    "warmup_cache",
    {
      title: "Warm up CDN cache",
      description:
        "Pre-fetch (warm up) content into the aCDN resource cache for the given paths, optionally per compression method.",
      inputSchema: {
        resource_id: uuid.describe("aCDN resource (pull zone) ID"),
        paths: z.array(z.string()).min(1).describe("Paths to warm up, e.g. ['/video/intro.mp4']"),
        compression_methods: z
          .enum(["gzip", "br", "zstd", "raw"])
          .optional()
          .describe("Compression variant to warm (must be enabled on the resource)"),
      },
      annotations: CACHE_ACTION,
    },
    toolHandler(async (args) =>
      client.post(
        `/api/v1/pull_zones/${args.resource_id}/actions`,
        compact({ type: "warmup", paths: args.paths, compression_methods: args.compression_methods }),
      ),
    ),
  );
}
