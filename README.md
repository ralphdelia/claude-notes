# Notes MCP Server

A Model Context Protocol (MCP) server that provides intelligent note-taking capabilities for Claude Desktop. This server enables Claude to save, list, and read notes from a structured knowledge vault, transforming conversations into a persistent knowledge base.

## Features

- **Save Tool**: Intelligently organizes and saves information from conversations into Markdown files
- **List Tool**: Browse files and directories in your knowledge vault
- **Read Tool**: Access existing notes to provide context for conversations
- **AI-Powered Organization**: Uses Claude Code to automatically structure and cross-reference content
- **Obsidian Compatible**: Creates a vault structure compatible with Obsidian and other Markdown tools

## Setup

### 1. Install Dependencies and Build

```bash
bun install
npm run build
```

### 2. Configure Claude Desktop

Add this server to your Claude Desktop configuration file. The configuration file is located at:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Configuration Example

```json
{
  "mcpServers": {
    "notes-server": {
      "command": "/Users/your-username/.bun/bin/bun",
      "args": ["run", "/path/to/notes-mcp/build/index.js", "-d", "/path/to/your/vault"],
      "cwd": "/path/to/notes-mcp",
      "env": {
        "PATH": "/Users/your-username/.bun/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

#### Configuration Options

- **command**: Path to your Bun executable (find with `which bun`)
- **args**:
  - `"run"`: Tells Bun to execute the script
  - `"/path/to/notes-mcp/build/index.js"`: Path to the built server
  - `"-d"`: Optional flag to specify vault directory
  - `"/path/to/your/vault"`: Your desired notes directory (defaults to `./vault`)
- **cwd**: Working directory for the server (should be the project root)
- **env.PATH**: Include paths to Bun and other required executables

#### Alternative: Using Node.js

If you prefer Node.js over Bun:

```json
{
  "mcpServers": {
    "notes-server": {
      "command": "node",
      "args": ["/path/to/notes-mcp/build/index.js", "-d", "/path/to/your/vault"],
      "cwd": "/path/to/notes-mcp"
    }
  }
}
```

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the MCP server.

## Usage

Once configured, Claude Desktop will have access to three new tools:

### Save Information
```
User: "Save this research about quantum computing applications in healthcare"
Claude: [Uses the save tool to organize content into appropriate files]
```

### List Files
```
User: "What notes do I have about programming?"
Claude: [Uses the list tool to show relevant files and directories]
```

### Read Existing Notes
```
User: "What did I save about React hooks?"
Claude: [Uses the read tool to access and reference existing notes]
```

## Troubleshooting

#### Claude Desktop Logs
Claude Desktop logs MCP server output and errors. You can find these logs at:

**macOS**: `~/Library/Logs/Claude/mcp-server-notes-server.log`
**Windows**: `%LOCALAPPDATA%\Claude\logs\mcp-server-notes-server.log`
**Linux**: `~/.local/share/Claude/logs/mcp-server-notes-server.log`


#### Server Operation Logs
This MCP server also creates its own detailed operation logs in the `logs/` directory within your project:

```bash
# View recent operation logs
ls -la /path/to/notes-mcp/logs/
```



### Environment Variables
If you need to set environment variables (like `ANTHROPIC_API_KEY`), add them to the `env` section of your configuration.
