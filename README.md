# Notes MCP Server

A Model Context Protocol (MCP) server that saves information to a notes folder using Claude Code.

## Setup

```bash
bun install
npm run build
```

## Usage

Run as MCP server:
```bash
./build/index.js [-d /path/to/notes]
```

The server provides a `save` tool that processes information through Claude Code and saves it to the specified directory (defaults to `./vault`).
