'use client'

import { useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function StatBand() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)

  const stats = [
    { value: '~5 sec', label: 'Average time to a cited answer' },
    { value: '5 layers', label: 'Document hierarchy understood' },
    { value: '0 guesses', label: 'Every answer grounded in your docs' },
  ]

  return (
    <section ref={ref} style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '48px var(--pad)',
    }}>
      <div style={{
        maxWidth: 'var(--max)',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '40px',
      }} className="stat-grid">
        {stats.map((stat, i) => (
          <div key={i} className="reveal" style={{
            textAlign: 'center',
            transitionDelay: `${i * 0.1}s`,
          }}>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(36px, 4vw, 52px)',
              fontWeight: 500,
              color: 'var(--text)',
              lineHeight: 1,
              marginBottom: '8px',
              letterSpacing: '0.01em',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-d)',
              fontWeight: 400,
              letterSpacing: '0.02em',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .stat-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </section>
  )
}