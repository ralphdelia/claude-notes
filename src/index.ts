import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { parseArgs } from "util";
import { resolve } from "path";
import { z } from "zod";
import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import savePrompt from "./savePrompt.txt";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    d: {
      type: "string",
      short: "d",
    },
  },
});

export const OUT_DIR = values.d ? resolve(values.d) : process.cwd();

// Create the MCP server
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

// Define tool schema using zod
const saveToolSchema = z.object({
  info: z
    .string()
    .describe("Information that to be saved to the notes folder."),
});

// Register tools
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

// Implement the tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "save") {
    try {
      const args = saveToolSchema.parse(request.params.arguments);

      const messages: SDKMessage[] = [];

      for await (const message of query({
        prompt: savePrompt + `Information to be saved: ${args.info}`,
        options: {
          cwd: OUT_DIR,
        },
      }));

      return {
        content: [
          {
            type: "text",
            text: `Data saved successfully to ${OUT_DIR}. Result: ${JSON.stringify(messages)}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error in save tool:", error);

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error saving file: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
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

// Connect the transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Notes MCP server running on stdio, saving to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
