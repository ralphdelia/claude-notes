import { z } from "zod";
import { query } from "@anthropic-ai/claude-code";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { OperationLogger } from "../logging.js";
import { LOG_DIR } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const savePrompt = readFileSync(resolve(__dirname, "savePrompt.txt"), "utf-8");

const saveToolSchema = z.object({
  info: z
    .string()
    .describe("Information that to be saved to the notes folder."),
});

export const saveToolDefinition = {
  name: "save",
  description: "A function that will save important information into the notes folder",
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
};

export async function handleSaveTool(request: any, outDir: string) {
  const logger = new OperationLogger("save", request, LOG_DIR);
  
  try {
    const args = saveToolSchema.parse(request.arguments);
    
    for await (const message of query({
      prompt: savePrompt + `Information to be saved: ${args.info}`,
      options: {
        cwd: outDir,
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
          text: `Data saved successfully to ${outDir}`,
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