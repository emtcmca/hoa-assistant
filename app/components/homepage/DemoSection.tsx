'use client'

import { useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function DemoSection() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)

  return (
    <section ref={ref} id="demo" style={{
      background: 'var(--bg)',
      padding: '100px var(--pad)',
    }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div className="reveal" style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '56px 48px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '16px',
          }}>
            Try it now
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.2,
            marginBottom: '16px',
          }}>
            See BoardPath in action.
          </h2>
          <p style={{
            fontSize: '15px',
            color: 'var(--text-m)',
            lineHeight: 1.7,
            marginBottom: '36px',
            maxWidth: '420px',
            margin: '0 auto 36px',
          }}>
            Ask a real governing document question and see exactly how BoardPath finds, interprets, and cites the answer.
          </p>
          <a href="/meeting-mode" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-navy)',
            color: '#F8F6F1',
            fontSize: '15px',
            fontWeight: 500,
            padding: '15px 36px',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-navy2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-navy)')}
          >
            Try the interactive demo
            <span style={{ fontSize: '18px' }}>→</span>
          </a>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-d)',
            marginTop: '16px',
          }}>
            No account required · Uses sample governing documents
          </p>
        </div>
      </div>
    </section>
  )
}