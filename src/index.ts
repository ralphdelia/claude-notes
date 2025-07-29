import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { parseArgs } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { z } from "zod";
import { query } from "@anthropic-ai/claude-code";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { config } from "dotenv";

import { OperationLogger } from "./logging.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "..", ".env") });

if (!process.env.ANTHROPIC_API_KEY) {
  console.log(process.env.ANTHROPIC_API_KEY);
  throw new Error("error");
}

const savePrompt = readFileSync(resolve(__dirname, "savePrompt.txt"), "utf-8");

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    d: {
      type: "string",
      short: "d",
    },
  },
});

export const OUT_DIR = values.d
  ? resolve(values.d)
  : resolve(__dirname, "..", "vault");
export const LOG_DIR = resolve(__dirname, "..", "logs");

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
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

const saveToolSchema = z.object({
  info: z
    .string()
    .describe("Information that to be saved to the notes folder."),
});

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
    const logger = new OperationLogger("save", request.params, LOG_DIR);

    try {
      const args = saveToolSchema.parse(request.params.arguments);

      for await (const message of query({
        prompt: savePrompt + `Information to be saved: ${args.info}`,
        options: {
          cwd: OUT_DIR,
          permissionMode: "acceptEdits",
          executable: "bun",
        },
      })) {
        logger.addMessage(message);
        if (message.type === "result") {
          break;
        }
      }

      logger.setSuccess();
      return {
        content: [
          {
            type: "text",
            text: `Data saved successfully to ${OUT_DIR}`,
          },
        ],
      };
    } catch (error) {
      logger.setError(error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error saving file: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    } finally {
      await logger.flush().catch(console.error);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Notes MCP server running on stdio, saving to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
