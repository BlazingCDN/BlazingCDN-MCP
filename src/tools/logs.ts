import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import type { Config } from "../config.js";
import { compact, READ_ONLY, toolHandler, WRITE } from "./util.js";

const uuid = z.string().uuid();

export function registerLogTools(server: McpServer, client: ApiClient, config: Config): void {
  server.registerTool(
    "get_raw_logs_settings",
    {
      title: "Get raw logs settings",
      description: "Get raw access log delivery settings for one aCDN resource.",
      inputSchema: { resource_id: uuid.describe("aCDN resource (pull zone) ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/pull_zones/${args.resource_id}/raw_logs_settings`)),
  );

  server.registerTool(
    "list_raw_logs_pull_zones",
    {
      title: "List resources with raw logs",
      description: "List aCDN resources together with their raw log delivery settings.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/raw_logs_settings/pull_zones")),
  );

  if (config.allowWrite) {
    server.registerTool(
      "set_raw_logs_settings",
      {
        title: "Set raw logs settings",
        description:
          "Enable and configure raw access log delivery for aCDN resources. " +
          "destination 'syslog' requires host, port, facility, severity (optional tag); " +
          "destination 'storage' requires bucket_id (optional folder_name).",
        inputSchema: {
          resource_ids: z.array(uuid).min(1).describe("aCDN resource (pull zone) IDs to apply the settings to"),
          enabled: z.boolean().describe("Enable or disable raw logs"),
          destination: z.enum(["syslog", "storage"]).describe("Log delivery destination"),
          time_sampling_enabled: z.boolean().describe("Enable time sampling"),
          time_sampling: z
            .enum(["first_minute", "first_second"])
            .optional()
            .describe("Time sampling interval"),
          host: z.string().optional().describe("Syslog host"),
          port: z.number().int().optional().describe("Syslog port"),
          tag: z.string().optional().describe("Syslog tag"),
          facility: z
            .enum(["local0", "local1", "local2", "local3", "local4", "local5", "local6", "local7"])
            .optional()
            .describe("Syslog facility"),
          severity: z
            .enum(["emerg", "alert", "crit", "error", "warn", "notice", "info", "debug"])
            .optional()
            .describe("Syslog severity"),
          bucket_id: uuid.optional().describe("Cloud storage bucket ID for storage destination"),
          folder_name: z.string().optional().describe("Bucket folder for stored logs"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => {
        const { resource_ids, ...params } = args;
        return client.post("/api/v1/raw_logs_settings/set", compact({ pull_zone_ids: resource_ids, ...params }));
      }),
    );

    server.registerTool(
      "unset_raw_logs",
      {
        title: "Unset raw logs",
        description: "Disable raw access log delivery for specific aCDN resources, or for all of them.",
        inputSchema: {
          resource_ids: z
            .array(uuid)
            .optional()
            .describe("aCDN resource IDs to disable raw logs for (ignored if disable_all)"),
          disable_all: z.boolean().optional().describe("Disable raw logs for all resources"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => {
        if (!args.disable_all && !args.resource_ids?.length) {
          throw new Error("Provide resource_ids or set disable_all=true.");
        }
        return client.post(
          "/api/v1/raw_logs_settings/unset",
          compact({ pull_zone_ids: args.resource_ids, disable_all: args.disable_all }),
        );
      }),
    );
  }
}
