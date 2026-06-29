import { afterEach, describe, expect, it, vi } from 'vitest'
import { auditGitHubBounty } from './bountyAudit.js'

describe('auditGitHubBounty', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks() })

  it('returns an evidence-backed no-go for assigned, crowded work', async () => {
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      let body: unknown
      if (url.endsWith('/repos/acme/project')) body = {
        full_name: 'acme/project', html_url: 'https://github.com/acme/project', created_at: '2020-01-01T00:00:00Z',
        pushed_at: new Date().toISOString(), stargazers_count: 500, forks_count: 20, open_issues_count: 5,
        archived: false, fork: false, owner: { login: 'acme' },
      }
      else if (url.includes('/comments')) body = [
        { user: { login: 'alice' }, body: '/attempt #7' },
        { user: { login: 'bob' }, body: '/try' },
        { user: { login: 'paybot' }, body: 'A previous contributor was awarded $50', html_url: 'https://example.test/payment' },
      ]
      else if (url.includes('/timeline')) body = [
        { event: 'cross-referenced', source: { issue: { html_url: 'https://github.com/acme/project/pull/8', pull_request: {} } } },
        { event: 'cross-referenced', source: { issue: { html_url: 'https://github.com/acme/project/pull/9', pull_request: {} } } },
        { event: 'cross-referenced', source: { issue: { html_url: 'https://github.com/acme/project/pull/10', pull_request: {} } } },
      ]
      else body = {
        title: 'Paid fix', state: 'open', html_url: 'https://github.com/acme/project/issues/7',
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', comments: 3,
        assignees: [{ login: 'maintainer-choice' }], labels: [{ name: 'bounty' }], user: { login: 'owner' },
      }
      return { ok: true, json: async () => body } as Response
    }) as typeof fetch

    const report = JSON.parse(await auditGitHubBounty('https://github.com/acme/project/issues/7'))
    expect(report.service).toBe('bounty-audit')
    expect(report.recommendation).toBe('NO_GO')
    expect(report.competition.linkedPullRequests).toBe(3)
    expect(report.paymentEvidence).toHaveLength(1)
    expect(report.risks.map((r: { code: string }) => r.code)).toContain('assigned')
  })

  it('rejects non-issue input before making a request', async () => {
    global.fetch = vi.fn() as typeof fetch
    await expect(auditGitHubBounty('not a github issue')).rejects.toThrow(/GitHub issue URL/)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

