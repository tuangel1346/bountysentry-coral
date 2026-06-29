interface AuditRisk { severity: 'high' | 'medium' | 'low'; code: string; evidence: string }

interface BountyAudit {
  service: 'bounty-audit'
  target?: { url?: string; title?: string; state?: string; assignees?: string[] }
  repository?: { name?: string; url?: string; stars?: number; ageDays?: number }
  competition?: { attemptingUsers?: number; linkedPullRequests?: number }
  riskScore?: number
  recommendation?: 'GO' | 'VERIFY_FIRST' | 'NO_GO'
  risks?: AuditRisk[]
  aiSummary?: { rationale?: string; nextStep?: string }
}

export function BountyAuditPanel({ audit }: { audit: BountyAudit }) {
  const score = Math.max(0, Math.min(100, Number(audit.riskScore ?? 0)))
  const recommendation = audit.recommendation ?? 'VERIFY_FIRST'
  return (
    <section className="audit-panel" data-testid="bounty-audit">
      <header className="audit-head">
        <div>
          <span className={`audit-verdict verdict-${recommendation.toLowerCase()}`}>{recommendation.replace('_', ' ')}</span>
          <h2>{audit.target?.title ?? 'GitHub bounty audit'}</h2>
          <a href={audit.target?.url} target="_blank" rel="noreferrer">{audit.repository?.name ?? 'view evidence source'}</a>
        </div>
        <div className="audit-score"><strong>{score}</strong><span>/100 risk</span></div>
      </header>
      <div className="risk-track"><div style={{ width: `${score}%` }} /></div>
      <div className="audit-stats">
        <span><b>{audit.competition?.attemptingUsers ?? 0}</b> attempting</span>
        <span><b>{audit.competition?.linkedPullRequests ?? 0}</b> linked PRs</span>
        <span><b>{audit.repository?.stars ?? 0}</b> stars</span>
      </div>
      {(audit.risks?.length ?? 0) > 0 && (
        <ul className="audit-risks">
          {audit.risks?.slice(0, 5).map((risk) => (
            <li key={risk.code} className={`risk-${risk.severity}`}><b>{risk.code}</b> — {risk.evidence}</li>
          ))}
        </ul>
      )}
      {audit.aiSummary?.nextStep && <p className="audit-next"><b>Next:</b> {audit.aiSummary.nextStep}</p>}
    </section>
  )
}
