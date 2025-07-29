import { resolve } from "path";
import { writeFile } from "fs/promises";
import { type SDKMessage } from "@anthropic-ai/claude-code";

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
      id: `${operation}_${timestamp.replace(/[:.]/g, "-")}`,
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
  }
}