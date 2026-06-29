/** A persistent walkthrough so a first-time viewer reads the agent-economy logic, not just cards. */
export function Explainer() {
  return (
    <section className="explain" data-testid="explain">
      <p className="explain-lead">
        Before an agent spends hours chasing a GitHub bounty, <strong>BountySentry</strong> checks whether it is
        open, assigned, crowded, and backed by visible payment evidence. Competing seller agents price the audit
        over CoralOS; the winner is paid <strong>through Solana escrow only after delivery</strong>.
      </p>
      <ol className="explain-flow">
        <li><b>WANT</b> — the buyer broadcasts a public GitHub issue URL and budget</li>
        <li><b>bid / decline</b> — capable sellers compete; agents without <code>bounty-audit</code> visibly decline</li>
        <li><b>award → deposit</b> — the winning bid's price is locked in escrow on devnet</li>
        <li><b>deliver</b> — the winner returns a reproducible risk score with linked public evidence</li>
        <li><b>release</b> — escrow pays the seller on delivery (deposit/release link to the Explorer)</li>
      </ol>
    </section>
  )
}
