'use client'

import { useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null)
  useScrollReveal(ref)

  const steps = [
    {
      num: '01',
      title: 'Upload your governing documents',
      description: 'Add your declaration, bylaws, rules, amendments, and policies into one organized association workspace. BoardPath understands the hierarchy between them.',
      tag: 'Document ingestion',
    },
    {
      num: '02',
      title: 'Ask a real question',
      description: 'Ask in plain English, exactly the way a board member or manager would during a meeting. No special syntax or search terms required.',
      tag: 'Natural language',
    },
    {
      num: '03',
      title: 'Get a clear, cited answer',
      description: 'BoardPath returns a direct answer, a plain-English explanation, and the exact document sections behind it — with confidence level and any flags you should know about.',
      tag: 'Citation-grounded',
    },
    {
      num: '04',
      title: 'Take the next step',
      description: 'Save the answer for the record, use it live during the meeting, or turn it into a grounded draft — an owner response, violation notice, or motion language.',
      tag: 'Actionable output',
    },
  ]

  return (
    <section ref={ref} id="how-it-works" style={{
      background: 'var(--bg)',
      padding: '100px var(--pad)',
    }}>
      <div style={{
        maxWidth: 'var(--max)',
        margin: '0 auto',
      }}>
        {/* Section header */}
        <div className="reveal" style={{ marginBottom: '64px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '12px',
          }}>
            How it works
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.2,
            maxWidth: '480px',
          }}>
            From question to answer in seconds.
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {steps.map((step, i) => (
            <div key={i} className="reveal" style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr auto',
              gap: '32px',
              alignItems: 'start',
              padding: '36px 0',
              borderTop: '1px solid var(--border)',
              transitionDelay: `${i * 0.1}s`,
            }} id={`step-row-${i}`}>
              {/* Number */}
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '48px',
                fontWeight: 400,
                color: 'var(--border-m)',
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}>
                {step.num}
              </div>

              {/* Content */}
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '22px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  marginBottom: '10px',
                  lineHeight: 1.3,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '15px',
                  color: 'var(--text-m)',
                  lineHeight: 1.7,
                  maxWidth: '520px',
                }}>
                  {step.description}
                </p>
              </div>

              {/* Tag */}
              <div className="step-tag" style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                background: 'var(--gold-bg)',
                border: '1px solid var(--gold-border)',
                padding: '5px 12px',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                marginTop: '4px',
              }}>
                {step.tag}
              </div>
            </div>
          ))}

          {/* Final border */}
          <div style={{ borderTop: '1px solid var(--border)' }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .step-tag { display: none !important; }
          #step-row-0, #step-row-1, #step-row-2, #step-row-3 {
            grid-template-columns: 48px 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}