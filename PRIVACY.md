# Privacy Policy — BlazingCDN MCP Server

Effective date: August 14, 2026

This policy covers the BlazingCDN MCP server (the `@blazingcdn/mcp` npm package and
its desktop-extension bundle). For how the BlazingCDN service itself handles data,
see the BlazingCDN legal corpus (Privacy Policy, Terms, AUP, Cookie Notice):
https://blazingcdn.com/legal-information/

## Data collection

The MCP server itself collects **nothing**. It has no telemetry, no analytics and no
third-party calls. Two of its tools (`search_docs`, `estimate_traffic_cost`) work
entirely offline.

## Usage and storage

- Your BlazingCDN API token is provided by you (environment variable, or the desktop
  extension's configuration screen, where it is stored by Claude Desktop's own secure
  storage). The server keeps it in process memory only and never writes it to disk.
- The token is sent exclusively to the BlazingCDN API (`wapi.blazingcdn.com`, or the
  `BLAZINGCDN_API_URL` you configure) over HTTPS, as the Authorization header of the
  API requests you ask your AI assistant to make.
- Tool inputs and outputs flow between your MCP client and the BlazingCDN API;
  the server does not persist them.

## Third-party sharing

None. The only network destination is the BlazingCDN API. No data is shared with,
or sent to, any other party.

## Data retention

The server retains no data. All state lives in process memory and is gone when the
process exits. Data you create or read through the BlazingCDN API (CDN zones, files,
metrics) is retained by the BlazingCDN service under the service privacy policy
linked above.

## Contact

Questions about this policy or about data handling: **support@blazingcdn.com**
