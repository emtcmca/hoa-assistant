'use client'

import { useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import ProofCard from './ProofCard'

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)

  return (
    <section ref={ref} style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '80px',
      paddingBottom: '60px',
      paddingLeft: 'var(--pad)',
      paddingRight: 'var(--pad)',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 'var(--max)',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '60px',
        alignItems: 'center',
      }} className="hero-grid">

        {/* Left column — headline + CTAs */}
        <div>
          {/* Badge */}
          <div className="reveal" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            background: 'var(--gold-bg)',
            border: '1px solid var(--gold-border)',
            padding: '6px 14px',
            borderRadius: '20px',
            marginBottom: '28px',
          }}>
            <div style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--gold)',
            }} />
            Association Governance Intelligence
          </div>

          {/* Headline */}
          <h1 className="reveal d1" style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(36px, 5vw, 58px)',
            fontWeight: 500,
            lineHeight: 1.1,
            color: 'var(--text)',
            letterSpacing: '0.01em',
            marginBottom: '20px',
          }}>
            Your documents,<br />
            <em style={{
              color: 'var(--gold)',
              fontStyle: 'italic',
            }}>finally making sense.</em>
          </h1>

          {/* Subline */}
          <p className="reveal d2" style={{
            fontSize: '17px',
            fontWeight: 400,
            color: 'var(--text-m)',
            lineHeight: 1.7,
            maxWidth: '440px',
            marginBottom: '36px',
          }}>
            Clear answers. Exact citations. Plain English your whole board can use.
          </p>

          {/* CTAs */}
          <div className="reveal d3" style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }} id="hero-ctas">
            <a href="#demo" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-navy)',
              color: '#F8F6F1',
              fontSize: '14px',
              fontWeight: 500,
              padding: '13px 28px',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-navy2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-navy)')}
            >
              Try the interactive demo
              <span style={{ fontSize: '16px' }}>→</span>
            </a>

            <a href="#how-it-works" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: 500,
              padding: '13px 28px',
              borderRadius: '8px',
              border: '1px solid var(--border-m)',
              textDecoration: 'none',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--text)'
              e.currentTarget.style.background = 'var(--bg2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-m)'
              e.currentTarget.style.background = 'transparent'
            }}
            >
              See how it works
            </a>
          </div>

          {/* Trust note */}
          <p className="reveal d3" style={{
            fontSize: '12px',
            color: 'var(--text-d)',
            marginTop: '20px',
            letterSpacing: '0.02em',
          }}>
            No legal advice · Citation-grounded answers only · Built for boards
          </p>
        </div>

        {/* Right column — ProofCard */}
        <div className="reveal d2" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }} id="proof-card-col">
          <ProofCard />
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          #proof-card-col {
            order: -1;
          }
        }
        @media (max-width: 600px) {
          #hero-ctas {
            flex-direction: column;
          }
          #hero-ctas a {
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  )
}