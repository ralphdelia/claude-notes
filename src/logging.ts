import { resolve } from "path";
import { writeFile, readdir, unlink, stat } from "fs/promises";
import { type SDKMessage } from "@anthropic-ai/claude-code";

const MAX_LOG_FILES = 10;

interface LogEntry {
  id: string;
  timestamp: string;
  operation: string;
  request: any;
  success: boolean;
  error: {
    message: string;
    stack?: string;
    name: string;
  } | null;
  messages: SDKMessage[];
  duration: number;
}

export class OperationLogger {
  private logData: LogEntry;
  private startTime: number;
  private logDir: string;

  constructor(operation: string, request: any, logDir: string) {
    const timestamp = new Date().toISOString();
    this.startTime = Date.now();
    this.logDir = logDir;
    this.logData = {
      id: `${timestamp.replace(/[:.]/g, "-")}_${operation}`,
      timestamp,
      operation,
      request,
      success: false,
      error: null,
      messages: [],
      duration: 0,
    };
  }

  addMessage(message: SDKMessage): void {
    this.logData.messages.push(message);
  }

  setSuccess(): void {
    this.logData.success = true;
    this.logData.duration = Date.now() - this.startTime;
  }

  setError(error: unknown): void {
    this.logData.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "UnknownError",
    };
    this.logData.duration = Date.now() - this.startTime;
  }

  async flush(): Promise<void> {
    const logFile = resolve(this.logDir, `${this.logData.id}.json`);
    await writeFile(logFile, JSON.stringify(this.logData, null, 2));

    // Clean up old log files to maintain the maximum count
    await this.cleanupOldLogs();
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await readdir(this.logDir);
      const logFiles = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => resolve(this.logDir, file));

      if (logFiles.length <= MAX_LOG_FILES) {
        return; // No cleanup needed
      }

      const fileStats = await Promise.all(
        logFiles.map(async (file) => ({
          path: file,
          mtime: (await stat(file)).mtime,
        })),
      );

      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      const filesToDelete = fileStats.slice(
        0,
        fileStats.length - MAX_LOG_FILES,
      );

      await Promise.all(
        filesToDelete.map(({ path }) => unlink(path).catch(() => {})),
      );
    } catch (error) {
      console.error("Log cleanup failed:", error);
    }
  }
}
