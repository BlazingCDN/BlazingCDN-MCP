# BlazingCDN MCP Server

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [BlazingCDN](https://blazingcdn.com). Lets AI agents (Claude, Cursor, Windsurf and any other MCP client) manage your CDN: list and configure resources, purge and warm up cache, query traffic metrics, manage custom domains, cloud storage and the Video CDN.

BlazingCDN is a CDN for video, software & sports media — best for videos, streaming (HLS/DASH), software distribution, games and updates, images, audio, archives and other large files. Built for high-volume projects pushing **5 TB+ per month**.

## Highlights

- **52 tools** covering Anycast CDN, cache operations, metrics, custom domains, Cloud Storage and Video CDN
- **Safe by default** — starts in read-only mode (plus cache purge/warmup); create/update and delete operations are opt-in via environment flags
- **No install required** — runs with `npx`
- Talks directly to the BlazingCDN API (`wapi.blazingcdn.com`) with your API token; nothing else sits in between

## Getting an account and API token

1. **Sign up at [blazingcdn.com](https://blazingcdn.com/)** — every new account starts with a **14-day trial**. The trial is time-limited only: there is no free traffic included, traffic used during the trial is billed at the regular **$5/TB** rate.
2. **Top up your balance** with at least **$10** right after signing up so your account doesn't go negative while you test.
3. **Create an API access token**: BlazingCDN panel → Account → API tokens (or `POST /api/v1/access_tokens`).

### Pricing (Flex plan)

After the trial you are on the pay-as-you-go Flex plan with a **$25/month minimum, which covers your first 5 TB**. Traffic is billed on a progressive scale:

| Monthly traffic | Price per TB |
|---|---|
| First 5 TB | $5.00 |
| 5–25 TB | $4.50 |
| 25–100 TB | $4.00 |
| 100–500 TB | $3.50 |
| 500–1000 TB | $3.00 |
| 1000–1500 TB | $2.50 |

All plans include custom domains, unlimited requests, origin shield, URL signatures, free SSL and geo allow/block lists — no per-feature surcharges. **Pushing more than 100 TB/month?** [Contact BlazingCDN](https://blazingcdn.com/sign-up-contact-form/) to request custom volume pricing.

## Quick start

### Claude Code

```bash
claude mcp add blazingcdn --env BLAZINGCDN_API_TOKEN=your-token -- npx -y @blazingcdn/mcp
```

### Claude Desktop / Cursor / Windsurf

Add to your MCP configuration (`claude_desktop_config.json`, `.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "blazingcdn": {
      "command": "npx",
      "args": ["-y", "@blazingcdn/mcp"],
      "env": {
        "BLAZINGCDN_API_TOKEN": "your-token"
      }
    }
  }
}
```

Running from GitHub instead of npm also works: replace `"args"` with `["-y", "github:BlazingCDN/BlazingCDN-MCP"]`.

## Configuration

| Environment variable | Required | Description |
|---|---|---|
| `BLAZINGCDN_API_TOKEN` | yes | API access token (Bearer) |
| `BLAZINGCDN_API_URL` | no | API base URL, default `https://wapi.blazingcdn.com` |
| `BLAZINGCDN_ALLOW_WRITE` | no | `1` enables create/update tools |
| `BLAZINGCDN_ALLOW_DELETE` | no | `1` enables delete tools (`delete_custom_domain`, `delete_vcdn_resource`) |

### Permission model

| Mode | Tools | What agents can do |
|---|---|---|
| default | 29 | Read everything + purge/warm up cache |
| `BLAZINGCDN_ALLOW_WRITE=1` | 50 | …plus create/update CDN resources, domains, buckets, Video CDN |
| …`+ BLAZINGCDN_ALLOW_DELETE=1` | 52 | …plus delete custom domains and vCDN resources |

Deleting CDN resources (pull zones), buckets, external storages, accounts or users is **not implemented at all** — those operations cannot be triggered through this server in any mode.

## Tools

### Anycast CDN
| Tool | Description |
|---|---|
| `list_cdn_resources` | List all CDN resources (pull zones) |
| `get_cdn_resource` | Full settings of one resource |
| `purge_cache` | Purge everything or specific URLs; works per-resource or across resources by URL |
| `warmup_cache` | Pre-fetch paths into the cache (per compression method) |
| `get_cdn_metrics` | Bandwidth, cache hit, requests, HTTP codes, traffic — by day/hour/minute, filter by region/domain |
| `get_prometheus_metrics` | Prometheus-format metrics for monitoring |
| `create_cdn_resource` ✏️ | Create a pull zone (origin, bucket or external storage) |
| `update_cdn_resource` ✏️ | TTLs, compression, origin shield, HTTPS redirect, … |
| `bulk_update_cdn_resources` ✏️ | Same settings on several resources |
| `update_cdn_locations` ✏️ | Per-path cache rules |

### Domains & DNS
| Tool | Description |
|---|---|
| `list_custom_domains` / `search_custom_domains` | Domains of a resource / match domains account-wide |
| `list_system_dns_zones` | System DNS zones for CDN hostnames |
| `add_custom_domain` ✏️ / `update_custom_domain` ✏️ | Attach domains, manage SSL (auto SSL / certificate) |
| `delete_custom_domain` 🗑️ | Remove a custom domain |

### Cloud Storage
`list_buckets`, `get_bucket`, `get_bucket_metrics`, `get_storage_info`, `create_bucket` ✏️, `update_bucket` ✏️, `list_external_storages`, `get_external_storage`, `create_external_storage` ✏️, `update_external_storage` ✏️, `test_external_storage_connection` ✏️

### Video CDN
`list_vcdn_resources`, `get_vcdn_resource`, `get_vcdn_statistics` (totals, timeseries, by domain, top domains, HTTP codes, bandwidth, cache/storage), `list_vcdn_domains`, `get_vcdn_domain`, `list_vcdn_files`, `get_vcdn_files_total`, `list_ftp_logins`, `list_auto_imports`, `get_vcdn_proxy`, `get_vcdn_ftp_settings`, `get_vcdn_settings`, `create_vcdn_resource` ✏️, `update_vcdn_resource` ✏️, `create_vcdn_domain` ✏️, `update_vcdn_domain` ✏️, `upload_vcdn_file` ✏️, `manage_auto_import` ✏️, `update_vcdn_proxy` ✏️, `update_vcdn_ftp_settings` ✏️, `manage_ftp_login` ✏️, `update_vcdn_settings` ✏️, `delete_vcdn_resource` 🗑️

### Docs & pricing
`search_docs` — search BlazingCDN documentation and product pages.
`estimate_traffic_cost` — calculate the monthly Flex-plan cost for a given traffic volume (progressive tiers, offline).

✏️ requires `BLAZINGCDN_ALLOW_WRITE=1` · 🗑️ requires `BLAZINGCDN_ALLOW_DELETE=1`

## Example prompts

- *"What's my CDN bandwidth this month, broken down by day?"*
- *"Purge `/images/*` on the blazingcdn.com resource"*
- *"Create a CDN resource for origin https://example.com and attach cdn.example.com with auto SSL"*
- *"Show HTTP 5xx rates for the last 24 hours per region"*
- *"Warm up /video/intro.mp4 with brotli compression"*
- *"How much would 190 TB/month cost on BlazingCDN?"*

## HTTP transport (self-hosting)

The server also speaks Streamable HTTP for remote deployments:

```bash
BLAZINGCDN_ALLOW_WRITE=1 npx -y @blazingcdn/mcp --transport http --port 8462
```

In HTTP mode the server is stateless and each request must carry the caller's BlazingCDN API token as `Authorization: Bearer <token>` (an env `BLAZINGCDN_API_TOKEN` acts as fallback). Put it behind TLS (reverse proxy) before exposing it anywhere.

## Development

```bash
npm install
npm test        # vitest
npm run build   # tsc -> dist/
npx @modelcontextprotocol/inspector node dist/index.js   # interactive inspector
```

## Security notes

- The API token is read from the environment and sent only to `BLAZINGCDN_API_URL`; it is never logged.
- Tool output is truncated at 60 KB to keep agent contexts healthy.
- API requests time out after 30 s (file uploads: 5 min).

## License

[MIT](LICENSE) © BlazingCDN
