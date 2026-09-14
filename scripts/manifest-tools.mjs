// Writes the static tool list (and icon) into manifest.json from the built server, so Claude Desktop and
// Smithery can show tools without starting the server (it needs an API token to start).
// Run after changing tools: npm run build && node scripts/manifest-tools.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

const MAX_DESCRIPTION = 160;
const manifestUrl = new URL("../manifest.json", import.meta.url);

const server = createServer({ apiToken: "x", apiUrl: "http://localhost", allowWrite: true, allowDelete: true });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "manifest-tools", version: "0.0.0" });
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
const { tools } = await client.listTools();

const firstSentence = (text = "") => {
  // Split at a period followed by a capital letter, so "e.g. 'x'" stays inside the sentence.
  const sentence = text.split(/(?<=\.)\s+(?=[A-Z])/)[0].replace(/\s+/g, " ").trim();
  return sentence.length > MAX_DESCRIPTION ? `${sentence.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : sentence;
};

const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
manifest.icon = "assets/logo-400.png";
manifest.tools = tools.map((tool) => ({ name: tool.name, description: firstSentence(tool.description) }));
writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json: ${manifest.tools.length} tools`);
await client.close();
