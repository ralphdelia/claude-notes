import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { handleSaveTool, saveToolDefinition } from "./tools/save.js";
import { handleListTool, listToolDefinition } from "./tools/list.js";
import { handleReadTool, readToolDefinition } from "./tools/read.js";
import { OUT_DIR } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const originalConsoleLog = console.log;
console.log = () => {};
config({ path: resolve(__dirname, "..", ".env") });
console.log = originalConsoleLog;

if (!process.env.ANTHROPIC_API_KEY) {
  console.log(process.env.ANTHROPIC_API_KEY);
  throw new Error("error");
}

const server = new Server(
  {
    name: "notes-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      saveToolDefinition,
      listToolDefinition,
      readToolDefinition,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "save":
      return await handleSaveTool(request.params, OUT_DIR);
    case "list":
      return await handleListTool(request.params, OUT_DIR);
    case "read":
      return await handleReadTool(request.params, OUT_DIR);
    default:
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Unknown tool: ${request.params.name}`,
          },
        ],
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Notes MCP server running on stdio, saving to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
