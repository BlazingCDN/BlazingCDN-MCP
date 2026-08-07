import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import type { Config } from "../config.js";
import { compact, READ_ONLY, toolHandler, WRITE } from "./util.js";

const uuid = z.string().uuid();

const externalStorageFields = {
  alias: z.string().describe("External storage alias"),
  host: z.string().describe("Storage endpoint URL (S3-compatible)"),
  region: z.string().describe("Storage region"),
  bucket: z.string().describe("Bucket name on the external storage"),
  access_key_id: z.string().describe("Access key ID"),
  secret_access_key: z.string().describe("Secret access key"),
  port: z.number().int().describe("Storage port, usually 443"),
};

export function registerStorageTools(server: McpServer, client: ApiClient, config: Config): void {
  server.registerTool(
    "list_buckets",
    {
      title: "List storage buckets",
      description: "List all cloud storage buckets in the account.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/buckets")),
  );

  server.registerTool(
    "get_bucket",
    {
      title: "Get storage bucket",
      description: "Get details of one cloud storage bucket.",
      inputSchema: { bucket_id: uuid.describe("Bucket ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/buckets/${args.bucket_id}`)),
  );

  server.registerTool(
    "get_bucket_metrics",
    {
      title: "Get bucket metrics",
      description: "Get usage statistics for cloud storage buckets over a period.",
      inputSchema: {
        period: z.enum(["day", "month", "year"]).describe("Period length"),
        date: z.string().describe("Date inside the period, e.g. '2026-08-01'"),
        bucket_id: uuid.optional().describe("Filter by bucket ID"),
        external_storage_id: uuid.optional().describe("Filter by external storage ID"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get("/api/v1/metrics/buckets", compact({ ...args }))),
  );

  server.registerTool(
    "get_storage_info",
    {
      title: "Get storage info",
      description: "Get cloud storage account info (endpoints, usage).",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/storage")),
  );

  server.registerTool(
    "list_external_storages",
    {
      title: "List external storages",
      description: "List configured external (S3-compatible) storages used as CDN origins.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/external_storages")),
  );

  server.registerTool(
    "get_external_storage",
    {
      title: "Get external storage",
      description: "Get details of one external storage connection.",
      inputSchema: { external_storage_id: uuid.describe("External storage ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/external_storages/${args.external_storage_id}`)),
  );

  if (config.allowWrite) {
    server.registerTool(
      "create_bucket",
      {
        title: "Create storage bucket",
        description: "Create a new cloud storage bucket.",
        inputSchema: {
          name: z.string().describe("Bucket name"),
          type: z.enum(["private", "segments", "cdn"]).optional().describe("Bucket content type"),
          web_index: z.string().optional().describe("Path to the bucket index file"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => client.post("/api/v1/buckets", { bucket: compact({ ...args }) })),
    );

    server.registerTool(
      "update_bucket",
      {
        title: "Update storage bucket",
        description: "Update a cloud storage bucket's type or web index.",
        inputSchema: {
          bucket_id: uuid.describe("Bucket ID"),
          type: z.enum(["private", "segments", "cdn"]).optional().describe("Bucket content type"),
          web_index: z.string().optional().describe("Path to the bucket index file"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => {
        const { bucket_id, ...rest } = args;
        return client.put(`/api/v1/buckets/${bucket_id}`, { bucket: compact(rest) });
      }),
    );

    server.registerTool(
      "create_external_storage",
      {
        title: "Connect external storage",
        description: "Connect an external S3-compatible storage to use as a CDN origin.",
        inputSchema: externalStorageFields,
        annotations: WRITE,
      },
      toolHandler(async (args) => client.post("/api/v1/external_storages", compact({ ...args }))),
    );

    server.registerTool(
      "update_external_storage",
      {
        title: "Update external storage",
        description: "Update an external storage connection.",
        inputSchema: {
          external_storage_id: uuid.describe("External storage ID"),
          ...Object.fromEntries(
            Object.entries(externalStorageFields).map(([k, v]) => [k, v.optional()]),
          ),
        },
        annotations: WRITE,
      },
      toolHandler(async (args: Record<string, unknown>) => {
        const { external_storage_id, ...rest } = args;
        return client.put(`/api/v1/external_storages/${external_storage_id}`, compact(rest));
      }),
    );

    server.registerTool(
      "test_external_storage_connection",
      {
        title: "Test external storage connection",
        description: "Test connectivity and credentials of an external storage configuration before saving it.",
        inputSchema: externalStorageFields,
        annotations: WRITE,
      },
      toolHandler(async (args) => client.post("/api/v1/external_storages/test_connection", compact({ ...args }))),
    );
  }
}
