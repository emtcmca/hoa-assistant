'use client'

import { useRef, useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function AudienceSection() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)
  const [hovered, setHovered] = useState<number | null>(null)

  const cards = [
    {
      title: 'HOA & Condo Boards',
      description: 'Get faster, clearer answers during meetings and reduce confusion around governing authority. Stop relying on the one person who knows the documents.',
      points: ['Live meeting support', 'Clear authority references', 'Consistent enforcement'],
    },
    {
      title: 'Self-Managed Communities',
      description: 'Make your documents usable without depending on scattered files and institutional memory that walks out the door when board members rotate.',
      points: ['No manager required', 'Document organization', 'Board continuity'],
    },
    {
      title: 'Managers & Management Companies',
      description: 'Support boards more efficiently with faster research, clearer cited answers, and grounded follow-up drafting across your entire portfolio.',
      points: ['Portfolio-wide support', 'Faster board responses', 'Grounded draft output'],
    },
  ]

  return (
    <section ref={ref} id="who-its-for" style={{
      background: 'var(--bg2)',
      padding: '100px var(--pad)',
    }}>
      <div style={{
        maxWidth: 'var(--max)',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div className="reveal" style={{ marginBottom: '56px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '12px',
          }}>
            Who it's for
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.2,
          }}>
            Built for everyone who governs.
          </h2>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }} className="audience-grid">
          {cards.map((card, i) => (
            <div
              key={i}
              className="reveal"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: '#fff',
                border: hovered === i ? '1px solid var(--gold-border)' : '1px solid var(--border)',
                borderRadius: '12px',
                padding: '32px',
                cursor: 'default',
                transform: hovered === i ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hovered === i ? 'var(--shadow-lg)' : 'var(--shadow)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '22px',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '14px',
                lineHeight: 1.3,
              }}>
                {card.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-m)',
                lineHeight: 1.7,
                marginBottom: '24px',
              }}>
                {card.description}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {card.points.map((point, j) => (
                  <div key={j} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--text-m)',
                    fontWeight: 500,
                  }}>
                    <div style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: 'var(--gold)',
                      flexShrink: 0,
                    }} />
                    {point}
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: '24px',
                fontSize: '13px',
                fontWeight: 600,
                color: hovered === i ? 'var(--gold)' : 'var(--text-d)',
                transition: 'color 0.2s ease',
              }}>
                Learn more →
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .audience-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .audience-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}