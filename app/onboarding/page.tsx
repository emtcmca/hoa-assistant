'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/client'

const STARTER_QUESTIONS = [
  'Can the board levy a special assessment?',
  'What is the pet policy?',
  'How many votes are needed to amend the bylaws?',
  'What are the rules for parking?',
  'How much notice is required before a board meeting?',
]

const DIMENSION_META: Record<string, { label: string; description: string }> = {
  authority: {
    label: 'Document Authority',
    description: 'Which governing document answered this question. Declaration and CC&Rs outrank Rules and Policies.',
  },
  agreement: {
    label: 'Source Agreement',
    description: 'Two independent search methods — semantic and keyword — were run independently. This score reflects how well they agreed on the same sections.',
  },
  coverage: {
    label: 'Corpus Coverage',
    description: 'How completely your uploaded documents cover this topic. More document types improve coverage on edge questions.',
  },
  clarity: {
    label: 'Answer Clarity',
    description: 'How directly the governing text addressed the question. Ambiguity, statute flags, and counsel recommendations reduce this score.',
  },
}

const DIMENSION_ORDER = ['authority', 'agreement', 'coverage', 'clarity']

const LABEL_COLOR_MAP: Record<string, string> = {
  green: '#16a34a',
  amber: '#d97706',
  orange: '#ea580c',
  red: '#dc2626',
}

interface DimensionScore {
  score: number
  max: number
  explanation: string
}

interface ConfidenceScorecard {
  total: number
  label: string
  labelColor: string
  dimensions: Record<string, DimensionScore>
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [associationId, setAssociationId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [isTourMode, setIsTourMode] = useState(false)
  const [isAssociationConfigured, setIsAssociationConfigured] = useState(false)

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'indexed' | 'failed'>('idle')
  const [sectionCount, setSectionCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)

  const [answerData, setAnswerData] = useState<any>(null)
  const [scorecard, setScorecard] = useState<ConfidenceScorecard | null>(null)

  const [revealedCount, setRevealedCount] = useState(0)
  const [compositeBarWidth, setCompositeBarWidth] = useState(0)
  const [barWidths, setBarWidths] = useState<number[]>([0, 0, 0, 0])

  useEffect(() => {
    async function init() {
      const tourMode = searchParams.get('mode') === 'tour'
      setIsTourMode(tourMode)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      setUserId(session.user.id)

      if (!tourMode) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', session.user.id)

        const profile = profileData?.[0]
        if (profile?.onboarding_completed_at) {
          router.push('/meeting-mode')
          return
        }
      }

      const { data: memberships } = await supabase
        .from('association_memberships')
        .select('association_id')
        .eq('user_id', session.user.id)
        .limit(1)

      const membership = memberships?.[0]
      if (!membership) {
        setAuthLoading(false)
        return
      }

      const { data: assocData } = await supabase
        .from('associations')
        .select('id, display_name')
        .eq('id', membership.association_id)

      const assoc = assocData?.[0]
      if (assoc) {
        setAssociationId(assoc.id)
        setNameInput(assoc.display_name ?? '')
      }

      const { data: completedDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('association_id', membership.association_id)
        .eq('parse_status', 'complete')
        .limit(1)

      const configured = !!(assoc?.display_name && completedDocs && completedDocs.length > 0)
      setIsAssociationConfigured(configured)

      if (configured || tourMode) {
        setStep(3)
      }

      setAuthLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    if (step !== 5 || !scorecard) return

    setRevealedCount(0)
    setCompositeBarWidth(0)
    setBarWidths([0, 0, 0, 0])

    setTimeout(() => setCompositeBarWidth(scorecard.total), 200)

    DIMENSION_ORDER.forEach((key, i) => {
      setTimeout(() => {
        setRevealedCount(prev => Math.max(prev, i + 1))
      }, 600 + i * 520)

      setTimeout(() => {
        const dim = scorecard.dimensions[key]
        if (dim) {
          setBarWidths(prev => {
            const next = [...prev]
            next[i] = (dim.score / dim.max) * 100
            return next
          })
        }
      }, 850 + i * 520)
    })
  }, [step])

  async function handleSkip() {
    if (userId) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId)
    }
    router.push('/meeting-mode')
  }

  async function handleStep1Next() {
    if (!associationId || !nameInput.trim()) return
    await supabase
      .from('associations')
      .update({ display_name: nameInput.trim() })
      .eq('id', associationId)
    setStep(2)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !associationId) return

    setUploadStatus('uploading')

