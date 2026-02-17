#!/usr/bin/env bun
/**
 * Quick Deployment Verification Script
 *
 * Run this after deploying refinery to verify MCP server is working.
 * Usage: bun run tests/verify-deployment.ts
 */

const MCP_BASE_URL = process.env.MCP_TEST_URL || 'https://api.shopsavvy.com'
const CALL_TOOL_ENDPOINT = `${MCP_BASE_URL}/mcp/call_tool`

async function verify() {
  console.log('🔍 Verifying ShopSavvy MCP Server Deployment')
  console.log(`   Endpoint: ${MCP_BASE_URL}`)
  console.log('')

  // Test 1: Anonymous access
  console.log('1️⃣  Testing anonymous access...')
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

  const errorStr = typeof listData.error === 'string' ? listData.error : JSON.stringify(listData.error || '')
  if (errorStr.includes('API key required')) {
    console.log('❌ FAILED: Server requires API key')
    console.log('')
    console.log('   The MCP endpoints are not allowing anonymous access.')
    console.log('   Ensure refinery is deployed with the apiKeyAuthMiddleware fix.')
    console.log('')
    process.exit(1)
  }

  const tools = listData.result?.tools || []
  if (tools.length === 0) {
    console.log('❌ FAILED: No tools returned')
    process.exit(1)
  }

  console.log(`   ✅ Anonymous access working (${tools.length} tools available)`)

  // Test 2: Tool call
  console.log('2️⃣  Testing tool call (api_usage)...')
  const usageResponse = await fetch(CALL_TOOL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'api_usage',
        arguments: {}
      }
    })
  })

  const usageData = await usageResponse.json()
  if (usageData.error) {
    console.log(`❌ FAILED: ${usageData.error}`)
    process.exit(1)
  }

  console.log('   ✅ Tool call successful')

  // Test 3: Product search
  console.log('3️⃣  Testing product search...')
  const searchResponse = await fetch(CALL_TOOL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'product_search',
        arguments: { query: 'airpods', limit: 3 }
      }
    })
  })

  const searchData = await searchResponse.json()
  if (searchData.error) {
    console.log(`❌ FAILED: ${searchData.error}`)
    process.exit(1)
  }

  console.log('   ✅ Product search successful')

  // Summary
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ All verification checks passed!')
  console.log('')
  console.log('MCP Server is ready for use:')
  console.log('')
  console.log('  Claude Code:')
  console.log('    claude mcp add --transport sse shopsavvy https://api.shopsavvy.com/mcp/sse')
  console.log('')
  console.log('  Any MCP Agent:')
  console.log('    npx shopsavvy-mcp')
  console.log('')
  console.log('  Run full test suite:')
  console.log('    cd tests && bun test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

verify().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
