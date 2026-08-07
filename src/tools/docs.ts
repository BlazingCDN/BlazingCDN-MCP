import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult } from "./util.js";
import { DOCS, type DocEntry } from "./docs-data.js";

function score(entry: DocEntry, terms: string[]): number {
  let total = 0;
  const title = entry.title.toLowerCase();
  const summary = entry.summary.toLowerCase();
  for (const term of terms) {
    if (title.includes(term)) total += 3;
    if (entry.keywords.some((k) => k.includes(term) || term.includes(k))) total += 2;
    if (summary.includes(term)) total += 1;
  }
  return total;
}

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    "search_docs",
    {
      title: "Search BlazingCDN docs",
      description:
        "Search BlazingCDN public documentation and product pages by keyword. " +
        "Returns matching pages with URLs — fetch a URL for full details.",
      inputSchema: {
        query: z.string().describe("Search query, e.g. 'purge cache API' or 'video streaming pricing'"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const terms = args.query
        .toLowerCase()
        .split(/[^a-z0-9а-яё-]+/i)
        .filter((t) => t.length > 1);
      const ranked = DOCS.map((entry) => ({ entry, s: score(entry, terms) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map(({ entry }) => ({ title: entry.title, url: entry.url, summary: entry.summary }));
      if (ranked.length === 0) {
        return textResult(
          "No matching pages. Try broader terms, or start from https://knowledgebase.blazingcdn.com/ " +
            "or the API reference at https://wapi.blazingcdn.com/api-docs/index.html",
        );
      }
      return textResult(ranked);
    },
  );
}
