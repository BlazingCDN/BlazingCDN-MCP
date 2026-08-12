# Security

## Threat model & guarantees

**Your API token never leaves your machine except to reach the BlazingCDN API.**

- The server runs locally (stdio) and sends requests only to `BLAZINGCDN_API_URL`
  (default `https://wapi.blazingcdn.com`) over HTTPS with a Bearer header.
- No middleman: there is no hosted gateway, no telemetry, no analytics, no
  third-party calls. `search_docs` and `estimate_traffic_cost` work fully offline.
- The token is never logged and never appears in tool output. API errors are
  returned as status code + truncated body; a unit test asserts the token does
  not leak into error text.
- Tool output is truncated at 60 KB to keep agent contexts bounded.
- Supply chain is minimal: two runtime dependencies
  (`@modelcontextprotocol/sdk`, `zod`), lockfile committed, CI on every push.

## Permission model

- **Read-only by default** — write and delete tools are not registered at all
  without `BLAZINGCDN_ALLOW_WRITE=1` / `BLAZINGCDN_ALLOW_DELETE=1`; the model
  cannot see or call them.
- The most destructive operations — deleting pull zones, buckets, external
  storages, vCDN domains/files, auto imports, FTP logins, accounts or users —
  are **not implemented in any mode**. They cannot be triggered through this
  server even by a fully compromised agent.
- In HTTP mode the server is stateless: each request must carry its own
  `Authorization: Bearer` token, nothing is persisted between requests. Run it
  behind TLS (reverse proxy) before exposing it anywhere.

## Honest limitations

1. **The token sits in plaintext in your MCP client config**
   (`claude_desktop_config.json`, `.cursor/mcp.json`, …). This is the standard
   MCP pattern across vendors — protect the file with OS permissions and treat
   it like a password store.
2. **BlazingCDN API tokens are full-access.** The API does not currently offer
   scoped or read-only tokens, so even a read-only MCP setup holds a key that
   could do everything if extracted. Until scoped tokens exist, prefer a
   dedicated token created only for MCP use, and revoke it in the panel
   (Account → API tokens) if anything looks suspicious.
3. `get_storage_info` returns cloud-storage credentials in plaintext (API
   behaviour). Ask your agent not to echo them into chat logs.
4. As with any agent tooling, enabling write mode means the agent can change
   production settings. Keep write/delete flags off unless the session needs
   them, and review what the agent proposes before approving destructive-ish
   actions like `purge_cache` with `clear_all`.

## Recommendations

- Create a **separate API token just for MCP** and rotate it periodically.
- Keep `BLAZINGCDN_ALLOW_WRITE` / `BLAZINGCDN_ALLOW_DELETE` unset by default;
  enable them per session when you actually intend to change things.
- For remote (HTTP) deployments: TLS in front, network-level access control,
  and per-caller tokens — never share one token between users.

## Reporting a vulnerability

Please report security issues privately to **support@blazingcdn.com** — do not
open a public GitHub issue for exploitable problems. We will respond as fast as
we can and credit reporters in release notes unless you prefer otherwise.
