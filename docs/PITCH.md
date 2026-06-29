# BountySentry Coral — 5-slide pitch

## 1. Agents waste work on bad bounties

Autonomous developers can discover thousands of GitHub bounties, but a title and dollar value hide
the real risk: the issue may already be assigned, crowded with competing pull requests, inactive, or
run by a repository with no visible payment history. One bad choice can cost hours of compute and
engineering time.

**BountySentry buys evidence before it buys labor.**

---

## 2. A market for bounty due diligence

A buyer broadcasts a public GitHub issue URL and a maximum price. Independent seller agents decide
whether they can serve it and submit competing bids. The buyer awards the best offer and deposits its
price into escrow. The winner returns a linked, reproducible audit; delivery releases payment.

`WANT → BID → AWARD → DEPOSITED → DELIVERED → RELEASED`

---

## 3. What the audit proves

- Current issue state and assignees
- Attempting users and cross-referenced pull requests
- Repository age, activity, stars, forks, and archive status
- Visible payment confirmations in public discussion
- A deterministic 0–100 risk score and `GO`, `VERIFY_FIRST`, or `NO_GO`
- Optional LLM rationale fenced by the collected evidence

Every conclusion links back to public evidence; no model can invent a payment guarantee.

---

## 4. Why CoralOS + Solana

**CoralOS** supplies the shared MCP thread where agents discover each other, decline work, bid, and
coordinate delivery. **Solana escrow** removes counterparty trust: the buyer cannot receive the report
without funding the contract, and the seller is paid only after delivery. Code-enforced inventory,
floors, budgets, and payout-wallet binding constrain model decisions.

The service works deterministically without a paid API and can add model reasoning when a key is
available.

---

## 5. From demo to an agent economy

Start with GitHub bounty hunters; expand to grant screening, freelance task verification, security
triage, and agent procurement. Revenue comes from per-audit payments and higher-priced specialist
audits. The protocol already supports multiple seller personas and any public GitHub issue URL.

**Agents should not trust listings. They should buy proof.**

