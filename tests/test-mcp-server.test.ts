/**
 * MCP Server Tests
 *
 * Tests the ShopSavvy MCP server endpoints to ensure:
 * - SSE connection works for anonymous users
 * - All tools are listed correctly
 * - Tool calls return expected results
 * - Rate limiting works as expected
 * - First-run experience is excellent
 */

import { describe, test, expect } from 'bun:test'

const MCP_BASE_URL = process.env.MCP_TEST_URL || 'https://api.shopsavvy.com'
const SSE_ENDPOINT = `${MCP_BASE_URL}/mcp/sse`
const CALL_TOOL_ENDPOINT = `${MCP_BASE_URL}/mcp/call_tool`

// Test timeout for SSE connections
const SSE_TIMEOUT = 10000

// Pre-flight check to see if server supports anonymous access
describe('MCP Server - Pre-flight Check', () => {
  test('server allows anonymous MCP access', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    })

    const data = await response.json()

    // Check if we got the "API key required" error
    const errorStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || '')
    if (errorStr.includes('API key required')) {
      console.error('\n\n⚠️  MCP SERVER NOT DEPLOYED WITH ANONYMOUS ACCESS FIX')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('The MCP endpoints are returning "API key required".')
      console.error('This means refinery needs to be redeployed with the fix in:')
      console.error('  entrypoint-api.ts -> apiKeyAuthMiddleware')
      console.error('')
      console.error('The fix adds: if (req.path.startsWith(\'/mcp/\')) return next()')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      throw new Error('Server requires API key for MCP endpoints - anonymous access not enabled')
    }

    expect(response.status).toBe(200)
    expect(data.result?.tools).toBeDefined()
    expect(data.result.tools.length).toBeGreaterThan(0)
    console.log(`✅ Server supports anonymous MCP access (${data.result.tools.length} tools available)`)
  })
})

describe('MCP Server - Connection', () => {
  test('SSE endpoint accepts anonymous connections', async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SSE_TIMEOUT)

    try {
      const response = await fetch(SSE_ENDPOINT, {
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Should get a 200 response with SSE content type
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/event-stream')
    } catch (error: any) {
      clearTimeout(timeoutId)
      // AbortError is expected when we timeout (SSE stays open)
      if (error.name !== 'AbortError') {
        throw error
      }
    }
  })

  test('call_tool endpoint accepts anonymous connections', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'api_usage',
          arguments: {}
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.result).toBeDefined()
  })
})

describe('MCP Server - Tool Listing', () => {
  test('lists all expected tools', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    const tools = data.result?.tools || []
    const toolNames = tools.map((t: any) => t.name)

    // Product research tools
    expect(toolNames).toContain('product_lookup')
    expect(toolNames).toContain('product_lookup_batch')
    expect(toolNames).toContain('product_search')
    expect(toolNames).toContain('universal_search')

    // Price intelligence tools
    expect(toolNames).toContain('product_offers')
    expect(toolNames).toContain('product_offers_retailer')
    expect(toolNames).toContain('product_price_history')
    expect(toolNames).toContain('product_schedule')
    expect(toolNames).toContain('product_unschedule')
    expect(toolNames).toContain('scheduled_products_list')

    // Expert content tools
    expect(toolNames).toContain('content_best_picks')
    expect(toolNames).toContain('content_tldr_review')
    expect(toolNames).toContain('content_qa_answers')
    expect(toolNames).toContain('content_buying_guide')

    // Utility tools
    expect(toolNames).toContain('api_usage')

    // Should have 15 tools total
    expect(tools.length).toBeGreaterThanOrEqual(15)
  })

  test('each tool has proper schema', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    })

    const data = await response.json()
    const tools = data.result?.tools || []

    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(tool.description).toBeDefined()
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
    }
  })
})

describe('MCP Server - First Run Experience', () => {
  test('server info includes helpful instructions', async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SSE_TIMEOUT)

    let serverInfo: any = null

    try {
      const response = await fetch(SSE_ENDPOINT, {
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal
      })

      const reader = response.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Look for server info event
          const lines = buffer.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.method === 'initialize' || data.serverInfo) {
                  serverInfo = data.serverInfo || data.result?.serverInfo
                  controller.abort()
                  break
                }
              } catch {}
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') throw error
    }

    clearTimeout(timeoutId)

    if (serverInfo) {
      expect(serverInfo.name).toBe('ShopSavvy')
      expect(serverInfo.instructions).toContain('Product Research')
      expect(serverInfo.instructions).toContain('Price Intelligence')
      expect(serverInfo.instructions).toContain('Expert Content')
    }
  })
})

describe('MCP Server - Common Use Cases', () => {
  test('product_search finds products', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'product_search',
          arguments: { query: 'airpods pro', limit: 3 }
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    // Should return product results
    expect(data.result).toBeDefined()
    expect(data.result.content).toBeDefined()
  })

  test('content_best_picks returns buying guides', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'content_best_picks',
          arguments: { query: 'gaming laptop', limit: 3 }
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.result).toBeDefined()
  })

  test('content_buying_guide returns timing advice', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'content_buying_guide',
          arguments: { query: 'tv' }
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.result).toBeDefined()
  })

  test('api_usage returns usage stats', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'api_usage',
          arguments: {}
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.result).toBeDefined()

    // Should show rate limit info
    const content = JSON.stringify(data.result)
    expect(content).toContain('rate')
  })
})

describe('MCP Server - Error Handling', () => {
  test('handles unknown tool gracefully', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    // Should return error in JSON-RPC format
    expect(data.error || data.result?.isError).toBeTruthy()
  })

  test('handles missing required arguments', async () => {
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'product_lookup',
          arguments: {} // Missing required 'identifier' argument
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    // Should indicate error or return helpful message
    const content = JSON.stringify(data)
    expect(content.toLowerCase()).toMatch(/error|required|missing|invalid/)
  })
})

describe('MCP Server - Rate Limiting', () => {
  test('anonymous users have rate limits', async () => {
    // Make a request and check for rate limit headers or response info
    const response = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'api_usage',
          arguments: {}
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    // Response should include rate limit info
    const content = JSON.stringify(data)
    expect(content).toMatch(/remaining|limit|anonymous/i)
  })
})
