'use client'

import { useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function FinalCTA() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)

  return (
    <section ref={ref} style={{
      background: 'var(--bg-navy)',
      padding: '100px var(--pad)',
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
      }}>
        <h2 className="reveal" style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 500,
          color: '#F8F6F1',
          lineHeight: 1.15,
          marginBottom: '20px',
          letterSpacing: '0.01em',
        }}>
          Stop searching.<br />Start governing.
        </h2>
        <p className="reveal d1" style={{
          fontSize: '16px',
          color: 'rgba(248,246,241,0.65)',
          lineHeight: 1.7,
          marginBottom: '40px',
        }}>
          BoardPath gives your board clear, cited, meeting-ready answers from your own governing documents.
        </p>
        <div className="reveal d2" style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <a href="/meeting-mode" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--gold-b)',
            color: 'var(--bg-navy)',
            fontSize: '15px',
            fontWeight: 600,
            padding: '14px 32px',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-l)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold-b)')}
          >
            Try the interactive demo →
          </a>
          <a href="#how-it-works" style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'transparent',
            color: 'rgba(248,246,241,0.75)',
            fontSize: '15px',
            fontWeight: 500,
            padding: '14px 32px',
            borderRadius: '8px',
            border: '1px solid rgba(248,246,241,0.2)',
            textDecoration: 'none',
            transition: 'border-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(248,246,241,0.5)'
            e.currentTarget.style.color = '#F8F6F1'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(248,246,241,0.2)'
            e.currentTarget.style.color = 'rgba(248,246,241,0.75)'
          }}
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  )
}
