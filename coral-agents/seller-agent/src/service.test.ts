import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { deliverService } from './service.js'

// deliverService routes on the FIRST token of the request when it names a known service, else falls
// back to the SERVICE env. External APIs are mocked so these are fast, offline unit tests.
describe('deliverService routing', () => {
  const realFetch = global.fetch
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.NEWS_API_KEY
    delete process.env.SERVICE
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
  })

  const mockJson = (body: unknown) =>
    (global.fetch = vi.fn(async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch)

  it('routes on the first token, overriding the SERVICE env', async () => {
    process.env.SERVICE = 'jupiter' // env says jupiter…
    mockJson({ solana: { usd: 152.5 } })
    const out = JSON.parse(await deliverService('coingecko')) // …but the request asks for coingecko
    expect(out.coin).toBe('solana')
    expect(out.usd).toBe(152.5)
  })

  it('coingecko picks ethereum when the request mentions eth', async () => {
    mockJson({ ethereum: { usd: 3000 } })
    const out = JSON.parse(await deliverService('coingecko eth price'))
    expect(out.coin).toBe('ethereum')
  })

  it('inference without ANTHROPIC_API_KEY returns a clear error (never crashes)', async () => {
    const out = JSON.parse(await deliverService('inference write a haiku'))
    expect(out.error).toMatch(/ANTHROPIC_API_KEY/)
  })

  it('news without NEWS_API_KEY returns a clear error', async () => {
    const out = JSON.parse(await deliverService('news solana'))
    expect(out.error).toMatch(/NEWS_API_KEY/)
  })

  it('falls back to the SERVICE env when the first token is not a known service', async () => {
    process.env.SERVICE = 'coingecko'
    mockJson({ solana: { usd: 100 } })
    const out = JSON.parse(await deliverService('what is the price right now'))
    expect(out.coin).toBe('solana') // used env=coingecko, not the words in the request
  })

  it('routes bounty-audit requests to the GitHub due-diligence service', async () => {
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      const body = url.endsWith('/repos/acme/project')
        ? { full_name: 'acme/project', html_url: 'https://github.com/acme/project', created_at: '2020-01-01T00:00:00Z', pushed_at: new Date().toISOString(), stargazers_count: 100, forks_count: 5, open_issues_count: 2, archived: false, fork: false, owner: { login: 'acme' } }
        : url.includes('/comments') || url.includes('/timeline')
          ? []
          : { title: 'Small fix', state: 'open', html_url: 'https://github.com/acme/project/issues/1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', comments: 0, assignees: [], labels: [{ name: 'bounty' }], user: { login: 'owner' } }
      return { ok: true, json: async () => body } as Response
    }) as typeof fetch
    const out = JSON.parse(await deliverService('bounty-audit https://github.com/acme/project/issues/1'))
    expect(out.service).toBe('bounty-audit')
    expect(out.target.title).toBe('Small fix')
  })
})
