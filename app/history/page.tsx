'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'
import AppNavbar from '../components/AppNavbar'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface Citation {
  id: string
  citation_order: number
  excerpt_text: string
  evidence_role: string
  citation_label: string | null
  heading: string | null
  page_start: number | null
  page_end: number | null
  document_title: string | null
  document_type: string | null
}

interface HistoryEntry {
  session_id: string
  question_text: string
  asked_at: string
  answer_id: string
  direct_answer: string
  plain_english_explanation: string
  confidence_level: 'high' | 'medium' | 'low'
  counsel_review_recommended: boolean
  has_hierarchy_conflict: boolean
  is_pinned: boolean
  citations: Citation[]
}

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — light theme
// ─────────────────────────────────────────────────────────────
const c = {
  bg:          '#F8F6F1',
  surface:     '#FFFFFF',
  text:        '#1A2535',
  textMuted:   'rgba(26,37,53,0.55)',
  textFaint:   'rgba(26,37,53,0.35)',
  gold:        '#C4A054',
  goldDim:     'rgba(196,160,84,0.10)',
  goldBorder:  'rgba(196,160,84,0.25)',
  border:      'rgba(26,37,53,0.08)',
  shadow:      '0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)',
  green:       '#2D6A4F',
  greenDot:    '#40916C',
  amber:       '#92400E',
  amberDot:    '#D97706',
  red:         '#7F1D1D',
  redDot:      '#DC2626',
}

const confidenceColor: Record<string, { text: string; dot: string }> = {
  high:   { text: c.green,  dot: c.greenDot },
  medium: { text: c.amber,  dot: c.amberDot },
  low:    { text: c.red,    dot: c.redDot   },
}