    const filePath = `${associationId}/${Date.now()}_${file.name}`
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (storageError) {
      setUploadStatus('failed')
      return
    }

    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        association_id: associationId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        original_filename: file.name,
        file_storage_key: filePath,
        parse_status: 'pending',
        document_status: 'active',
      })
      .select('id')

    if (docError || !docData?.[0]) {
      setUploadStatus('failed')
      return
    }

    const documentId = docData[0].id
    setUploadStatus('parsing')

    const parseResponse = await fetch('/api/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, associationId }),
    })

    if (!parseResponse.ok) {
      setUploadStatus('failed')
      return
    }

    let attempts = 0
    const pollInterval = setInterval(async () => {
      attempts++
      const { data: docStatus } = await supabase
        .from('documents')
        .select('parse_status')
        .eq('id', documentId)

      const status = docStatus?.[0]?.parse_status

      if (status === 'complete') {
        clearInterval(pollInterval)
        const { data: sections } = await supabase
          .from('document_sections')
          .select('id')
          .eq('document_id', documentId)
        setSectionCount(sections?.length ?? 0)
        setUploadStatus('indexed')
        setTimeout(() => setStep(3), 1500)
      } else if (status === 'failed' || attempts >= 30) {
        clearInterval(pollInterval)
        setUploadStatus('failed')
      }
    }, 3000)
  }

  async function handleAsk(q: string) {
    if (!associationId || !q.trim()) return
    setQuestion(q)
    setIsAsking(true)
    setAskError(null)

    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, associationId }),
    })

    const data = await response.json()

    if (data.error) {
      setAskError('No relevant sections found. Try a different question.')
      setIsAsking(false)
      return
    }

    setAnswerData(data.answer ?? data)
    setScorecard(data.scorecard ?? null)
    setIsAsking(false)
    setStep(5)
  }

  async function handleComplete() {
    if (userId) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId)
    }
    router.push('/meeting-mode')
  }

  const totalSteps = isTourMode || isAssociationConfigured ? 3 : 5
  const stepOffset = isTourMode || isAssociationConfigured ? 2 : 0
  const displayStep = step - stepOffset
  const compositeColor = scorecard ? (LABEL_COLOR_MAP[scorecard.labelColor] ?? '#A8872E') : '#A8872E'

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#F8F6F1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '48px 24px 80px',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }

  const logoWrapStyle: React.CSSProperties = {
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: '20px',
    fontWeight: '600',
    textDecoration: 'none',
    letterSpacing: '-0.01em',
    marginBottom: '40px',
    display: 'block',
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(26,37,53,0.12)',
    borderRadius: '16px',
    padding: '40px 44px',
    maxWidth: '580px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(26,37,53,0.06), 0 1px 4px rgba(26,37,53,0.04)',
  }

  const progressRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    marginBottom: '32px',
  }

  const stepLabelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#A8872E',
    textTransform: 'uppercase',
    marginBottom: '8px',
  }

  const headingStyle: React.CSSProperties = {
    fontFamily: 'Cormorant Garamond, Georgia, serif',
    fontSize: '2rem',
    fontWeight: '600',
    color: '#1A2535',
    marginBottom: '10px',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  }

  const subStyle: React.CSSProperties = {
    fontSize: '0.92rem',
    color: '#6B7280',
    marginBottom: '28px',
    lineHeight: 1.65,
  }

  const pullQuoteStyle: React.CSSProperties = {
    fontFamily: 'Cormorant Garamond, Georgia, serif',
    fontSize: '1.15rem',
    fontStyle: 'italic',
    color: '#1A2535',
    borderLeft: '3px solid #A8872E',
    paddingLeft: '16px',
    marginBottom: '24px',
    lineHeight: 1.5,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #D1C9B8',
    borderRadius: '8px',
    fontSize: '1rem',
    color: '#1A2535',
    backgroundColor: '#FAFAF8',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }

  const primaryBtnStyle: React.CSSProperties = {
    backgroundColor: '#1A2535',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '13px 24px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '16px',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    letterSpacing: '0.01em',
  }

  const skipStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    fontSize: '0.82rem',
    cursor: 'pointer',
    marginTop: '14px',
    padding: '4px 0',
    textDecoration: 'underline',
    display: 'block',
    width: '100%',
    textAlign: 'center',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }

  const dropZoneStyle: React.CSSProperties = {
    border: '2px dashed #D1C9B8',
    borderRadius: '10px',
    padding: '36px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#FAFAF8',
  }

  const chipContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
    marginBottom: '16px',
  }

  const chipStyle: React.CSSProperties = {
    padding: '11px 16px',
    border: '1px solid #D1C9B8',
    borderRadius: '8px',
    backgroundColor: '#FAFAF8',
    color: '#1A2535',
    fontSize: '0.9rem',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }

  const answerBoxStyle: React.CSSProperties = {
    backgroundColor: '#F8F6F1',
    border: '1px solid #E8E4DC',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  }

  const compositeRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '8px',
  }

  const compositeTrackStyle: React.CSSProperties = {
    height: '10px',
    borderRadius: '5px',
    backgroundColor: '#E8E4DC',
    marginBottom: '24px',
    overflow: 'hidden',
  }

  const compositeBarFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${compositeBarWidth}%`,
    backgroundColor: compositeColor,
    borderRadius: '5px',
    transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  const dimCardBaseStyle: React.CSSProperties = {
    border: '1px solid #E8E4DC',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '12px',
    backgroundColor: '#ffffff',
  }

  const dimHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  }

  const dimTrackStyle: React.CSSProperties = {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#E8E4DC',
    marginBottom: '10px',
    overflow: 'hidden',
  }

  const statusCenterStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '28px 0',
  }

  const dropIconStyle: React.CSSProperties = {
    color: '#A8872E',
    fontSize: '1.5rem',
    margin: '0 0 8px',
  }

  const dropLabelStyle: React.CSSProperties = {
    color: '#1A2535',
    fontWeight: 600,
    margin: '0 0 4px',
    fontSize: '0.95rem',
  }

  const dropSubStyle: React.CSSProperties = {
    color: '#9CA3AF',
    margin: 0,
    fontSize: '0.82rem',
  }

  const answerQStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: '#9CA3AF',
    margin: '0 0 6px',
    fontWeight: 500,
  }

  const answerTextStyle: React.CSSProperties = {
    fontSize: '0.93rem',
    color: '#1A2535',
    margin: 0,
    lineHeight: 1.6,
  }

  const compositeLabelStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#1A2535',
    letterSpacing: '0.01em',
  }

  const ctaWrapStyle: React.CSSProperties = {
    marginTop: '8px',
    opacity: 1,
    transition: 'opacity 0.4s ease',
  }

  if (authLoading) {
    return (
      <div style={pageStyle}>
        <p style={{ color: '#6B7280', marginTop: '120px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={pageStyle}>

      <Link href="/" style={logoWrapStyle}>
        <span style={{ color: '#1A2535' }}>Board</span>
        <span style={{ color: '#C4A054' }}>Path</span>
      </Link>

      <div style={cardStyle}>

        <div style={progressRowStyle}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const segStyle: React.CSSProperties = {
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              backgroundColor: i < displayStep ? '#1A2535' : '#E8E4DC',
              transition: 'background-color 0.35s ease',
            }
            return <div key={i} style={segStyle} />
          })}
        </div>

        {step === 1 && (
          <>
            <p style={stepLabelStyle}>Step 1 of {totalSteps}</p>
            <h1 style={headingStyle}>Name your association</h1>
            <p style={subStyle}>
              This is how BoardPath will refer to your community throughout the product.
            </p>
            <input
              style={inputStyle}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="e.g. Forest Brook HOA"
              onKeyDown={e => e.key === 'Enter' && handleStep1Next()}
            />
            <button style={primaryBtnStyle} onClick={handleStep1Next} disabled={!nameInput.trim()}>
              Continue →
            </button>
            <button style={skipStyle} onClick={handleSkip}>
              Skip setup for now
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={stepLabelStyle}>Step 2 of {totalSteps}</p>
            <h1 style={headingStyle}>Upload your first document</h1>
            <p style={subStyle}>
              Start with your Declaration or CC&Rs — the highest-authority document. BoardPath parses it into searchable, citable sections.
            </p>

            {uploadStatus === 'idle' && (
              <>
                <div style={dropZoneStyle} onClick={() => fileInputRef.current?.click()}>
                  <p style={dropIconStyle}>↑</p>
                  <p style={dropLabelStyle}>Click to select a PDF</p>
                  <p style={dropSubStyle}>Declaration, CC&Rs, Bylaws, Rules</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </>
            )}

            {uploadStatus === 'uploading' && (
              <div style={statusCenterStyle}>
                <p style={{ color: '#6B7280', margin: 0 }}>⬆ Uploading document...</p>
              </div>
            )}

            {uploadStatus === 'parsing' && (
              <div style={statusCenterStyle}>
                <p style={{ color: '#6B7280', margin: 0 }}>🔍 Parsing and indexing sections...</p>
              </div>
            )}

            {uploadStatus === 'indexed' && (
              <div style={statusCenterStyle}>
                <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>✓ Document indexed successfully</p>
              </div>
            )}

            {uploadStatus === 'failed' && (
              <>
                <div style={statusCenterStyle}>
                  <p style={{ color: '#dc2626', margin: 0 }}>Upload failed. Please try again.</p>
                </div>
                <button style={primaryBtnStyle} onClick={() => setUploadStatus('idle')}>
                  Try again
                </button>
              </>
            )}

            <button style={skipStyle} onClick={handleSkip}>
              Skip for now
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <p style={stepLabelStyle}>Step {3 - stepOffset} of {totalSteps}</p>
            <h1 style={headingStyle}>Your corpus is ready</h1>
            <p style={subStyle}>
              {sectionCount > 0
                ? `${sectionCount} sections extracted and indexed. `
                : 'Your documents are indexed and ready. '}
              BoardPath can now answer questions grounded in your governing documents — with citations and a confidence score on every answer.
            </p>
            <button style={primaryBtnStyle} onClick={() => setStep(4)}>
              Ask your first question →
            </button>
            <button style={skipStyle} onClick={handleSkip}>
              Skip to dashboard
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <p style={stepLabelStyle}>Step {4 - stepOffset} of {totalSteps}</p>
            <h1 style={headingStyle}>Ask your first question</h1>
            <p style={subStyle}>
              Try one of these or type your own. Every answer is grounded in your governing documents — no hallucination, no guessing.
            </p>
            <div style={chipContainerStyle}>
              {STARTER_QUESTIONS.map(q => (
                <button
                  key={q}
                  style={chipStyle}
                  onClick={() => !isAsking && handleAsk(q)}
                  disabled={isAsking}
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              style={inputStyle}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Or type your own question..."
              onKeyDown={e => e.key === 'Enter' && !isAsking && handleAsk(question)}
            />
            {isAsking && (
              <p style={{ color: '#6B7280', fontSize: '0.88rem', marginTop: '12px', marginBottom: 0 }}>
                Searching your documents...
              </p>
            )}
            {askError && (
              <p style={{ color: '#dc2626', fontSize: '0.88rem', marginTop: '12px', marginBottom: 0 }}>
                {askError}
              </p>
            )}
            <button
              style={primaryBtnStyle}
              onClick={() => handleAsk(question)}
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? 'Searching...' : 'Ask BoardPath →'}
            </button>
            <button style={skipStyle} onClick={handleSkip}>
              Skip to dashboard
            </button>
          </>
        )}

        {step === 5 && answerData && (
          <>
            <p style={stepLabelStyle}>Step {5 - stepOffset} of {totalSteps}</p>
            <h1 style={headingStyle}>Meet Transparent Confidence™</h1>
            <p style={pullQuoteStyle}>
              Most AI tools give you an answer. BoardPath tells you how much to trust it.
            </p>

            <div style={answerBoxStyle}>
              <p style={answerQStyle}>Q: {question}</p>
              <p style={answerTextStyle}>{answerData.direct_answer ?? ''}</p>
            </div>

            {scorecard && (
              <>
                <div style={compositeRowStyle}>
                  <span style={compositeLabelStyle}>Transparent Confidence™</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: compositeColor }}>
                    {scorecard.total}/100 — {scorecard.label}
                  </span>
                </div>
                <div style={compositeTrackStyle}>
                  <div style={compositeBarFillStyle} />
                </div>

                {DIMENSION_ORDER.map((key, i) => {
                  const dim = scorecard.dimensions[key]
                  const meta = DIMENSION_META[key]
                  if (!dim || !meta) return null

                  const isRevealed = revealedCount > i

                  const dimWrapStyle: React.CSSProperties = {
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? 'translateY(0px)' : 'translateY(10px)',
                    transition: 'opacity 0.45s ease, transform 0.45s ease',
                  }

                  const dimBarFillStyle: React.CSSProperties = {
                    height: '100%',
                    width: `${barWidths[i]}%`,
                    backgroundColor: '#A8872E',
                    borderRadius: '3px',
                    transition: 'width 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
                  }

                  const dimNameStyle: React.CSSProperties = {
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#1A2535',
                  }

                  const dimScoreStyle: React.CSSProperties = {
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#A8872E',
                  }

                  const dimExplainStyle: React.CSSProperties = {
                    fontSize: '0.82rem',
                    color: '#6B7280',
                    margin: 0,
                    lineHeight: 1.55,
                  }

                  return (
                    <div key={key} style={dimWrapStyle}>
                      <div style={dimCardBaseStyle}>
                        <div style={dimHeaderStyle}>
                          <span style={dimNameStyle}>{meta.label}</span>
                          <span style={dimScoreStyle}>{dim.score}/{dim.max}</span>
                        </div>
                        <div style={dimTrackStyle}>
                          <div style={dimBarFillStyle} />
                        </div>
                        <p style={dimExplainStyle}>{dim.explanation}</p>
                      </div>
                    </div>
                  )
                })}

                {revealedCount >= DIMENSION_ORDER.length && (
                  <div style={ctaWrapStyle}>
                    <button style={primaryBtnStyle} onClick={handleComplete}>
                      Go to BoardPath →
                    </button>
                    <button style={skipStyle} onClick={handleSkip}>
                      Skip to dashboard
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
