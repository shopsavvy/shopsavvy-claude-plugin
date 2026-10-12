#!/usr/bin/env node
/**
 * ShopSavvy MCP Server
 *
 * Pre-configured MCP server for ShopSavvy shopping research.
 * Connects to https://api.shopsavvy.com/mcp/sse
 *
 * An API key is required — get one at https://shopsavvy.com/data. Pass it via
 * the SHOPSAVVY_API_KEY env var or --api-key. Without one, every tool call is
 * rejected by the server's auth middleware.
 *
 * Usage:
 *   SHOPSAVVY_API_KEY=ss_live_xxx npx shopsavvy-mcp
 *   npx shopsavvy-mcp --api-key ss_live_xxx
 *
 * For Claude Code:
 *   claude mcp add --env SHOPSAVVY_API_KEY=ss_live_xxx --transport stdio shopsavvy -- npx shopsavvy-mcp
 *
 * For Claude Desktop, add to claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "shopsavvy": {
 *         "command": "npx",
 *         "args": ["shopsavvy-mcp"],
 *         "env": { "SHOPSAVVY_API_KEY": "ss_live_xxx" }
 *       }
 *     }
 *   }
 *
 * Note: mcp-remote (the proxy this wraps) only reads auth from explicit
 * --header CLI args — it does not read arbitrary env vars — so this wrapper
 * builds those --header args itself rather than passing SHOPSAVVY_API_KEY
 * through unchanged.
 */

import { spawn } from "child_process";

const SHOPSAVVY_MCP_URL = "https://api.shopsavvy.com/mcp/sse";
const MCP_CLIENT_BETA_HEADER = "mcp-client-2025-04-04";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
ShopSavvy MCP Server
====================

Connect your AI agent to ShopSavvy: tens of millions of products, prices from tens of thousands of retailers.

An API key is required. Get one at https://shopsavvy.com/data.

Usage:
  npx shopsavvy-mcp [options]

Options:
  --api-key <key>  ShopSavvy API key (or set SHOPSAVVY_API_KEY)
  --help, -h       Show this help message
  --version, -v    Show version number

Installation:

  Claude Code:
    claude mcp add --env SHOPSAVVY_API_KEY=ss_live_xxx --transport stdio shopsavvy -- npx shopsavvy-mcp

  Claude Desktop (add to claude_desktop_config.json):
    {
      "mcpServers": {
        "shopsavvy": {
          "command": "npx",
          "args": ["shopsavvy-mcp"],
          "env": { "SHOPSAVVY_API_KEY": "ss_live_xxx" }
        }
      }
    }

  Other MCP Agents:
    Connect to: ${SHOPSAVVY_MCP_URL} with header Authorization: Bearer <your-key>
    and header anthropic-beta: ${MCP_CLIENT_BETA_HEADER}

Learn more: https://shopsavvy.com/agents
`);
  process.exit(0);
}

// Check for version flag
if (args.includes("--version") || args.includes("-v")) {
  console.log("shopsavvy-mcp v1.0.0");
  process.exit(0);
}

// Resolve the API key from --api-key or SHOPSAVVY_API_KEY. Required — the
// server's mcpConnectorAuthMiddleware rejects unauthenticated tool calls
// beyond the anonymous tier's tight per-IP rate limit.
const apiKeyFlagIndex = args.indexOf("--api-key");
const apiKey = apiKeyFlagIndex !== -1 ? args[apiKeyFlagIndex + 1] : process.env.SHOPSAVVY_API_KEY;

if (!apiKey) {
  console.error(`
ShopSavvy MCP Server: no API key provided.

Get one at https://shopsavvy.com/data, then either:
  SHOPSAVVY_API_KEY=ss_live_xxx npx shopsavvy-mcp
  npx shopsavvy-mcp --api-key ss_live_xxx

Run with --help for full installation instructions.
`);
  process.exit(1);
}

// Launch mcp-remote with the ShopSavvy endpoint, passing auth as explicit
// headers — mcp-remote does not read app-specific env vars on its own.
const child = spawn("npx", [
  "-y", "mcp-remote", SHOPSAVVY_MCP_URL,
  "--header", `Authorization:Bearer ${apiKey}`,
  "--header", `anthropic-beta:${MCP_CLIENT_BETA_HEADER}`
], {
  stdio: "inherit",
  shell: true
});

// Handle process signals
process.on("SIGINT", () => {
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});

child.on("error", (err) => {
  console.error("Failed to start MCP server:", err.message);
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code || 0);
});
