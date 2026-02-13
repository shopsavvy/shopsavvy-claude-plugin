#!/usr/bin/env node
/**
 * ShopSavvy MCP Server
 *
 * Pre-configured MCP server for ShopSavvy shopping research.
 * Connects to https://api.shopsavvy.com/mcp/sse
 *
 * Usage:
 *   npx shopsavvy-mcp
 *
 * For Claude Code:
 *   claude mcp add shopsavvy -- npx shopsavvy-mcp
 *
 * For Claude Desktop, add to claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "shopsavvy": {
 *         "command": "npx",
 *         "args": ["shopsavvy-mcp"]
 *       }
 *     }
 *   }
 */

import { spawn } from "child_process";

const SHOPSAVVY_MCP_URL = "https://api.shopsavvy.com/mcp/sse";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
ShopSavvy MCP Server
====================

Connect your AI agent to ShopSavvy's database of 100M+ products across 40,000+ retailers.

Usage:
  npx shopsavvy-mcp [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version number

Installation:

  Claude Code:
    claude mcp add shopsavvy -- npx shopsavvy-mcp

  Claude Desktop (add to claude_desktop_config.json):
    {
      "mcpServers": {
        "shopsavvy": {
          "command": "npx",
          "args": ["shopsavvy-mcp"]
        }
      }
    }

  Other MCP Agents:
    Connect to: ${SHOPSAVVY_MCP_URL}

Learn more: https://shopsavvy.com/agents
`);
  process.exit(0);
}

// Check for version flag
if (args.includes("--version") || args.includes("-v")) {
  console.log("shopsavvy-mcp v1.0.0");
  process.exit(0);
}

// Launch mcp-remote with the ShopSavvy endpoint
const child = spawn("npx", ["-y", "mcp-remote", SHOPSAVVY_MCP_URL], {
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
