import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../src/config.js";
import { createServer } from "../src/server.js";

export const BASE_CONFIG: Config = {
  apiToken: "test-token",
  apiUrl: "https://wapi.blazingcdn.com",
  allowWrite: false,
  allowDelete: false,
};

export async function connectClient(config: Partial<Config> = {}): Promise<Client> {
  const server = createServer({ ...BASE_CONFIG, ...config });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

export async function listToolNames(config: Partial<Config> = {}): Promise<string[]> {
  const client = await connectClient(config);
  const { tools } = await client.listTools();
  return tools.map((t) => t.name).sort();
}

export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body?: unknown;
}

/** Install a fetch mock that records requests and returns the given payload. */
export function mockFetch(payload: unknown = { ok: true }, status = 200): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = Object.fromEntries(
      Object.entries((init?.headers ?? {}) as Record<string, string>),
    );
    let body: unknown;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    requests.push({ method: init?.method ?? "GET", url, headers, body });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return requests;
}
