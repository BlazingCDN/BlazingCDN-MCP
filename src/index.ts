#!/usr/bin/env node
import { createServer as createHttpServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

function parseArgs(argv: string[]): { transport: "stdio" | "http"; port: number } {
  let transport: "stdio" | "http" = "stdio";
  let port = 8462;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--transport" && argv[i + 1]) {
      const value = argv[++i];
      if (value !== "stdio" && value !== "http") {
        console.error(`Unknown transport '${value}'. Use 'stdio' or 'http'.`);
        process.exit(1);
      }
      transport = value;
    } else if (argv[i] === "--port" && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(
        "Usage: blazingcdn-mcp [--transport stdio|http] [--port 8462]\n\n" +
          "Environment variables:\n" +
          "  BLAZINGCDN_API_TOKEN   API access token (required for stdio; optional fallback for http)\n" +
          "  BLAZINGCDN_API_URL     API base URL (default https://wapi.blazingcdn.com)\n" +
          "  BLAZINGCDN_ALLOW_WRITE=1   Enable create/update tools\n" +
          "  BLAZINGCDN_ALLOW_DELETE=1  Enable delete tools",
      );
      process.exit(0);
    }
  }
  return { transport, port };
}

async function runStdio(): Promise<void> {
  const config = loadConfig();
  if (!config.apiToken) {
    console.error(
      "BLAZINGCDN_API_TOKEN is not set. Create an access token in the BlazingCDN panel and export it.",
    );
    process.exit(1);
  }
  const server = createServer(config);
  await server.connect(new StdioServerTransport());
  console.error("BlazingCDN MCP server running on stdio");
}

async function runHttp(port: number): Promise<void> {
  const baseConfig = loadConfig();
  const httpServer = createHttpServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json", Allow: "POST" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed. This server runs in stateless mode." },
          id: null,
        }),
      );
      return;
    }

    // In HTTP mode each caller supplies their own BlazingCDN API token as the Bearer token.
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : baseConfig.apiToken;
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Missing Authorization: Bearer <BlazingCDN API token>" },
          id: null,
        }),
      );
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" }).end(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }),
      );
      return;
    }

    const server = createServer({ ...baseConfig, apiToken: token });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  });

  httpServer.listen(port, () => {
    console.error(`BlazingCDN MCP server listening on http://localhost:${port} (streamable HTTP, stateless)`);
  });
}

const { transport, port } = parseArgs(process.argv.slice(2));
if (transport === "http") {
  await runHttp(port);
} else {
  await runStdio();
}
