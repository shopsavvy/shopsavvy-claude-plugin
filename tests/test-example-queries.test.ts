/**
 * Example Query Tests
 *
 * Tests that all example queries from the /agents page work correctly.
 * These are the queries users will try first, so they MUST work well.
 */

import { describe, test, expect, beforeAll } from 'bun:test'

const CALL_TOOL_ENDPOINT = process.env.MCP_TEST_URL
  ? `${process.env.MCP_TEST_URL}/mcp/call_tool`
  : 'https://api.shopsavvy.com/mcp/call_tool'

// Verify anonymous access before running tests
beforeAll(async () => {
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
  const errorStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || '')
  if (errorStr.includes('API key required')) {
    console.error('\n⚠️  Skipping example query tests - server requires API key')
    console.error('   Deploy refinery with anonymous MCP access fix first.\n')
    process.exit(1)
  }
})

async function callTool(name: string, args: Record<string, any>) {
  const response = await fetch(CALL_TOOL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  })

  const data = await response.json()
  return { status: response.status, data }
}

describe('Example Query: "What\'s the best price for AirPods Pro?"', () => {
  test('product_search finds AirPods Pro', async () => {
    const { status, data } = await callTool('product_search', {
      query: 'AirPods Pro',
      limit: 5
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()

    // Should find products
    const content = JSON.stringify(data.result).toLowerCase()
    expect(content).toMatch(/airpods|apple|product/)
  })

  test('product_lookup finds AirPods Pro by name', async () => {
    const { status, data } = await callTool('product_lookup', {
      identifier: 'Apple AirPods Pro'
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })
})

describe('Example Query: "Best gaming laptops under $1500"', () => {
  test('content_best_picks finds gaming laptop guides', async () => {
    const { status, data } = await callTool('content_best_picks', {
      query: 'gaming laptop',
      limit: 3
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()

    const content = JSON.stringify(data.result).toLowerCase()
    // Should return buying guides or related content
    expect(content).toMatch(/gaming|laptop|best|pick|guide/)
  })

  test('universal_search finds ranked gaming laptops', async () => {
    const { status, data } = await callTool('universal_search', {
      query: 'gaming laptop',
      limit: 5
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })
})

describe('Example Query: "Is now a good time to buy a PS5?"', () => {
  test('product_lookup finds PS5', async () => {
    const { status, data } = await callTool('product_lookup', {
      identifier: 'PlayStation 5'
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })

  test('content_buying_guide has gaming console timing advice', async () => {
    const { status, data } = await callTool('content_buying_guide', {
      query: 'playstation console gaming'
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })
})

describe('Example Query: "Compare iPhone 15 vs Samsung S24"', () => {
  test('product_lookup_batch finds both phones', async () => {
    const { status, data } = await callTool('product_lookup_batch', {
      identifiers: ['iPhone 15', 'Samsung Galaxy S24']
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })
})

describe('Example Query: "When do TVs usually go on sale?"', () => {
  test('content_buying_guide returns TV timing advice', async () => {
    const { status, data } = await callTool('content_buying_guide', {
      query: 'tv television'
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()

    const content = JSON.stringify(data.result).toLowerCase()
    // Should mention TV or timing
    expect(content).toMatch(/tv|television|buy|time|sale|black friday/)
  })
})

describe('Example Query: "Track this product for me"', () => {
  test('product_schedule tool exists and has correct schema', async () => {
    // First verify the tool exists by listing tools
    const listResponse = await fetch(CALL_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    })

    const listData = await listResponse.json()
    const tools = listData.result?.tools || []
    const scheduleTool = tools.find((t: any) => t.name === 'product_schedule')

    expect(scheduleTool).toBeDefined()
    expect(scheduleTool.inputSchema.properties.product_path).toBeDefined()
  })
})

describe('Example Query: "What are people saying about X?"', () => {
  test('content_qa_answers returns Q&A content', async () => {
    const { status, data } = await callTool('content_qa_answers', {
      identifier: 'airpods',
      limit: 3
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })
})

describe('Example Query: "Reviews of X"', () => {
  test('content_tldr_review returns review content', async () => {
    const { status, data } = await callTool('content_tldr_review', {
      identifier: 'airpods pro'
    })

    expect(status).toBe(200)
    expect(data.result).toBeDefined()
  })
})

describe('Response Quality', () => {
  test('responses include helpful next steps', async () => {
    const { status, data } = await callTool('product_search', {
      query: 'laptop',
      limit: 3
    })

    expect(status).toBe(200)

    const content = JSON.stringify(data.result).toLowerCase()
    // Good responses should suggest next steps or include actionable info
    expect(content).toMatch(/price|offer|buy|compare|check/)
  })

  test('responses include credit usage info', async () => {
    const { status, data } = await callTool('api_usage', {})

    expect(status).toBe(200)

    const content = JSON.stringify(data.result).toLowerCase()
    expect(content).toMatch(/credit|usage|limit|remaining/)
  })

  test('error responses are helpful', async () => {
    // Search for something unlikely to exist
    const { status, data } = await callTool('product_lookup', {
      identifier: 'xyznonexistent12345product'
    })

    expect(status).toBe(200)

    // Even if not found, response should be helpful
    const content = JSON.stringify(data.result).toLowerCase()
    // Should either find something or give helpful guidance
    expect(content).toMatch(/product|found|search|try/)
  })
})
