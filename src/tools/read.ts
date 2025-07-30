import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

import { OperationLogger } from "../logging.js";
import { LOG_DIR, OUT_DIR } from "../config.js";

const readToolSchema = z.object({
  path: z.string().describe("Path to the file within the vault to read"),
});

export const readToolDefinition = {
  name: "read",
  description: "Read a specific file from the vault",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file within the vault to read",
      },
    },
    required: ["path"],
  },
};

export async function handleReadTool(request: any) {
  const logger = new OperationLogger("read", request, LOG_DIR);

  try {
    const args = readToolSchema.parse(request.arguments);

    const filePath = args.path.endsWith(".md") ? args.path : `${args.path}.md`;
    const fullPath = resolve(join(OUT_DIR, filePath));

    const normalizedOutDir = resolve(OUT_DIR);
    if (!fullPath.startsWith(normalizedOutDir)) {
      throw new Error("Access denied: Path is outside the vault directory");
    }

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(fullPath, "utf-8");

    logger.setSuccess();
    return {
      content: [
        {
          type: "text",
          text: `# File: ${filePath}\n\n${content}`,
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
          text: `Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  } finally {
    await logger.flush().catch(console.error);
  }
}
