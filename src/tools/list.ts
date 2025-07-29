import { z } from "zod";
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

import { OperationLogger } from "../logging.js";
import { LOG_DIR } from "../config.js";

const listToolSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Optional path within the vault to list (defaults to root)"),
});

export const listToolDefinition = {
  name: "list",
  description: "List files and directories in the vault",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Optional path within the vault to list (defaults to root)",
      },
    },
    required: [],
  },
};

function listFilesRecursively(
  dirPath: string,
  basePath: string,
): Array<{ path: string; type: string; size?: number }> {
  const items: Array<{ path: string; type: string; size?: number }> = [];

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const relativePath = relative(basePath, fullPath);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        items.push({ path: relativePath, type: "directory" });
        items.push(...listFilesRecursively(fullPath, basePath));
      } else if (stats.isFile() && entry.endsWith(".md")) {
        items.push({
          path: relativePath,
          type: "file",
          size: stats.size,
        });
      }
    }
  } catch (error) {}

  return items;
}

export async function handleListTool(request: any, outDir: string) {
  const logger = new OperationLogger("list", request, LOG_DIR);

  try {
    const args = listToolSchema.parse(request.arguments);
    const targetPath = args.path ? join(outDir, args.path) : outDir;

    const items = listFilesRecursively(targetPath, outDir);

    const formattedItems = items.map((item) => {
      if (item.type === "directory") {
        return `📁 ${item.path}/`;
      } else {
        const sizeKB = item.size ? Math.round(item.size / 1024) : 0;
        return `📄 ${item.path} (${sizeKB}KB)`;
      }
    });

    const result =
      formattedItems.length > 0
        ? formattedItems.join("\n")
        : "No markdown files found in the specified path.";

    logger.setSuccess();
    return {
      content: [
        {
          type: "text",
          text: result,
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
          text: `Error listing files: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  } finally {
    await logger.flush().catch(console.error);
  }
}
