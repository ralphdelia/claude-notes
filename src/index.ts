import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { handleSaveTool } from "./saveHandler.js";
import { OUT_DIR, LOG_DIR } from "./config.js";

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
      {
        name: "save",
        description:
          "A function that will save important information into the notes folder",
        inputSchema: {
          type: "object",
          properties: {
            info: {
              type: "string",
              description: "Information that to be saved to the notes folder.",
            },
          },
          required: ["info"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "save") {
    return await handleSaveTool(request.params, OUT_DIR, LOG_DIR);
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Unknown tool: ${request.params.name}`,
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Notes MCP server running on stdio, saving to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
