// Publishes the .mcpb bundle to Smithery with a full server card (tools with input schemas).
// `smithery mcp publish` turns the manifest's MCPB tool list (name + description only) into the server
// card, and Smithery rejects tools without an inputSchema — so the card is built from the server itself.
// Usage: npm run build && SMITHERY_API_KEY=... node scripts/smithery-publish.mjs path/to/bundle.mcpb
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

const QUALIFIED_NAME = "blazingcdn/mcp";
const [bundlePath] = process.argv.slice(2);
const apiKey = process.env.SMITHERY_API_KEY;
if (!bundlePath || !apiKey) {
  console.error("Usage: SMITHERY_API_KEY=... node scripts/smithery-publish.mjs <bundle.mcpb>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

const server = createServer({ apiToken: "x", apiUrl: "http://localhost", allowWrite: true, allowDelete: true });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "smithery-publish", version: "0.0.0" });
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
const { tools } = await client.listTools();
await client.close();

// Same shape `smithery mcp publish` derives from the manifest's user_config (checkboxes stay booleans).
const configSchema = { type: "object", properties: {}, required: [] };
for (const [key, field] of Object.entries(manifest.user_config)) {
  configSchema.properties[key] = {
    type: field.type,
    title: field.title,
    description: field.description,
    ...(field.default !== undefined ? { default: field.default } : {}),
  };
  if (field.required) configSchema.required.push(key);
}

const payload = {
  type: "stdio",
  runtime: "node",
  serverCard: {
    serverInfo: { name: manifest.name, version: manifest.version },
    tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({
      name,
      ...(title ? { title } : {}),
      description,
      inputSchema,
      ...(annotations ? { annotations } : {}),
    })),
  },
  configSchema,
};

const form = new FormData();
form.append("payload", JSON.stringify(payload));
form.append("bundle", new Blob([readFileSync(bundlePath)], { type: "application/zip" }), basename(bundlePath));

const response = await fetch(`https://api.smithery.ai/servers/${encodeURIComponent(QUALIFIED_NAME)}/releases`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: form,
});
console.log(`${response.status} ${(await response.text()).slice(0, 500)}`);
if (!response.ok) process.exit(1);
