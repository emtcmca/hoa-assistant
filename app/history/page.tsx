'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

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
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const c = {
  bg:         '#0C1525',
  bgCard:     'rgba(255,255,255,0.03)',
  gold:       '#C4A054',
  goldDim:    'rgba(196,160,84,0.15)',
  goldBorder: 'rgba(196,160,84,0.25)',
  text:       '#E8E4DC',
  textDim:    'rgba(232,228,220,0.65)',
  textFaint:  'rgba(232,228,220,0.4)',
  border:     'rgba(255,255,255,0.07)',
  green:      '#52B788',
  amber:      '#F6AD55',
  red:        '#FC8181',
}

const confidenceColor: Record<string, string> = {
  high:   c.green,
  medium: c.amber,
  low:    c.red,
}

// ─────────────────────────────────────────────────────────────
// EXPANDED ENTRY
// ─────────────────────────────────────────────────────────────
function ExpandedEntry({ entry }: { entry: HistoryEntry }) {
  return (
    <div style={{
      borderTop: `1px solid ${c.border}`,
      padding: '20px 24px',
      background: 'rgba(0,0,0,0.15)',
    }}>

      {/* Direct answer */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 6px 0', color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Direct Answer
        </p>
        <p style={{ margin: 0, color: c.text, fontFamily: 'DM Sans,sans-serif', fontSize: 14, lineHeight: 1.6 }}>
          {entry.direct_answer}
        </p>
      </div>

      {/* Plain English */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 6px 0', color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Plain English
        </p>
        <p style={{ margin: 0, color: c.textDim, fontFamily: 'DM Sans,sans-serif', fontSize: 13, lineHeight: 1.7 }}>
          {entry.plain_english_explanation}
        </p>
      </div>

      {/* Citations */}
      {entry.citations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px 0', color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Sources ({entry.citations.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entry.citations.map(cit => (
              <div key={cit.id} style={{
                padding: '10px 14px',
                background: c.bgCard,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                borderLeft: `3px solid ${cit.evidence_role === 'primary' ? c.gold : c.border}`,
              }}>
                {/* Label row */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: cit.evidence_role === 'primary' ? c.gold : c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    {cit.evidence_role === 'primary' ? '★ Primary' : `Supporting ${cit.citation_order}`}
                  </span>
                  {cit.document_title && (
                    <span style={{ color: c.textDim, fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 600 }}>
                      {cit.document_title}
                    </span>
                  )}
                  {cit.citation_label && (
                    <span style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 11 }}>
                      · {cit.citation_label}
                    </span>
                  )}
                  {cit.heading && (
                    <span style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontStyle: 'italic' }}>
                      — {cit.heading}
                    </span>
                  )}
                  {cit.page_start && (
                    <span style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 10 }}>
                      p. {cit.page_start}
                    </span>
                  )}
                </div>
                {/* Excerpt */}
                <p style={{ margin: 0, color: c.textDim, fontFamily: 'DM Sans,sans-serif', fontSize: 12, lineHeight: 1.6 }}>
                  {cit.excerpt_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {entry.counsel_review_recommended && (
          <span style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.3)', color: c.red, fontFamily: 'DM Sans,sans-serif', fontSize: 11 }}>
            Legal Review Recommended
          </span>
        )}
        {entry.has_hierarchy_conflict && (
          <span style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)', color: c.amber, fontFamily: 'DM Sans,sans-serif', fontSize: 11 }}>
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
  const confColor = confidenceColor[entry.confidence_level] ?? c.textFaint

  const dateStr = new Date(entry.asked_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const timeStr = new Date(entry.asked_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{
      border: `1px solid ${isExpanded ? c.goldBorder : c.border}`,
      borderRadius: 8,
      background: isExpanded ? 'rgba(196,160,84,0.04)' : c.bgCard,
      overflow: 'hidden',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          display: 'flex', alignItems: 'flex-start', gap: 14,
          cursor: 'pointer',
        }}
      >
        {/* Confidence dot */}
        <div style={{ marginTop: 5, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: confColor }} />
        </div>

        {/* Question + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 6px 0', color: c.text, fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
            {entry.question_text}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 11 }}>
              {dateStr} · {timeStr}
            </span>
            <span style={{ color: confColor, fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {entry.confidence_level}
            </span>
            <span style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 11 }}>
              {entry.citations.length} source{entry.citations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Pin button */}
        <button
          onClick={e => { e.stopPropagation(); onTogglePin() }}
          title={entry.is_pinned ? 'Unpin' : 'Pin this answer'}
          style={{
            flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 6px',
            color: entry.is_pinned ? c.gold : c.textFaint,
            transition: 'color 0.15s',
          }}
        >
          {entry.is_pinned ? '★' : '☆'}
        </button>

        {/* Chevron */}
        <span style={{ color: c.textFaint, fontSize: 12, flexShrink: 0, marginTop: 2, transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </div>

      {isExpanded && <ExpandedEntry entry={entry} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [entries, setEntries]               = useState<HistoryEntry[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [search, setSearch]                 = useState('')
  const [filter, setFilter]                 = useState<'all' | 'pinned'>('all')
  const [associationName, setAssociationName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: memberships } = await supabase
        .from('association_memberships')
        .select('association_id, associations(id, display_name)')
        .eq('user_id', session.user.id)
        .limit(1)

      const membership = memberships?.[0]
      const assocRaw = membership?.associations as any
      const assoc = Array.isArray(assocRaw) ? assocRaw[0] : assocRaw
      if (assoc) setAssociationName(assoc.display_name)
      const associationId = assoc?.id

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

  return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        padding: '16px 32px',
        borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(12,21,37,0.95)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: c.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Answer History
          </span>
          <span style={{ color: c.border }}>|</span>
          <span style={{ color: c.textDim, fontFamily: 'Cormorant Garamond,serif', fontSize: 16 }}>
            {associationName}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/meeting-mode" style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 12, textDecoration: 'none' }}>
            ← Meeting Mode
          </a>
          <a href="/dashboard" style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 12, textDecoration: 'none' }}>
            Dashboard
          </a>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 860, width: '100%', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 6px 0', color: c.text, fontFamily: 'Cormorant Garamond,serif', fontSize: 32, fontWeight: 600 }}>
            Answer History
          </h1>
          <p style={{ margin: '0 0 24px 0', color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 13 }}>
            All questions asked and answers returned for this association.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 200,
                padding: '9px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                color: c.text,
                fontFamily: 'DM Sans,sans-serif', fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '9px 16px', borderRadius: 6,
                border: `1px solid ${filter === 'all' ? c.goldBorder : c.border}`,
                background: filter === 'all' ? c.goldDim : 'transparent',
                color: filter === 'all' ? c.gold : c.textFaint,
                fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilter('pinned')}
              style={{
                padding: '9px 16px', borderRadius: 6,
                border: `1px solid ${filter === 'pinned' ? c.goldBorder : c.border}`,
                background: filter === 'pinned' ? c.goldDim : 'transparent',
                color: filter === 'pinned' ? c.gold : c.textFaint,
                fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ★ Pinned ({pinnedCount})
            </button>
          </div>
        </div>

        {loading && (
          <p style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 13 }}>Loading history…</p>
        )}
        {error && (
          <p style={{ color: c.red, fontFamily: 'DM Sans,sans-serif', fontSize: 13 }}>{error}</p>
        )}
        {!loading && !error && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 14 }}>
              {filter === 'pinned'
                ? 'No pinned answers yet. Star an answer to pin it.'
                : 'No questions asked yet. Head to Meeting Mode to get started.'}
            </p>
            <a href="/meeting-mode" style={{ color: c.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 13, textDecoration: 'none' }}>
              Go to Meeting Mode →
            </a>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {filter === 'all' && pinnedCount > 0 && (
              <p style={{ margin: '0 0 4px 0', color: c.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                ★ Pinned
              </p>
            )}

            {visible
              .filter(e => filter === 'all' ? e.is_pinned : true)
              .map(e => (
                <HistoryRow
                  key={e.answer_id}
                  entry={e}
                  isExpanded={expandedId === e.answer_id}
                  onToggle={() => setExpandedId(prev => prev === e.answer_id ? null : e.answer_id)}
                  onTogglePin={() => togglePin(e)}
                />
              ))}

            {filter === 'all' && entries.filter(e => !e.is_pinned).length > 0 && (
              <>
                {pinnedCount > 0 && (
                  <p style={{ margin: '12px 0 4px 0', color: c.textFaint, fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    All Questions
                  </p>
                )}
                {entries.filter(e => !e.is_pinned).map(e => (
                  <HistoryRow
                    key={e.answer_id}
                    entry={e}
                    isExpanded={expandedId === e.answer_id}
                    onToggle={() => setExpandedId(prev => prev === e.answer_id ? null : e.answer_id)}
                    onTogglePin={() => togglePin(e)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}