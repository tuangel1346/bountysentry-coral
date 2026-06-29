import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { RoundCard } from './RoundCard'
import { settledRound } from '../../tests/fixtures'

afterEach(cleanup)

describe('RoundCard', () => {
  it('renders the want, both bids, and the declined seller', () => {
    render(<RoundCard round={settledRound} />)
    expect(screen.getByTestId('round').getAttribute('data-round')).toBe('1')
    expect(screen.getAllByTestId('bid')).toHaveLength(2)
    expect(screen.getByTestId('declined').getAttribute('data-seller')).toBe('seller-lazy')
  })

  it('highlights the winning bid with a "won" tag', () => {
    render(<RoundCard round={settledRound} />)
    const winner = screen.getAllByTestId('bid').find((el) => el.getAttribute('data-seller') === 'seller-premium')!
    expect(winner.className).toContain('bid-won')
    expect(within(winner).getByText('won')).toBeTruthy()
  })

  it('shows the LLM award reasoning', () => {
    render(<RoundCard round={settledRound} />)
    expect(screen.getByTestId('reason').textContent).toContain('verified data worth the premium')
  })

  it('links deposit + release to the devnet Explorer with the right sigs', () => {
    render(<RoundCard round={settledRound} />)
    const links = screen.getAllByTestId('settle') as HTMLAnchorElement[]
    expect(links).toHaveLength(2)
    expect(links.some((a) => a.href.includes('3PMa9LBZn7VEMD1qZnmr') && a.href.includes('cluster=devnet'))).toBe(true)
  })

  it('shows the status pill as settled', () => {
    render(<RoundCard round={settledRound} />)
    expect(screen.getByTestId('status').textContent).toBe('settled')
  })

  it('renders an evidence-first bounty audit instead of raw JSON', () => {
    render(<RoundCard round={{
      ...settledRound,
      want: { service: 'bounty-audit', arg: 'https://github.com/acme/repo/issues/7', budgetSol: 0.001 },
      delivered: {
        raw: 'DELIVERED round=1 data={...}',
        data: {
          service: 'bounty-audit',
          target: { title: 'Pay for the parser', url: 'https://github.com/acme/repo/issues/7' },
          repository: { name: 'acme/repo', stars: 42 },
          competition: { attemptingUsers: 3, linkedPullRequests: 2 },
          riskScore: 45,
          recommendation: 'VERIFY_FIRST',
          risks: [{ severity: 'high', code: 'competition', evidence: 'Three active attempts.' }],
        },
      },
    }} />)
    expect(screen.getByTestId('bounty-audit').textContent).toContain('VERIFY FIRST')
    expect(screen.getByTestId('bounty-audit').textContent).toContain('45/100 risk')
    expect(screen.queryByText('DELIVERED round=1 data={...}')).toBeNull()
  })
})
