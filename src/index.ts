interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * RealEstateAPI MCP — property search, detail, and skip-trace (realestateapi.com)
 *
 * Tools:
 * - realestateapi_property_search: off-market / absentee / value-filtered property search.
 * - realestateapi_property_detail:  full property record by id or address.
 * - realestateapi_skip_trace:       owner contact info (phones/emails) for an address.
 *
 * Auth: RealEstateAPI key sent as `x-api-key` header. Pass _apiKey (BYO key only).
 *
 * COMPLIANCE: skip-trace returns regulated owner PII. This pack is a pure passthrough
 * — nothing here is cached or persisted; results are returned to the caller and dropped.
 */


const BASE_URL = 'https://api.realestateapi.com';

const tools: McpToolExport['tools'] = [
  {
    name: 'realestateapi_property_search',
    description:
      'Search properties by city/state/filters (off-market, absentee-owner, value range) — returns matching properties with address, owner, beds/baths, and estimated value. Example: realestateapi_property_search({ city: "Austin", state: "TX", absentee_owner: true, value_max: 400000, size: 25, _apiKey: "your-key" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        city: { type: 'string', description: 'City name, e.g. "Austin"' },
        state: { type: 'string', description: 'Two-letter state code, e.g. "TX"' },
        zip: { type: 'string', description: 'ZIP code' },
        size: { type: 'integer', description: 'Max results to return (default 10, max 50)' },
        property_type: {
          type: 'string',
          description: 'One of SFR, MFR, CONDO, LAND, MOBILE, OTHER',
        },
        beds_min: { type: 'integer', description: 'Minimum bedrooms' },
        baths_min: { type: 'integer', description: 'Minimum bathrooms' },
        absentee_owner: { type: 'boolean', description: 'Only properties whose owner lives elsewhere' },
        value_min: { type: 'integer', description: 'Minimum estimated value (USD)' },
        value_max: { type: 'integer', description: 'Maximum estimated value (USD)' },
        _apiKey: { type: 'string', description: 'RealEstateAPI key from realestateapi.com' },
      },
      required: ['_apiKey'],
    },
  },
  {
    name: 'realestateapi_property_detail',
    description:
      'Get full property detail by id or address — returns owner, estimated value, last sale, characteristics (beds/baths/sqft/year/lot), and mortgage. Example: realestateapi_property_detail({ address: "123 Main St, Austin, TX 78701", _apiKey: "your-key" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'RealEstateAPI property id (from a search result)' },
        address: { type: 'string', description: 'Full property address (use if you have no id)' },
        _apiKey: { type: 'string', description: 'RealEstateAPI key from realestateapi.com' },
      },
      required: ['_apiKey'],
    },
  },
  {
    name: 'realestateapi_skip_trace',
    description:
      'Skip-trace owner contact info for an address — returns the owner name plus phone numbers and emails. Regulated PII: pure passthrough, nothing is stored. Example: realestateapi_skip_trace({ address: "123 Main St, Austin, TX 78701", _apiKey: "your-key" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        address: { type: 'string', description: 'Full property/mailing address to trace' },
        first_name: { type: 'string', description: 'Owner first name (optional, improves match)' },
        last_name: { type: 'string', description: 'Owner last name (optional, improves match)' },
        _apiKey: { type: 'string', description: 'RealEstateAPI key from realestateapi.com' },
      },
      required: ['address', '_apiKey'],
    },
  },
];

