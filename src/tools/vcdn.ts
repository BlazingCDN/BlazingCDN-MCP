import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import type { Config } from "../config.js";
import { compact, DESTRUCTIVE, READ_ONLY, toolHandler, WRITE } from "./util.js";

const uuid = z.string().uuid();
// vCDN sub-entities (domains, FTP logins, auto imports) use numeric IDs, unlike vCDN resources (UUIDs)
const numericId = z.union([z.number().int(), z.string()]);

export function registerVcdnTools(server: McpServer, client: ApiClient, config: Config): void {
  server.registerTool(
    "list_vcdn_resources",
    {
      title: "List vCDN resources",
      description: "List all Video CDN resources in the account.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/vcdn_resources")),
  );

  server.registerTool(
    "get_vcdn_resource",
    {
      title: "Get vCDN resource",
      description: "Get details of one Video CDN resource.",
      inputSchema: { resource_id: uuid.describe("vCDN resource ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/vcdn_resources/${args.resource_id}`)),
  );

  server.registerTool(
    "get_vcdn_statistics",
    {
      title: "Get vCDN statistics",
      description:
        "Get Video CDN statistics. Reports: " +
        "'monthly_totals' — totals for the current month (requires resource_id); " +
        "'timeseries' — per-resource stats over start_date..end_date (requires resource_id); " +
        "'by_domains' — per-domain stats (requires resource_id and domains); " +
        "'top_domains' — top rated domains of a resource (requires resource_id); " +
        "'http_codes' — per-resource HTTP code stats (requires resource_id); " +
        "'bandwidth' — account bandwidth (optional resource_id filter); " +
        "'cache_storage' — cache and storage usage; " +
        "'global_http_codes' — account-wide HTTP code stats. " +
        "Dates in ISO format, e.g. '2026-08-01T00:00:00Z'. start_date and end_date are REQUIRED " +
        "for every report except monthly_totals.",
      inputSchema: {
        report: z.enum([
          "monthly_totals",
          "timeseries",
          "by_domains",
          "top_domains",
          "http_codes",
          "bandwidth",
          "cache_storage",
          "global_http_codes",
        ]),
        resource_id: uuid.optional().describe("vCDN resource ID"),
        start_date: z.string().optional().describe("Period start, e.g. '2026-08-01T00:00:00Z'"),
        end_date: z.string().optional().describe("Period end, e.g. '2026-08-07T23:59:59Z'"),
        domains: z.array(z.string()).optional().describe("Domain names (for by_domains / http_codes reports)"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => {
      const { report, resource_id, start_date, end_date, domains } = args;
      const range = compact({ start_date, end_date });
      const needsResource = ["monthly_totals", "timeseries", "by_domains", "top_domains", "http_codes"];
      if (needsResource.includes(report) && !resource_id) {
        throw new Error(`Report '${report}' requires resource_id.`);
      }
      if (report !== "monthly_totals" && (!start_date || !end_date)) {
        throw new Error(`Report '${report}' requires start_date and end_date.`);
      }
      switch (report) {
        case "monthly_totals":
          return client.get(`/api/v1/vcdn_resources/${resource_id}/stats`);
        case "timeseries":
          return client.get(`/api/v1/vcdn_resources/${resource_id}/statistics`, range);
        case "by_domains":
          if (!domains?.length) throw new Error("Report 'by_domains' requires domains.");
          return client.get(`/api/v1/vcdn_resources/${resource_id}/statistics/by_domains`, {
            ...range,
            domains,
          });
        case "top_domains":
          return client.get(`/api/v1/vcdn_resources/${resource_id}/statistics/top_rated_domains`, range);
        case "http_codes":
          return client.get(`/api/v1/vcdn_resources/${resource_id}/statistics/http_codes`, {
            ...range,
            ...(domains?.length ? { domains } : {}),
          });
        case "bandwidth":
          return client.get("/api/v1/vcdn_statistics/bandwidth", compact({ ...range, vcdn_resource_id: resource_id }));
        case "cache_storage":
          return client.get("/api/v1/vcdn_statistics/cache_storage", compact({ ...range, vcdn_resource_id: resource_id }));
        case "global_http_codes":
          return client.get("/api/v1/vcdn_statistics/http_codes", compact({ ...range, vcdn_resource_id: resource_id }));
      }
    }),
  );

  server.registerTool(
    "list_vcdn_domains",
    {
      title: "List vCDN domains",
      description: "List Video CDN domains, optionally filtered by name or SSL certificate.",
      inputSchema: {
        domains: z.array(z.string()).optional().describe("Filter by domain names"),
        ssl_certificate_ids: z.array(numericId).optional().describe("Filter by SSL certificate IDs"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get("/api/v1/vcdn_domains", compact({ ...args }))),
  );

  server.registerTool(
    "get_vcdn_domain",
    {
      title: "Get vCDN domain",
      description: "Get details of one Video CDN domain.",
      inputSchema: { domain_id: numericId.describe("vCDN domain ID (numeric)") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/vcdn_domains/${args.domain_id}`)),
  );

  server.registerTool(
    "list_vcdn_files",
    {
      title: "List vCDN files",
      description: "List files stored on the Video CDN, with filtering, sorting and pagination.",
      inputSchema: {
        vcdn_resource_id: uuid.optional().describe("Filter by vCDN resource"),
        page: z.number().int().optional(),
        per_page: z.number().int().min(1).max(1000).optional(),
        sort_order: z.enum(["asc", "desc"]).optional(),
        sort_field_name: z.string().optional(),
        status: z.string().optional().describe("Filter by file status"),
        type: z.string().optional().describe("Filter by file type"),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        data_type: z.enum(["full", "list", "summary"]).optional().describe("Response verbosity (default full)"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get("/api/v1/vcdn_files", compact({ ...args }))),
  );

  server.registerTool(
    "get_vcdn_files_total",
    {
      title: "Get vCDN files totals",
      description: "Get total count and size of files stored on the Video CDN.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/vcdn_files/total")),
  );

  server.registerTool(
    "list_ftp_logins",
    {
      title: "List FTP logins",
      description: "List FTP/SFTP logins of a Video CDN resource.",
      inputSchema: { resource_id: uuid.describe("vCDN resource ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/vcdn_resources/${args.resource_id}/ftp_logins`)),
  );

  server.registerTool(
    "list_auto_imports",
    {
      title: "List auto imports",
      description: "List content auto-import jobs of a Video CDN resource.",
      inputSchema: { resource_id: uuid.describe("vCDN resource ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/vcdn_resources/${args.resource_id}/auto_imports`)),
  );

  server.registerTool(
    "get_vcdn_proxy",
    {
      title: "Get vCDN proxy settings",
      description: "Get proxy (origin fetch) settings of a Video CDN resource.",
      inputSchema: { resource_id: uuid.describe("vCDN resource ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/vcdn_resources/${args.resource_id}/proxy`)),
  );

  server.registerTool(
    "get_vcdn_ftp_settings",
    {
      title: "Get vCDN FTP settings",
      description: "Get FTP import settings of a Video CDN resource.",
      inputSchema: { resource_id: uuid.describe("vCDN resource ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/vcdn_resources/${args.resource_id}/ftp`)),
  );

  server.registerTool(
    "get_vcdn_settings",
    {
      title: "Get vCDN default settings",
      description: "Get account-wide default Video CDN settings.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/vcdn_settings")),
  );

  if (config.allowWrite) {
    server.registerTool(
      "create_vcdn_resource",
      {
        title: "Create vCDN resource",
        description: "Create a new Video CDN resource.",
        inputSchema: {
          name: z.string().describe("Resource name"),
          www_folder: z.string().describe("Resource folder name, e.g. '/a'"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => client.post("/api/v1/vcdn_resources", compact({ ...args }))),
    );

    server.registerTool(
      "update_vcdn_resource",
      {
        title: "Update vCDN resource",
        description: "Rename a Video CDN resource.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          name: z.string().describe("New resource name"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.put(`/api/v1/vcdn_resources/${args.resource_id}`, { name: args.name }),
      ),
    );

    server.registerTool(
      "create_vcdn_domain",
      {
        title: "Create vCDN domain",
        description: "Add a domain to a Video CDN resource.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          name: z.string().describe("Domain name, e.g. 'video.example.com'"),
          create_referer: z
            .enum(["global", "local"])
            .optional()
            .describe("Create an account-level (global) or domain-level (local) referer restriction"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.post(
          "/api/v1/vcdn_domains",
          compact({ vcdn_resource_id: args.resource_id, name: args.name, create_referer: args.create_referer }),
        ),
      ),
    );

    server.registerTool(
      "update_vcdn_domain",
      {
        title: "Update vCDN domain",
        description:
          "Update a Video CDN domain. Settings keys: secret_primary / secret_secondary (link signature secrets; " +
          "'' to unset, null for default; write-only — reads return them as true/false flags), " +
          "ssl_certificate_id, auto_ssl, plus domain base parameters.",
        inputSchema: {
          domain_id: numericId.describe("vCDN domain ID (numeric)"),
          settings: z.object({}).passthrough().describe("Domain settings to change"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => client.put(`/api/v1/vcdn_domains/${args.domain_id}`, args.settings)),
    );

    server.registerTool(
      "upload_vcdn_file",
      {
        title: "Upload vCDN file",
        description:
          "Upload a local file to a Video CDN resource. Files must be between 10 MB and 10 GB " +
          "(the storage is video-oriented). Returns HTTP 202 — the file is processed asynchronously " +
          "and appears in list_vcdn_files once processing completes.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          file_path: z.string().describe("Absolute path of the local file to upload"),
          filename: z.string().optional().describe("Target file name (defaults to the local file name)"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => {
        const data = await readFile(args.file_path);
        const name = args.filename ?? basename(args.file_path);
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array(data)]), name);
        form.append("vcdn_resource_id", args.resource_id);
        form.append("filename", name);
        return client.request("POST", "/api/v1/vcdn_files/upload", { formData: form, timeoutMs: 300_000 });
      }),
    );

    server.registerTool(
      "manage_auto_import",
      {
        title: "Create or update auto import",
        description:
          "Create (omit auto_import_id) or update (pass auto_import_id) a content auto-import job of a vCDN resource. " +
          "Params: either bucket source (bucket_id/bucket_name, folder_name) or rsync source (rsync_url, fetch_url), " +
          "plus callback_url, cut_folders and scan/fetch options. A bucket folder can feed only one resource — " +
          "creating a second import for the same folder returns 422.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          auto_import_id: numericId.optional().describe("Auto import ID (numeric; update if provided)"),
          params: z.object({}).passthrough().describe("Auto import parameters"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => {
        const base = `/api/v1/vcdn_resources/${args.resource_id}/auto_imports`;
        return args.auto_import_id
          ? client.put(`${base}/${args.auto_import_id}`, args.params)
          : client.post(base, args.params);
      }),
    );

    server.registerTool(
      "update_vcdn_proxy",
      {
        title: "Update vCDN proxy settings",
        description:
          "Update proxy (origin fetch) settings of a vCDN resource. Params: either bucket source (bucket_id/bucket_name, " +
          "folder_name) or URL source (proxy_url, fetch_url, proxy_ip), plus callback_url and rescan options.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          params: z.object({}).passthrough().describe("Proxy parameters"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => client.put(`/api/v1/vcdn_resources/${args.resource_id}/proxy`, args.params)),
    );

    server.registerTool(
      "update_vcdn_ftp_settings",
      {
        title: "Update vCDN FTP settings",
        description: "Update FTP import settings (password) of a vCDN resource.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          import_ftp_password: z.string().describe("FTP password"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.put(`/api/v1/vcdn_resources/${args.resource_id}/ftp`, {
          import_ftp_password: args.import_ftp_password,
        }),
      ),
    );

    server.registerTool(
      "manage_ftp_login",
      {
        title: "Manage FTP login",
        description:
          "Manage FTP/SFTP logins of a vCDN resource. action 'create' requires password; " +
          "'update' modifies an existing login (ftp_login_id); 'enable'/'disable' toggle an existing login.",
        inputSchema: {
          resource_id: uuid.describe("vCDN resource ID"),
          action: z.enum(["create", "update", "enable", "disable"]),
          ftp_login_id: numericId.optional().describe("FTP login ID (numeric; required for update/enable/disable)"),
          password: z.string().optional().describe("Password (required for create)"),
          folder: z.string().optional().describe("FTP folder, e.g. '/a/b'"),
          label: z.string().optional(),
          public_keys: z.string().optional().describe("SSH public keys separated by newlines"),
          allowed_ips: z.array(z.string()).optional().describe("Allowed IPs in CIDR format"),
          callback_url: z.string().optional(),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => {
        const base = `/api/v1/vcdn_resources/${args.resource_id}/ftp_logins`;
        const params = compact({
          password: args.password,
          folder: args.folder,
          label: args.label,
          public_keys: args.public_keys,
          allowed_ips: args.allowed_ips,
          callback_url: args.callback_url,
        });
        switch (args.action) {
          case "create":
            if (!args.password) throw new Error("action 'create' requires password.");
            return client.post(base, params);
          case "update":
            if (!args.ftp_login_id) throw new Error("action 'update' requires ftp_login_id.");
            return client.put(`${base}/${args.ftp_login_id}`, params);
          case "enable":
          case "disable":
            if (!args.ftp_login_id) throw new Error(`action '${args.action}' requires ftp_login_id.`);
            return client.post(`${base}/${args.ftp_login_id}/${args.action}`);
        }
      }),
    );

    server.registerTool(
      "update_vcdn_settings",
      {
        title: "Update vCDN default settings",
        description:
          "Update account-wide default Video CDN settings, including link signature secrets " +
          "(secret_primary / secret_secondary) and fetch settings. WARNING: nested objects " +
          "(e.g. fetch_ext.video) are replaced wholesale, not merged — call get_vcdn_settings first " +
          "and send the complete object with your change applied.",
        inputSchema: {
          settings: z.object({}).passthrough().describe("Settings to change"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) => client.put("/api/v1/vcdn_settings", args.settings)),
    );
  }

  if (config.allowDelete) {
    server.registerTool(
      "delete_vcdn_resource",
      {
        title: "Delete vCDN resource",
        description: "Delete a Video CDN resource. This cannot be undone.",
        inputSchema: { resource_id: uuid.describe("vCDN resource ID") },
        annotations: DESTRUCTIVE,
      },
      toolHandler(async (args) => client.delete(`/api/v1/vcdn_resources/${args.resource_id}`)),
    );
  }
}
