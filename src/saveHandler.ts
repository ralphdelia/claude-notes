import { z } from "zod";
import { query } from "@anthropic-ai/claude-code";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { OperationLogger } from "./logging.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const savePrompt = readFileSync(resolve(__dirname, "savePrompt.txt"), "utf-8");

const saveToolSchema = z.object({
  info: z
    .string()
    .describe("Information that to be saved to the notes folder."),
});

export async function handleSaveTool(request: any, outDir: string, logDir: string) {
  const logger = new OperationLogger("save", request, logDir);
  
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