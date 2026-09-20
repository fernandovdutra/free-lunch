import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Firestore } from 'firebase-admin/firestore';
import { TOOL_DEFINITIONS, callTool } from './tools.js';
import { WRITE_TOOL_DEFINITIONS } from './writeTools.js';

const writableNames = new Set(WRITE_TOOL_DEFINITIONS.map((tool) => tool.name));

export function allowedTools(canWrite: boolean) {
  const tools = canWrite ? TOOL_DEFINITIONS : TOOL_DEFINITIONS.filter((tool) => !writableNames.has(tool.name));
  return tools.map((tool) => ({
    ...tool,
    securitySchemes: [{ type: 'oauth2', scopes: writableNames.has(tool.name)
      ? ['finance:read', 'finance:write'] : ['finance:read'] }],
  }));
}

/**
 * Builds an MCP server instance exposing the read-only finance tools.
 * A fresh instance is created per HTTP request (stateless transport).
 */
export function createServer(db: Firestore, userId: string, canWrite = true, challenge?: string): Server {
  const server = new Server(
    { name: 'free-lunch-finance', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allowedTools(challenge ? true : canWrite),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      if (challenge) return {
        content: [{ type: 'text' as const, text: 'Sign in to Free Lunch Finance to use this tool.' }],
        isError: true,
        _meta: { 'mcp/www_authenticate': [challenge] },
      };
      // Hiding a tool in tools/list does not stop a client from calling it by name.
      if (!canWrite && writableNames.has(name)) throw new Error('Insufficient finance:write scope');
      const result = await callTool(db, userId, name, args ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  });

  return server;
}
