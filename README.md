# mcp-realestateapi

RealEstateAPI MCP — property search, detail, and skip-trace (realestateapi.com)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Realestateapi data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
