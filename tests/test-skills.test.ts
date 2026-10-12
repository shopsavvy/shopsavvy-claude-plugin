/**
 * Skill pack checks
 *
 * Every skills/<name>/SKILL.md must:
 * - start with frontmatter whose `name` matches its directory and has a `description`
 * - stay under 500 lines (Claude loads the whole file into context)
 * - make no retired coverage claims (they were wrong: the catalog is tens of millions of
 *   products and coverage is "tens of thousands of retailers", never a specific count)
 * - only name MCP tools the ShopSavvy server actually serves
 * The data skills must also carry the "never fabricate" rule and the key-handling rule.
 */

import { describe, test, expect } from 'bun:test'
import { readdirSync } from 'fs'
import { join } from 'path'

const SKILLS_DIR = join(import.meta.dir, '..', 'skills')

// The tools the hosted server returns from tools/list.
const MCP_TOOLS = [
  'product_lookup', 'product_lookup_batch', 'product_search', 'product_offers',
  'product_offers_retailer', 'product_price_history', 'product_schedule', 'product_unschedule',
  'scheduled_products_list', 'api_usage', 'content_best_picks', 'content_tldr_review',
  'content_qa_answers', 'content_buying_guide', 'universal_search'
]

const RETIRED_CLAIMS = [
  /100M\+/i, /100 million/i, /40,000\+/, /70,000\+/, /70K\+/i, /100,000\+ retailers/i,
  /99\.9%/, /billions of prices/i, /world'?s most comprehensive/i, /free (api )?key/i
]

const DATA_SKILLS = ['shopsavvy-data-api', 'competitor-price-report', 'price-history-export', 'retailer-coverage-check']

const skillNames = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const skillText = async (name: string) => Bun.file(join(SKILLS_DIR, name, 'SKILL.md')).text()

describe('skill pack', () => {
  test('ships the consumer skill and the four data skills', () => {
    expect(skillNames.sort()).toEqual(['shopping-research', ...DATA_SKILLS].sort())
  })

  for (const name of skillNames) {
    describe(name, () => {
      test('frontmatter name matches the directory and has a description', async () => {
        const text = await skillText(name)
        const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/)
        expect(frontmatter).not.toBeNull()
        expect(frontmatter![1]).toMatch(new RegExp(`^name: ${name}$`, 'm'))
        const description = frontmatter![1].match(/^description: (.+)$/m)
        expect(description).not.toBeNull()
        expect(description![1].length).toBeGreaterThan(80)
        expect(description![1].length).toBeLessThan(1024)
      })

      test('is under 500 lines', async () => {
        expect((await skillText(name)).split('\n').length).toBeLessThan(500)
      })

      test('makes no retired coverage claims', async () => {
        const text = await skillText(name)
        for (const claim of RETIRED_CLAIMS) {
          expect(text).not.toMatch(claim)
        }
      })

      test('names only real MCP tools', async () => {
        const text = await skillText(name)
        const named = [...text.matchAll(/`((?:product|content|scheduled|api|universal)_[a-z_]+)`/g)].map((match) => match[1])
        for (const tool of named) {
          expect(MCP_TOOLS).toContain(tool)
        }
      })
    })
  }

  for (const name of DATA_SKILLS) {
    test(`${name} forbids fabrication and protects the key`, async () => {
      const text = await skillText(name)
      expect(text).toMatch(/never fabricate/i)
      expect(text).toMatch(/report zero as zero/i)
      expect(text).toContain('SHOPSAVVY_API_KEY')
      expect(text).toMatch(/never print/i)
    })
  }

  test('plugin manifest and READMEs make no retired coverage claims', async () => {
    const files = ['../.claude-plugin/plugin.json', '../README.md', '../desktop-bundle/manifest.json', '../npm-package/README.md', '../npm-package/package.json', '../npm-package/src/index.ts']
    for (const file of files) {
      const text = await Bun.file(join(import.meta.dir, file)).text()
      for (const claim of RETIRED_CLAIMS) {
        expect(text).not.toMatch(claim)
      }
    }
  })
})
