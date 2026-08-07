import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import type { Config } from "../config.js";
import { compact, DESTRUCTIVE, READ_ONLY, toolHandler, WRITE } from "./util.js";

const uuid = z.string().uuid();

export function registerDomainTools(server: McpServer, client: ApiClient, config: Config): void {
  server.registerTool(
    "list_custom_domains",
    {
      title: "List custom domains",
      description: "List custom domains attached to an aCDN resource, including SSL status.",
      inputSchema: { resource_id: uuid.describe("aCDN resource (pull zone) ID") },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get(`/api/v1/pull_zones/${args.resource_id}/domains`)),
  );

  server.registerTool(
    "search_custom_domains",
    {
      title: "Search custom domains",
      description: "Match domain names against all custom domains in the account (which resource serves which domain).",
      inputSchema: {
        domains: z.array(z.string()).optional().describe("Domain names to match"),
      },
      annotations: READ_ONLY,
    },
    toolHandler(async (args) => client.get("/api/v1/custom_domains", compact({ domains: args.domains }))),
  );

  server.registerTool(
    "list_system_dns_zones",
    {
      title: "List system DNS zones",
      description: "List system DNS zones available for CDN domain names (used when creating aCDN resources).",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    toolHandler(async () => client.get("/api/v1/system_dns_zones")),
  );

  if (config.allowWrite) {
    server.registerTool(
      "add_custom_domain",
      {
        title: "Add custom domains",
        description: "Attach one or more custom domains to an aCDN resource.",
        inputSchema: {
          resource_id: uuid.describe("aCDN resource (pull zone) ID"),
          names: z.array(z.string()).min(1).describe("Domain names to add, e.g. ['cdn.example.com']"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.post(`/api/v1/pull_zones/${args.resource_id}/domains`, {
          domains: args.names.map((name) => ({ name })),
        }),
      ),
    );

    server.registerTool(
      "update_custom_domain",
      {
        title: "Update custom domain",
        description: "Update a custom domain of an aCDN resource: attach an SSL certificate or enable auto SSL (Let's Encrypt).",
        inputSchema: {
          resource_id: uuid.describe("aCDN resource (pull zone) ID"),
          domain_id: uuid.describe("Custom domain ID"),
          ssl_certificate_id: uuid.optional().describe("SSL certificate ID to attach"),
          auto_ssl: z.boolean().optional().describe("Use an automatically issued Let's Encrypt certificate"),
        },
        annotations: WRITE,
      },
      toolHandler(async (args) =>
        client.put(`/api/v1/pull_zones/${args.resource_id}/domains/${args.domain_id}`, {
          domain: compact({ ssl_certificate_id: args.ssl_certificate_id, auto_ssl: args.auto_ssl }),
        }),
      ),
    );
  }

  if (config.allowDelete) {
    server.registerTool(
      "delete_custom_domain",
      {
        title: "Delete custom domain",
        description: "Detach and delete a custom domain from an aCDN resource. This cannot be undone.",
        inputSchema: {
          resource_id: uuid.describe("aCDN resource (pull zone) ID"),
          domain_id: uuid.describe("Custom domain ID"),
        },
        annotations: DESTRUCTIVE,
      },
      toolHandler(async (args) =>
        client.delete(`/api/v1/pull_zones/${args.resource_id}/domains/${args.domain_id}`),
      ),
    );
  }
}