async function reapiPost(
  path: string,
  body: unknown,
  apiKey: string,
  tool: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) {
    throw new Error(
      `${tool} requires a RealEstateAPI key. Pass _apiKey from your account at realestateapi.com (sign up and grab an API key). This is a paid data source — bring your own key, or add credits at https://pipeworx.io/account.`,
    );
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `RealEstateAPI auth failed (HTTP ${res.status}) on ${tool}. Check your _apiKey is a valid RealEstateAPI key and your account is funded/active (realestateapi.com).`,
    );
  }
  if (res.status === 429) {
    throw new Error(`RealEstateAPI ${tool}: rate limited (HTTP 429). Slow down and retry.`);
  }
  if (!res.ok) {
    throw new Error(`RealEstateAPI ${tool} error: HTTP ${res.status}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** First defined value among the candidate keys of an object. */
function pick(obj: Record<string, unknown> | undefined, ...keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function asObj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}

function mapProperty(p: Record<string, unknown>) {
  const address = asObj(p.address);
  const owner = asObj(pick(p, 'owner', 'ownerInfo'));
  const ownerName =
    (pick(p, 'ownerName') as string | undefined) ??
    (pick(owner, 'name', 'fullName') as string | undefined) ??
    null;
  return {
    id: pick(p, 'id', 'propertyId') ?? null,
    address: (pick(address, 'address', 'formattedAddress') as string | undefined) ?? null,
    city: (pick(address, 'city') ?? pick(p, 'city')) ?? null,
    state: (pick(address, 'state') ?? pick(p, 'state')) ?? null,
    zip: (pick(address, 'zip', 'zipCode') ?? pick(p, 'zip')) ?? null,
    propertyType: pick(p, 'propertyType', 'propertyUse') ?? null,
    bedrooms: pick(p, 'bedrooms', 'beds') ?? null,
    bathrooms: pick(p, 'bathrooms', 'baths') ?? null,
    estimatedValue: pick(p, 'estimatedValue', 'estValue', 'avm') ?? null,
    lastSaleDate: pick(p, 'lastSaleDate', 'lastSale') ?? null,
    ownerName,
  };
}

async function propertySearch(args: Record<string, unknown>, apiKey: string) {
  const size = Math.min(Math.max(Number(args.size ?? 10), 1), 50);

  // Build the REAPI filter body from provided params only (these keys map 1:1).
  const body: Record<string, unknown> = { size };
  const passthrough = [
    'city',
    'state',
    'zip',
    'property_type',
    'beds_min',
    'baths_min',
    'absentee_owner',
    'value_min',
    'value_max',
  ];
  for (const key of passthrough) {
    if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
      body[key] = args[key];
    }
  }

  const json = await reapiPost('/v2/PropertySearch', body, apiKey, 'realestateapi_property_search');
  const data = Array.isArray(json.data) ? (json.data as Array<Record<string, unknown>>) : [];
  const properties = data.slice(0, size).map(mapProperty);

  return {
    count: (pick(json, 'resultCount', 'recordCount') as number | undefined) ?? properties.length,
    properties,
    raw: data[0] ?? null,
  };
}

async function propertyDetail(args: Record<string, unknown>, apiKey: string) {
  const id = args.id as string | undefined;
  const address = args.address as string | undefined;
  if (!id && !address) {
    throw new Error(
      'realestateapi_property_detail requires either `id` (from a search result) or `address` (full property address).',
    );
  }
  const body: Record<string, unknown> = id ? { id } : { address };

  const json = await reapiPost('/v2/PropertyDetail', body, apiKey, 'realestateapi_property_detail');
  // Detail payload usually lives under `data`; fall back to the root object.
  const p = asObj(json.data) ?? json;

  const addr = asObj(p.address);
  const char = asObj(pick(p, 'propertyInfo', 'characteristics')) ?? p;
  const sale = asObj(pick(p, 'lastSale', 'saleHistory'));

  return {
    address: (pick(addr, 'address', 'formattedAddress') as string | undefined) ?? address ?? null,
    owner: pick(p, 'owner', 'ownerInfo', 'ownerName') ?? null,
    estimatedValue: pick(p, 'estimatedValue', 'estValue', 'avm') ?? null,
    lastSale: pick(p, 'lastSaleDate', 'lastSalePrice') ?? sale ?? null,
    characteristics: {
      beds: pick(char, 'bedrooms', 'beds') ?? null,
      baths: pick(char, 'bathrooms', 'baths') ?? null,
      sqft: pick(char, 'livingSquareFeet', 'squareFeet', 'sqft') ?? null,
      yearBuilt: pick(char, 'yearBuilt') ?? null,
      lotSize: pick(char, 'lotSquareFeet', 'lotSize') ?? null,
    },
    mortgage: pick(p, 'mortgageInfo', 'currentMortgages', 'mortgage') ?? null,
    raw: p,
  };
}

async function skipTrace(args: Record<string, unknown>, apiKey: string) {
  const address = args.address as string | undefined;
  if (!address) {
    throw new Error('realestateapi_skip_trace requires an `address` (full property/mailing address).');
  }
  const body: Record<string, unknown> = { address };
  if (args.first_name) body.first_name = args.first_name;
  if (args.last_name) body.last_name = args.last_name;

  const json = await reapiPost('/v1/SkipTrace', body, apiKey, 'realestateapi_skip_trace');
  // Owner PII: return exactly what the upstream gives; never cache or persist.
  const output = asObj(json.output) ?? asObj(json.data) ?? json;
  const identity = asObj(pick(output, 'identity')) ?? output;

  const phones = pick(identity, 'phones', 'phoneNumbers');
  const emails = pick(identity, 'emails');
  const name =
    (pick(output, 'name', 'fullName') as string | undefined) ??
    (pick(identity, 'name', 'fullName') as string | undefined) ??
    null;

  return {
    name,
    phones: Array.isArray(phones) ? phones : [],
    emails: Array.isArray(emails) ? emails : [],
    raw: output,
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  switch (name) {
    case 'realestateapi_property_search':
      return propertySearch(args, apiKey);
    case 'realestateapi_property_detail':
      return propertyDetail(args, apiKey);
    case 'realestateapi_skip_trace':
      return skipTrace(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// BYO-key only: nominal access meter; the user's own RealEstateAPI key bears the COGS.
export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