// ─────────────────────────────────────────────────────────────
// EXPANDED ENTRY
// ─────────────────────────────────────────────────────────────
function ExpandedEntry({ entry }: { entry: HistoryEntry }) {
  const labelStyle: React.CSSProperties = {
    margin: '0 0 6px 0',
    color: c.textFaint,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  }

  return (
    <div style={{
      borderTop: `1px solid ${c.border}`,
      padding: '20px 24px',
      background: 'rgba(26,37,53,0.02)',
    }}>

      <div style={{ marginBottom: 16 }}>
        <p style={labelStyle}>Direct Answer</p>
        <p style={{ margin: 0, color: c.text, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 14, lineHeight: 1.6 }}>
          {entry.direct_answer}
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={labelStyle}>Plain English</p>
        <p style={{ margin: 0, color: c.textMuted, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 13, lineHeight: 1.7 }}>
          {entry.plain_english_explanation}
        </p>
      </div>

      {entry.citations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={labelStyle}>Sources ({entry.citations.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entry.citations.map(cit => (
              <div key={cit.id} style={{
                padding: '10px 14px',
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                borderLeft: `3px solid ${cit.evidence_role === 'primary' ? c.gold : c.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: cit.evidence_role === 'primary' ? c.gold : c.textFaint, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    {cit.evidence_role === 'primary' ? '★ Primary' : `Supporting ${cit.citation_order}`}
                  </span>
                  {cit.document_title && (
                    <span style={{ color: c.text, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11, fontWeight: 600 }}>
                      {cit.document_title}
                    </span>
                  )}
                  {cit.citation_label && (
                    <span style={{ color: c.textMuted, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11 }}>
                      · {cit.citation_label}
                    </span>
                  )}
                  {cit.heading && (
                    <span style={{ color: c.textMuted, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11, fontStyle: 'italic' }}>
                      — {cit.heading}
                    </span>
                  )}
                  {cit.page_start && (
                    <span style={{ color: c.textFaint, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 10 }}>
                      p. {cit.page_start}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: c.textMuted, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 12, lineHeight: 1.6 }}>
                  {cit.excerpt_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {entry.counsel_review_recommended && (
          <span style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#7F1D1D', fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11 }}>
            Legal Review Recommended
          </span>
        )}
        {entry.has_hierarchy_conflict && (
          <span style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: '#92400E', fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11 }}>
            Document Conflict Detected
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HISTORY ROW
// ─────────────────────────────────────────────────────────────
function HistoryRow({
  entry,
  isExpanded,
  onToggle,
  onTogglePin,
}: {
  entry: HistoryEntry
  isExpanded: boolean
  onToggle: () => void
  onTogglePin: () => void
}) {
  const conf = confidenceColor[entry.confidence_level] ?? { text: c.textFaint, dot: c.textFaint }

  const dateStr = new Date(entry.asked_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const timeStr = new Date(entry.asked_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const rowStyle: React.CSSProperties = {
    border: `1px solid ${isExpanded ? c.goldBorder : c.border}`,
    borderRadius: 8,
    background: isExpanded ? 'rgba(196,160,84,0.03)' : c.surface,
    overflow: 'hidden',
    boxShadow: c.shadow,
    transition: 'border-color 0.15s',
  }

  const rowInnerStyle: React.CSSProperties = {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    cursor: 'pointer',
  }

  const questionStyle: React.CSSProperties = {
    margin: '0 0 6px 0',
    color: c.text,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
  }

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  }

  const pinBtnStyle: React.CSSProperties = {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: '2px 6px',
    color: entry.is_pinned ? c.gold : c.textFaint,
    transition: 'color 0.15s',
  }

  const chevronStyle: React.CSSProperties = {
    color: c.textFaint,
    fontSize: 12,
    flexShrink: 0,
    marginTop: 2,
    transition: 'transform 0.15s',
    transform: isExpanded ? 'rotate(180deg)' : 'none',
  }

  return (
    <div style={rowStyle}>
      <div onClick={onToggle} style={rowInnerStyle}>
        <div style={{ marginTop: 5, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: conf.dot }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={questionStyle}>{entry.question_text}</p>
          <div style={metaStyle}>
            <span style={{ color: c.textFaint, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11 }}>
              {dateStr} · {timeStr}
            </span>
            <span style={{ color: conf.text, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {entry.confidence_level}
            </span>
            <span style={{ color: c.textFaint, fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 11 }}>
              {entry.citations.length} source{entry.citations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onTogglePin() }}
          title={entry.is_pinned ? 'Unpin' : 'Pin this answer'}
          style={pinBtnStyle}
        >
          {entry.is_pinned ? '★' : '☆'}
        </button>

        <span style={chevronStyle}>▾</span>
      </div>

      {isExpanded && <ExpandedEntry entry={entry} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
const supabase = createClient()

export default function HistoryPage() {
  const router = useRouter()

  const [entries, setEntries]       = useState<HistoryEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'pinned'>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: memberships } = await supabase
        .from('association_memberships')
        .select('association_id')
        .eq('user_id', user.id)
        .limit(1)

      const associationId = memberships?.[0]?.association_id
      if (!associationId) {
        setError('No association found for your account.')
        setLoading(false)
        return
      }

      if (!associationId) {
        setError('No association found for your account.')
        setLoading(false)
        return
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('question_sessions')
        .select(`
          id,
          question_text,
          created_at,
          answers (
            id,
            direct_answer,
            plain_english_explanation,
            confidence_level,
            counsel_review_recommended,
            has_hierarchy_conflict,
            is_pinned,
            answer_citations (
              id,
              citation_order,
              excerpt_text,
              evidence_role,
              document_sections (
                citation_label,
                heading,
                page_start,
                page_end,
                documents (
                  title,
                  document_type
                )
              )
            )
          )
        `)
        .eq('association_id', associationId)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('History load error:', sessionsError)
        setError('Failed to load answer history.')
        setLoading(false)
        return
      }

      const flat: HistoryEntry[] = (sessions ?? [])
        .filter((s: any) => s.answers?.length > 0)
        .map((s: any) => {
          const a = s.answers[0]
          return {
            session_id: s.id,
            question_text: s.question_text,
            asked_at: s.created_at,
            answer_id: a.id,
            direct_answer: a.direct_answer,
            plain_english_explanation: a.plain_english_explanation,
            confidence_level: a.confidence_level,
            counsel_review_recommended: a.counsel_review_recommended,
            has_hierarchy_conflict: a.has_hierarchy_conflict,
            is_pinned: a.is_pinned ?? false,
            citations: (a.answer_citations ?? [])
              .sort((x: any, y: any) => x.citation_order - y.citation_order)
              .map((cit: any) => ({
                id: cit.id,
                citation_order: cit.citation_order,
                excerpt_text: cit.excerpt_text,
                evidence_role: cit.evidence_role,
                citation_label: cit.document_sections?.citation_label ?? null,
                heading: cit.document_sections?.heading ?? null,
                page_start: cit.document_sections?.page_start ?? null,
                page_end: cit.document_sections?.page_end ?? null,
                document_title: cit.document_sections?.documents?.title ?? null,
                document_type: cit.document_sections?.documents?.document_type ?? null,
              })),
          }
        })

      setEntries(flat)
      setLoading(false)
    }

    load()
  }, [])

  async function togglePin(entry: HistoryEntry) {
    const newVal = !entry.is_pinned
    setEntries(prev => prev.map(e =>
      e.answer_id === entry.answer_id ? { ...e, is_pinned: newVal } : e
    ))
    await supabase
      .from('answers')
      .update({ is_pinned: newVal })
      .eq('id', entry.answer_id)
  }

  const visible = entries
    .filter(e => filter === 'all' || e.is_pinned)
    .filter(e => !search.trim() || e.question_text.toLowerCase().includes(search.trim().toLowerCase()))

  const pinnedCount = entries.filter(e => e.is_pinned).length

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: c.bg,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }

  const mainStyle: React.CSSProperties = {
    maxWidth: 860,
    margin: '0 auto',
    padding: '40px 40px 80px',
  }

  const headingStyle: React.CSSProperties = {
    margin: '0 0 6px 0',
    color: c.text,
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.1,
  }

  const subheadStyle: React.CSSProperties = {
    margin: '0 0 28px 0',
    color: c.textFaint,
    fontSize: 14,
  }

  const searchStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    color: c.text,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: 14,
    outline: 'none',
  }

  const filterBtnBase: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: 6,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  }

  const filterAllStyle: React.CSSProperties = {
    ...filterBtnBase,
    background: filter === 'all' ? c.gold : c.surface,
    color: filter === 'all' ? '#FFFFFF' : c.textMuted,
    border: filter === 'all' ? 'none' : `1px solid ${c.border}`,
  }

  const filterPinnedStyle: React.CSSProperties = {
    ...filterBtnBase,
    background: filter === 'pinned' ? c.gold : c.surface,
    color: filter === 'pinned' ? '#FFFFFF' : c.textMuted,
    border: filter === 'pinned' ? 'none' : `1px solid ${c.border}`,
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <AppNavbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <p style={{ color: c.textFaint, fontSize: 14 }}>Loading history…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <AppNavbar />

      <div style={mainStyle}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={headingStyle}>Answer History</h1>
          <p style={subheadStyle}>All questions asked and answers returned for this association.</p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchStyle}
            />
            <button onClick={() => setFilter('all')} style={filterAllStyle}>
              All ({entries.length})
            </button>
            <button onClick={() => setFilter('pinned')} style={filterPinnedStyle}>
              ★ Pinned ({pinnedCount})
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: '#DC2626', fontSize: 14, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {visible.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: c.shadow }}>
            <p style={{ color: c.text, fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              {filter === 'pinned' ? 'No pinned answers yet.' : 'No questions found.'}
            </p>
            <p style={{ color: c.textFaint, fontSize: 13 }}>
              {filter === 'pinned' ? 'Pin answers from Meeting Mode to save them here.' : 'Questions asked in Meeting Mode will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map(entry => (
              <HistoryRow
                key={entry.session_id}
                entry={entry}
                isExpanded={expandedId === entry.session_id}
                onToggle={() => setExpandedId(expandedId === entry.session_id ? null : entry.session_id)}
                onTogglePin={() => togglePin(entry)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}