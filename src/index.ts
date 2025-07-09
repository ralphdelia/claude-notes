import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { parseArgs } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { z } from "zod";
import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

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

// Ensure directories exist
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "save") {
    const timestamp = new Date().toISOString();
    const logId = `save_${timestamp.replace(/[:.]/g, "-")}`;
    let logData = {
      id: logId,
      timestamp,
      request: request.params,
      outDir: OUT_DIR,
      success: false,
      error: null as any,
      messages: [] as SDKMessage[],
      duration: 0,
    };

    const startTime = Date.now();

    try {
      const args = saveToolSchema.parse(request.params.arguments);
      logData.request = { ...request.params, arguments: args };

      const messages: SDKMessage[] = [];
      let hasResult = false;

      try {
        for await (const message of query({
          prompt: savePrompt + `Information to be saved: ${args.info}`,
          options: {
            cwd: OUT_DIR,
            maxTurns: 5,
            executable: "node",
            permissionMode: "bypassPermissions",
          },
        })) {
          messages.push(message);
          if (message.type === "result") {
            hasResult = true;
            break;
          }
        }
      } catch (queryError) {
        // Check if this is a normal completion (has messages and result) vs startup failure (no messages)
        if (
          hasResult &&
          messages.length > 0 &&
          queryError instanceof Error &&
          queryError.message.includes("exited with code 1")
        ) {
          // Normal completion with exit code 1 after processing
        } else {
          // This is a real error - either startup failure or other issue
          throw new Error(
            `Claude Code SDK error: ${queryError instanceof Error ? queryError.message : "Unknown error"}. Check ANTHROPIC_API_KEY and permissions.`,
          );
        }
      }

      logData.messages = messages;
      logData.success = true;
      logData.duration = Date.now() - startTime;

      return {
        content: [
          {
            type: "text",
            text: `Data saved successfully to ${OUT_DIR}`,
          },
        ],
      };
    } catch (error) {
      logData.error = {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : "UnknownError",
      };
      logData.duration = Date.now() - startTime;

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
      const logFile = resolve(LOG_DIR, `${logId}.json`);
      writeFileSync(logFile, JSON.stringify(logData, null, 2));
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
});
