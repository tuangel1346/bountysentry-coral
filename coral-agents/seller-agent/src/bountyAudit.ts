import { complete, parseJsonReply } from '@pay/agent-runtime'

interface GitHubIssue {
  title: string
  state: string
  html_url: string
  created_at: string
  updated_at: string
  comments: number
  assignees?: Array<{ login: string }>
  labels?: Array<{ name: string }>
  user?: { login: string }
  pull_request?: unknown
}

interface GitHubRepo {
  full_name: string
  html_url: string
  created_at: string
  pushed_at: string
  stargazers_count: number
  forks_count: number
  archived: boolean
  fork: boolean
  open_issues_count: number
  owner: { login: string }
}

interface GitHubComment { user?: { login: string; type?: string }; body?: string; html_url?: string }
interface TimelineEvent { event?: string; source?: { issue?: { html_url?: string; pull_request?: unknown } } }

const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'BountySentryAI/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
}

function parseIssueUrl(raw: string): { owner: string; repo: string; number: number; url: string } {
  const decoded = decodeURIComponent(raw.trim())
  const match = decoded.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i)
  if (!match) throw new Error('expected a public GitHub issue URL')
  return { owner: match[1], repo: match[2], number: Number(match[3]), url: `https://github.com/${match[1]}/${match[2]}/issues/${match[3]}` }
}

async function github<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: API_HEADERS })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`)
  return res.json() as Promise<T>
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000))
}

export async function auditGitHubBounty(rawUrl: string): Promise<string> {
  const ref = parseIssueUrl(rawUrl)
  const base = `/repos/${ref.owner}/${ref.repo}`
  const [issue, repo, comments, timeline] = await Promise.all([
    github<GitHubIssue>(`${base}/issues/${ref.number}`),
    github<GitHubRepo>(base),
    github<GitHubComment[]>(`${base}/issues/${ref.number}/comments?per_page=100`),
    github<TimelineEvent[]>(`${base}/issues/${ref.number}/timeline?per_page=100`),
  ])
  if (issue.pull_request) throw new Error('the supplied URL resolves to a pull request, not an issue')

  const attemptPattern = /(?:^|\s)\/(?:try|attempt|claim)\b|github\.com\/[^\s]+\/pull\/\d+/i
  const paymentPattern = /\b(?:paid|payout|awarded|rewarded|payment sent)\b/i
  const attemptUsers = new Set(comments.filter(c => attemptPattern.test(c.body ?? '')).map(c => c.user?.login).filter(Boolean))
  const linkedPulls = new Set(
    timeline
      .filter(e => e.event === 'cross-referenced' && e.source?.issue?.pull_request)
      .map(e => e.source?.issue?.html_url)
      .filter(Boolean),
  )
  const paymentEvidence = comments
    .filter(c => paymentPattern.test(c.body ?? ''))
    .slice(0, 5)
    .map(c => ({ by: c.user?.login, url: c.html_url }))

  const repoAgeDays = daysSince(repo.created_at)
  const inactivityDays = daysSince(repo.pushed_at)
  const assignees = (issue.assignees ?? []).map(a => a.login)
  const labels = (issue.labels ?? []).map(l => l.name)
  const risks: Array<{ severity: 'high' | 'medium' | 'low'; code: string; evidence: string }> = []
  let riskScore = 0
  if (issue.state !== 'open') { riskScore += 60; risks.push({ severity: 'high', code: 'closed', evidence: 'Issue is not open.' }) }
  if (assignees.length) { riskScore += 30; risks.push({ severity: 'high', code: 'assigned', evidence: `Assigned to ${assignees.join(', ')}.` }) }
  const competition = Math.max(attemptUsers.size, linkedPulls.size)
  if (competition >= 3) { riskScore += 30; risks.push({ severity: 'high', code: 'competition', evidence: `${attemptUsers.size} attempting users and ${linkedPulls.size} linked PRs detected.` }) }
  else if (competition > 0) { riskScore += 15; risks.push({ severity: 'medium', code: 'competition', evidence: `${attemptUsers.size} attempting users and ${linkedPulls.size} linked PRs detected.` }) }
  if (repo.fork) { riskScore += 25; risks.push({ severity: 'high', code: 'fork', evidence: 'Repository is a fork.' }) }
  if (repoAgeDays < 180) { riskScore += 15; risks.push({ severity: 'medium', code: 'young-repo', evidence: `Repository is ${repoAgeDays} days old.` }) }
  if (repo.stargazers_count < 10) { riskScore += 15; risks.push({ severity: 'medium', code: 'low-signal', evidence: `Repository has ${repo.stargazers_count} stars.` }) }
  if (repo.archived || inactivityDays > 180) { riskScore += 25; risks.push({ severity: 'high', code: 'inactive', evidence: repo.archived ? 'Repository is archived.' : `No push for ${inactivityDays} days.` }) }
  if (!paymentEvidence.length) { riskScore += 10; risks.push({ severity: 'low', code: 'no-payment-evidence', evidence: 'No payment confirmation was visible in the first 100 comments.' }) }
  riskScore = Math.min(100, riskScore)
  const recommendation = riskScore >= 60 ? 'NO_GO' : riskScore >= 30 ? 'VERIFY_FIRST' : 'GO'

  let aiSummary: { rationale: string; nextStep: string } | undefined
  if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      aiSummary = parseJsonReply<{ rationale: string; nextStep: string }>(await complete({
        system: 'You are a cautious open-source bounty analyst. Use only supplied evidence. Never promise payment. Reply JSON {"rationale":string,"nextStep":string}.',
        user: JSON.stringify({ title: issue.title, recommendation, riskScore, risks, competition, labels }),
        maxTokens: 180,
      })) ?? undefined
    } catch { /* deterministic report remains complete */ }
  }

  return JSON.stringify({
    service: 'bounty-audit',
    version: 1,
    generatedAt: new Date().toISOString(),
    target: { url: ref.url, title: issue.title, state: issue.state, author: issue.user?.login, labels, assignees },
    repository: { name: repo.full_name, url: repo.html_url, ageDays: repoAgeDays, stars: repo.stargazers_count, forks: repo.forks_count, openIssues: repo.open_issues_count, archived: repo.archived, isFork: repo.fork, inactivityDays },
    competition: { attemptingUsers: attemptUsers.size, linkedPullRequests: linkedPulls.size },
    paymentEvidence,
    riskScore,
    recommendation,
    risks,
    aiSummary,
    disclaimer: 'Public-source due diligence, not a payment guarantee or financial advice.',
  })
}

