/**
 * Installation tests
 *
 * Read the files Claude Code actually loads when the plugin is installed
 * (.claude-plugin/plugin.json, .claude-plugin/marketplace.json, .mcp.json) and the
 * README a user follows, and check them against the live server:
 * - the plugin needs no API key: the key option is optional, defaults to empty, and an
 *   empty "Bearer" header is served anonymously by https://api.shopsavvy.com/mcp
 * - the MCP server is the Streamable HTTP endpoint, declared the way the directory
 *   validator and Claude Code require (type + absolute https url)
 * - every install command the README prints points at something that exists
 */

import { describe, test, expect } from 'bun:test'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')
const MCP_URL = 'https://api.shopsavvy.com/mcp'

const json = async (path: string) => Bun.file(join(ROOT, path)).json()
const text = async (path: string) => Bun.file(join(ROOT, path)).text()

describe('plugin manifest', () => {
  test('the API key is optional and defaults to empty', async () => {
    const manifest = await json('.claude-plugin/plugin.json')
    expect(manifest.name).toBe('shopsavvy')
    const apiKey = manifest.userConfig?.api_key
    expect(apiKey).toBeDefined()
    expect(apiKey.required).toBe(false)
    expect(apiKey.default).toBe('')
    expect(apiKey.sensitive).toBe(true)
    // No other option may be required either: install must never block on input.
    for (const [key, option] of Object.entries<any>(manifest.userConfig ?? {})) {
      expect({ key, required: option.required === true }).toEqual({ key, required: false })
    }
  })

  test('directory listing fields are https URLs and the icon is in the plugin', async () => {
    const manifest = await json('.claude-plugin/plugin.json')
    for (const field of ['homepage', 'documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl']) {
      expect({ field, https: String(manifest[field]).startsWith('https://') }).toEqual({ field, https: true })
    }
    expect(await Bun.file(join(ROOT, manifest.icon)).exists()).toBe(true)
  })

  test('the marketplace lists this plugin from the repo root under the same name', async () => {
    const marketplace = await json('.claude-plugin/marketplace.json')
    expect(marketplace.name).toBe('shopsavvy')
    expect(marketplace.plugins).toEqual([expect.objectContaining({ name: 'shopsavvy', source: './' })])
  })
})

describe('.mcp.json', () => {
  test('one remote server on the Streamable HTTP endpoint, key only via user_config', async () => {
    const config = await json('.mcp.json')
    const servers = Object.entries<any>(config.mcpServers)
    expect(servers.length).toBe(1)
    const [name, server] = servers[0]
    expect(name).toBe('shopsavvy')
    expect(server.type).toBe('http')
    expect(server.url).toBe(MCP_URL)
    // The only header is the optional key, referenced (never a literal credential).
    expect(server.headers).toEqual({ Authorization: 'Bearer ${user_config.api_key}' })
  })
})

describe('README install paths', () => {
  test('shows the marketplace install, the no-key Claude Code command and the server URL', async () => {
    const readme = await text('README.md')
    expect(readme).toContain('/plugin install shopsavvy --marketplace shopsavvy/shopsavvy-claude-plugin')
    expect(readme).toContain('claude plugin marketplace add shopsavvy/shopsavvy-claude-plugin')
    expect(readme).toContain(`claude mcp add --transport http shopsavvy ${MCP_URL}`)
    expect(readme).toContain(MCP_URL)
  })

  test('advertises no package or bundle that is not published', async () => {
    const readme = await text('README.md')
    // shopsavvy-mcp was never on npm and no .mcpb is served; the local package is @shopsavvy/mcp-server.
    expect(readme).not.toMatch(/npx (-y )?shopsavvy-mcp\b/)
    expect(readme).not.toContain('.mcpb')
    expect(readme).not.toContain('anthropic-beta')
  })

  test('says plainly that no API key is needed', async () => {
    const readme = await text('README.md')
    expect(readme).toMatch(/no API key/i)
    expect(readme).not.toMatch(/API key[^.\n]*required/i)
  })
})

describe('live server accepts what the plugin sends', () => {
  const toolsList = (headers: Record<string, string>) => fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })

  test('no Authorization header: tools/list answers anonymously', async () => {
    const response = await toolsList({})
    expect(response.status).toBe(200)
    const data: any = await response.json()
    expect(data.result.tools.length).toBeGreaterThan(0)
  })

  test('an empty key ("Bearer", what Claude Code sends with the default) is served anonymously too', async () => {
    const response = await toolsList({ Authorization: 'Bearer' })
    expect(response.status).toBe(200)
    const data: any = await response.json()
    expect(data.result.tools.length).toBeGreaterThan(0)
  })
})
