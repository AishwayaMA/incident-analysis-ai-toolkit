import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { executeQuery } from './splunk-playwright.js';
import { assertReadOnly, normalizeSpl } from './spl-guard.js';

const server = new Server(
  { name: 'splunk-servicenow-reader', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'splunk_search',
      description: 'Run a read-only Splunk search and return its results.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Splunk Search Processing Language query.' },
          earliest: { type: 'string', default: '-24h@h' },
          latest: { type: 'string', default: 'now' },
          count: { type: 'number', default: 100, maximum: 1000 },
        },
        required: ['query'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'splunk_search') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments || {};
  if (typeof args.query !== 'string' || !args.query.trim()) {
    throw new Error('query must be a non-empty string.');
  }

  const count = args.count === undefined ? 100 : args.count;
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new Error('count must be an integer between 1 and 1000.');
  }

  const earliest = args.earliest === undefined ? '-24h@h' : args.earliest;
  const latest = args.latest === undefined ? 'now' : args.latest;
  if (typeof earliest !== 'string' || typeof latest !== 'string') {
    throw new Error('earliest and latest must be strings.');
  }

  const spl = normalizeSpl(args.query);
  assertReadOnly(spl);
  const results = await executeQuery(spl, earliest, latest, count);

  return {
    content: [{ type: 'text', text: JSON.stringify({ query: spl, results }) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
