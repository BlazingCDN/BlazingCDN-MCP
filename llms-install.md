# Installing the BlazingCDN MCP server (guide for AI agents)

Follow these steps to install and verify the server. Ask the user for their
BlazingCDN API token before you start — nothing works without it.

## 1. Get the API token (user action)

The user creates a token in the BlazingCDN panel: **Account → API tokens**
(sign-up at https://blazingcdn.com if they have no account yet). Never ask the
user to paste the token into chat if your client supports secure env
configuration — put it in the config file instead.

## 2. Add the server to the MCP client config

The server runs with `npx` — Node.js ≥ 20 is the only requirement.

Claude Code:
```bash
claude mcp add blazingcdn --env BLAZINGCDN_API_TOKEN=<token> -- npx -y @blazingcdn/mcp
```

Cline / Cursor / Windsurf / Claude Desktop (JSON config):
```json
{
  "mcpServers": {
    "blazingcdn": {
      "command": "npx",
      "args": ["-y", "@blazingcdn/mcp"],
      "env": {
        "BLAZINGCDN_API_TOKEN": "<token>"
      }
    }
  }
}
```

## 3. Permission model — choose the mode the user needs

- Default (no extra env): **read-only** — 29 tools: list/inspect everything,
  metrics, docs search, pricing calculator, plus cache purge/warmup.
- Add `"BLAZINGCDN_ALLOW_WRITE": "1"` to enable create/update tools (50 tools).
- Add `"BLAZINGCDN_ALLOW_DELETE": "1"` to also enable the two delete tools
  (custom domains and Video CDN resources; 52 tools).

Start read-only unless the user explicitly wants management capabilities.
Deleting CDN zones, buckets or accounts is not possible in any mode.

## 4. Verify the installation

Call the `estimate_traffic_cost` tool with `{"tb_per_month": 1}` — it works
offline and proves the server starts. Then call `list_cdn_resources` — a valid
token returns the account's CDN zones; a 401 error means the token is wrong.

## Troubleshooting

- **401 from the API**: token invalid or revoked — the user should issue a new
  one in the panel.
- **Zone changes not visible on the CDN**: settings propagate in ~1–10 minutes;
  a newly created zone goes live in ~10 minutes on average. Poll, don't assume
  failure. If a new zone is still not serving after ~20 minutes, create a
  replacement zone.
- **More than 25 zones**: `list_cdn_resources` fetches up to 100 per call —
  check `meta.total` and paginate with `page` if the account has more.
