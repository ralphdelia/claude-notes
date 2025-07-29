import { parseArgs } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseCliArgs() {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        d: { type: "string" as const },
      },
      allowPositionals: true,
      strict: false,
    });
    return values;
  } catch (error) {
    // If parsing fails, return empty values to use defaults
    return {};
  }
}

function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function initializeDirectories() {
  const args = parseCliArgs();
  
  const OUT_DIR = (args.d && typeof args.d === 'string') ? resolve(args.d) : resolve(__dirname, "..", "vault");
  const LOG_DIR = resolve(__dirname, "..", "logs");
  
  ensureDirectoryExists(OUT_DIR);
  ensureDirectoryExists(LOG_DIR);
  
  return { OUT_DIR, LOG_DIR };
}

export const { OUT_DIR, LOG_DIR } = initializeDirectories();