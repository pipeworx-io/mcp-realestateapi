# mcp-realestateapi

RealEstateAPI MCP — property search, detail, and skip-trace (realestateapi.com)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `realestateapi_property_search` | Search properties by city/state/filters (off-market, absentee-owner, value range) — returns matching properties with address, owner, beds/baths, and estimated value. Example: realestateapi_property_search({ city: "Austin", state: "TX", absentee_owner: true, value_max: 400000, size: 25, _apiKey: "your-key" }) |
| `realestateapi_property_detail` | Get full property detail by id or address — returns owner, estimated value, last sale, characteristics (beds/baths/sqft/year/lot), and mortgage. Example: realestateapi_property_detail({ address: "123 Main St, Austin, TX 78701", _apiKey: "your-key" }) |
| `realestateapi_skip_trace` | Skip-trace owner contact info for an address — returns the owner name plus phone numbers and emails. Regulated PII: pure passthrough, nothing is stored. Example: realestateapi_skip_trace({ address: "123 Main St, Austin, TX 78701", _apiKey: "your-key" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "realestateapi": {
      "url": "https://gateway.pipeworx.io/realestateapi/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/realestateapi/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Realestateapi data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

This pack takes your own API key (`_apiKey`) — we don't front one for it, so there's no curl here that would run without it. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/realestateapi_property_search`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
