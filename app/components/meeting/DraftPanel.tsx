'use client'

import { useState } from 'react'

const DRAFT_TYPES = [
  {
    id: 'owner_response',
    label: 'Owner Response',
    description: 'A formal reply to an owner inquiry'
  },
  {
    id: 'violation_notice',
    label: 'Violation Notice',
    description: 'A notice of rule violation requiring corrective action'
  },
  {
    id: 'board_notice',
    label: 'Board Notice',
    description: 'A general notice from the board to all residents'
  },
  {
    id: 'motion_language',
    label: 'Motion Language',
    description: 'Formal motion wording for board meeting minutes'
  }
]

interface Citation {
  citation_label: string
  heading: string
  excerpt?: string
}

interface Answer {
  direct_answer: string
  plain_english: string
  confidence_level: string
  has_conflict?: boolean
  conflict_note?: string
  counsel_recommended?: boolean
}

interface DraftPanelProps {
  question: string
  answer: Answer
  citations: Citation[]
  onClose: () => void
}

export default function DraftPanel({
  question,
  answer,
  citations,
  onClose
}: DraftPanelProps) {
  const [selectedType, setSelectedType] = useState('owner_response')
  const [isGenerating, setIsGenerating] = useState(false)
  const [draftBody, setDraftBody] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [groundedIn, setGroundedIn] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const dark = {
    bg: '#0F1923',
    bg2: '#1A2535',
    bg3: '#21304A',
    border: 'rgba(255,255,255,0.08)',
    borderGold: 'rgba(168,135,46,0.40)',
    text: '#E8E4DC',
    textMuted: '#8A95A3',
    gold: '#C4A054',
    goldBg: 'rgba(168,135,46,0.10)',
    red: '#E05252',
    redBg: 'rgba(224,82,82,0.10)',
    green: '#4CAF82',
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setDraftBody('')
    setDraftSubject('')
    setError('')

    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_type: selectedType,
          question,
          answer,
          citations
        })
      })

      if (!res.ok) throw new Error('Draft generation failed')

      const data = await res.json()
      setDraftBody(data.body)
      setDraftSubject(data.subject)
      setGroundedIn(data.grounded_in || [])
    } catch (err) {
      setError('Something went wrong generating the draft. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopy() {
    const fullText = draftSubject
      ? `Subject: ${draftSubject}\n\n${draftBody}`
      : draftBody
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    setDraftBody('')
    setDraftSubject('')
    setGroundedIn([])
    setError('')
  }

  const mailtoHref = draftSubject && draftBody
    ? `mailto:?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`
    : 'mailto:'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40
        }}
      />

      {/* Slide-over panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '560px',
        background: dark.bg2,
        borderLeft: `1px solid ${dark.border}`,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${dark.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: dark.gold,
              textTransform: 'uppercase',
              marginBottom: '0.25rem'
            }}>
              Draft Generator
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: dark.textMuted,
              fontStyle: 'italic',
              maxWidth: '380px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              &ldquo;{question}&rdquo;
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: dark.textMuted,
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '0.25rem'
            }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>

          {/* Draft type selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: dark.textMuted,
              textTransform: 'uppercase',
              marginBottom: '0.75rem'
            }}>
              Document Type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DRAFT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id)
                    setDraftBody('')
                    setDraftSubject('')
                    setError('')
                  }}
                  style={{
                    background: selectedType === type.id ? dark.goldBg : dark.bg3,
                    border: `1px solid ${selectedType === type.id ? dark.borderGold : dark.border}`,
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: selectedType === type.id ? dark.gold : dark.text,
                    marginBottom: '0.2rem'
                  }}>
                    {type.label}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: dark.textMuted
                  }}>
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Source summary */}
          <div style={{
            background: dark.bg,
            border: `1px solid ${dark.border}`,
            borderRadius: '6px',
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: dark.textMuted,
              textTransform: 'uppercase',
              marginBottom: '0.5rem'
            }}>
              Grounded In
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {citations.map((c, i) => (
                <span key={i} style={{
                  fontSize: '0.72rem',
                  background: dark.bg3,
                  border: `1px solid ${dark.border}`,
                  borderRadius: '4px',
                  padding: '0.2rem 0.5rem',
                  color: dark.textMuted
                }}>
                  {c.citation_label}
                </span>
              ))}
            </div>
          </div>

          {/* Generate button */}
          {!draftBody && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: isGenerating ? dark.bg3 : dark.gold,
                color: isGenerating ? dark.textMuted : '#0F1923',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                marginBottom: '1rem'
              }}
            >
              {isGenerating ? 'Generating draft...' : 'Generate Draft'}
            </button>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: dark.redBg,
              border: `1px solid ${dark.red}`,
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: dark.red,
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {/* Draft output */}
          {draftBody && (
            <div>
              {/* Subject line */}
              {draftSubject && (
                <div style={{
                  fontSize: '0.72rem',
                  color: dark.textMuted,
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontWeight: 600, color: dark.text }}>Subject: </span>
                  {draftSubject}
                </div>
              )}

              {/* Editable draft body */}
              <textarea
                value={draftBody}
                onChange={e => setDraftBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '320px',
                  background: dark.bg,
                  border: `1px solid ${dark.border}`,
                  borderRadius: '6px',
                  padding: '1rem',
                  color: dark.text,
                  fontSize: '0.82rem',
                  lineHeight: 1.7,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: '0.75rem'
                }}
              />

              {/* Sources used */}
              {groundedIn.length > 0 && (
                <div style={{
                  fontSize: '0.7rem',
                  color: dark.textMuted,
                  marginBottom: '1rem'
                }}>
                  Sources used: {groundedIn.join(', ')}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: copied ? dark.green : dark.gold,
                    color: '#0F1923',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {copied ? 'Copied' : 'Copy to Clipboard'}
                </button>

                <a
                  href={mailtoHref}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: dark.bg3,
                    border: `1px solid ${dark.border}`,
                    borderRadius: '6px',
                    color: dark.text,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    textAlign: 'center' as const,
                    display: 'block',
                    boxSizing: 'border-box' as const
                  }}
                >
                  Open in Email Client
                </a>
              </div>

              <button
                onClick={handleReset}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  background: 'none',
                  border: `1px solid ${dark.border}`,
                  borderRadius: '6px',
                  color: dark.textMuted,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
