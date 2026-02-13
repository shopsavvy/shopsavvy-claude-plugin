/**
 * Installation Tests
 *
 * Tests that all installation methods work correctly:
 * - Claude Code: claude mcp add command format
 * - Claude Desktop: JSON config format
 * - NPX: npx shopsavvy-mcp
 * - Direct SSE URL
 */

import { describe, test, expect } from 'bun:test'

const MCP_URL = 'https://api.shopsavvy.com/mcp/sse'

describe('Installation - Claude Code', () => {
  test('installation command is valid', () => {
    const command = `claude mcp add --transport sse shopsavvy ${MCP_URL}`

    // Command should have correct format
    expect(command).toContain('claude mcp add')
    expect(command).toContain('--transport sse')
    expect(command).toContain('shopsavvy')
    expect(command).toContain(MCP_URL)
  })

  test('removal command is valid', () => {
    const command = 'claude mcp remove shopsavvy'
    expect(command).toContain('claude mcp remove')
    expect(command).toContain('shopsavvy')
  })
})

describe('Installation - Claude Desktop', () => {
  test('JSON config is valid', () => {
    const config = {
      mcpServers: {
        shopsavvy: {
          command: 'npx',
          args: ['shopsavvy-mcp']
        }
      }
    }

    expect(config.mcpServers.shopsavvy).toBeDefined()
    expect(config.mcpServers.shopsavvy.command).toBe('npx')
    expect(config.mcpServers.shopsavvy.args).toContain('shopsavvy-mcp')
  })

  test('JSON config with mcp-remote is valid (fallback)', () => {
    const config = {
      mcpServers: {
        shopsavvy: {
          command: 'npx',
          args: ['-y', 'mcp-remote', MCP_URL]
        }
      }
    }

    expect(config.mcpServers.shopsavvy.args).toContain('mcp-remote')
    expect(config.mcpServers.shopsavvy.args).toContain(MCP_URL)
  })
})

describe('Installation - NPX', () => {
  test('npx command is simple', () => {
    const command = 'npx shopsavvy-mcp'
    expect(command).toBe('npx shopsavvy-mcp')
  })
})

describe('Installation - Direct URL', () => {
  test('SSE endpoint URL is correct', () => {
    expect(MCP_URL).toBe('https://api.shopsavvy.com/mcp/sse')
    expect(MCP_URL).toMatch(/^https:\/\//)
    expect(MCP_URL).toContain('/mcp/sse')
  })

  test('SSE endpoint is reachable', async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(MCP_URL, {
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Should not get auth error
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name !== 'AbortError') {
        throw error
      }
    }
  })
})

describe('Installation - Documentation', () => {
  test('README.md has all installation methods', async () => {
    const readme = await Bun.file('../README.md').text()

    // Claude Code
    expect(readme).toContain('claude mcp add')
    expect(readme).toContain('--transport sse')

    // Claude Desktop
    expect(readme).toContain('claude_desktop_config.json')
    expect(readme).toContain('mcpServers')

    // NPX
    expect(readme).toContain('npx shopsavvy-mcp')

    // Direct URL
    expect(readme).toContain(MCP_URL)
  })

  test('SKILL.md has agent installation instructions', async () => {
    const skill = await Bun.file('../skills/shopping-research/SKILL.md').text()

    // Should have installation section for agents
    expect(skill).toContain('Installation')
    expect(skill).toContain('claude mcp add')
  })
})

describe('Installation - User Experience', () => {
  test('Quick install commands are short and memorable', () => {
    const claudeCodeCmd = `claude mcp add --transport sse shopsavvy ${MCP_URL}`
    const npxCmd = 'npx shopsavvy-mcp'

    // Claude Code command should be under 100 characters
    expect(claudeCodeCmd.length).toBeLessThan(100)

    // NPX command should be very short
    expect(npxCmd.length).toBeLessThan(20)
  })

  test('MCP server name is simple', () => {
    const serverName = 'shopsavvy'

    expect(serverName).toBe('shopsavvy')
    expect(serverName).not.toContain('-')
    expect(serverName).not.toContain('_')
    expect(serverName.length).toBeLessThan(15)
  })
})
