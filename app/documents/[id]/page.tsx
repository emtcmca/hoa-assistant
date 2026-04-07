'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '../../utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppNavbar from '../../components/AppNavbar'

const supabase = createClient()

// ─── Design System ────────────────────────────────────────────────────────────
const C = {
  bg:           '#F8F6F1',
  surface:      '#FFFFFF',
  text:         '#1A2535',
  muted:        'rgba(26,37,53,0.45)',
  gold:         '#C4A054',
  border:       'rgba(26,37,53,0.08)',
  shadow:       '0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)',
  sidebar:      '#F0EDE6',
  sidebarBorder:'rgba(26,37,53,0.10)',
  success:      '#40916C',
  successText:  '#2D6A4F',
  warning:      '#D97706',
  danger:       '#DC2626',
}

const DOCUMENT_TYPES: Record<string, string> = {
  declaration: 'Declaration / CC&Rs',
  bylaws:      'Bylaws',
  articles:    'Articles of Incorporation',
  rules:       'Rules & Regulations',
  policy:      'Policy / Resolution',
  amendment:   'Amendment',
  other:       'Other',
}

// ─── Types matching actual DB columns ─────────────────────────────────────────
type Section = {
  id: string
  section_path: string | null
  section_number: string | null
  heading: string | null
  body_text: string
  page_start: number | null
  page_end: number | null
  sequence_index: number | null
  citation_label: string | null
  parser_confidence: number | null
}

type DocumentMeta = {
  id: string
  title: string
  document_type: string
  parse_status: string
  effective_date: string | null
  original_filename: string
  parser_warning_count: number
  created_at: string
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()

  const [doc, setDoc]           = useState<DocumentMeta | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    loadDocument()
  }, [id])

  async function loadDocument() {
    setLoading(true)

    // Get current user + association_id for RLS-scoped queries
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: memberships } = await supabase
      .from('association_memberships')
      .select('association_id')
      .eq('user_id', user.id)
    const associationId = memberships?.[0]?.association_id
    if (!associationId) { setLoading(false); return }

    // Fetch document
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('association_id', associationId)
    const docData = docs?.[0] ?? null
    setDoc(docData)

    if (docData) {
      // Fetch sections using actual DB column names
      const { data: secs } = await supabase
        .from('document_sections')
        .select('id, section_path, section_number, heading, body_text, page_start, page_end, sequence_index, citation_label, parser_confidence')
        .eq('document_id', id)
        .eq('association_id', associationId)
        .order('sequence_index', { ascending: true })

      const sectionList = secs ?? []
      setSections(sectionList)
      if (sectionList.length > 0) setActiveId(sectionList[0].id)
    }

    setLoading(false)
  }

  const activeSection = sections.find(s => s.id === activeId) ?? null

  function copyCitation() {
    if (!activeSection || !doc) return
    const label = activeSection.citation_label ?? activeSection.section_path ?? ''
    const heading = activeSection.heading ?? ''
    const citation = `${label} ${heading} — ${doc.title}`.trim()
    navigator.clipboard.writeText(citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function confidenceColor(val: number) {
    if (val >= 0.8) return C.success
    if (val >= 0.5) return C.warning
    return C.danger
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const shellStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: C.bg,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  }

  const docHeaderStyle: React.CSSProperties = {
    backgroundColor: C.surface,
    borderBottom: `1px solid ${C.border}`,
    padding: '20px 40px',
    flexShrink: 0,
  }

  const contentAreaStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  }

  const sidebarStyle: React.CSSProperties = {
    width: 260,
    backgroundColor: C.sidebar,
    borderRight: `1px solid ${C.sidebarBorder}`,
    overflowY: 'auto',
    flexShrink: 0,
    padding: '8px 0',
  }

  const mainStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '40px 48px',
  }

  if (loading) {
    return (
      <div style={shellStyle}>
        <div style={{ padding: 40, color: C.muted, fontSize: 14 }}>Loading document…</div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div style={shellStyle}>
        <div style={{ padding: 40 }}>
          <p style={{ color: C.danger, fontSize: 14 }}>Document not found.</p>
          <Link href="/documents" style={{ color: C.gold, fontSize: 14 }}>← Back to Documents</Link>
        </div>
      </div>
    )
  }

  const typeLabel = DOCUMENT_TYPES[doc.document_type] ?? doc.document_type

  const typePillStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: C.gold,
    backgroundColor: 'rgba(196,160,84,0.10)',
    border: '1px solid rgba(196,160,84,0.25)',
    borderRadius: 4,
    padding: '2px 8px',
    letterSpacing: '0.04em',
  }

  const statusDotStyle: React.CSSProperties = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: (doc.parse_status === 'indexed' || doc.parse_status === 'active') ? C.success : C.warning,
    display: 'inline-block',
    marginRight: 5,
  }

  const copyBtnStyle: React.CSSProperties = {
    backgroundColor: copied ? C.success : C.surface,
    color: copied ? '#fff' : C.text,
    border: `1px solid ${copied ? C.success : C.border}`,
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  return (
    <div style={shellStyle}>

      <AppNavbar />

      {/* ── Document header ── */}
      <div style={docHeaderStyle}>
        <div style={{ marginBottom: 10 }}>
          <Link href="/documents" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>
            ← Back to Documents
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.2 }}>
            {doc.title}
          </h1>
          <span style={typePillStyle}>{typeLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 12, color: C.muted, flexWrap: 'wrap' }}>
          <span>
            <span style={statusDotStyle} />
            {sections.length} sections indexed
          </span>
          {doc.effective_date && <span>Effective {doc.effective_date}</span>}
          {doc.parser_warning_count > 0 && (
            <span style={{ color: C.warning, fontWeight: 600 }}>
              ⚠ {doc.parser_warning_count} warning{doc.parser_warning_count > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ opacity: 0.6 }}>{doc.original_filename}</span>
        </div>
      </div>

      {/* ── Two-column content area ── */}
      <div style={contentAreaStyle}>

        {/* ── Sidebar ── */}
        <div style={sidebarStyle}>
          {sections.length === 0 ? (
            <p style={{ padding: '16px 20px', fontSize: 13, color: C.muted }}>No sections indexed.</p>
          ) : (
            sections.map(sec => {
              const isActive = sec.id === activeId
              const itemStyle: React.CSSProperties = {
                display: 'block',
                padding: '9px 16px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(196,160,84,0.12)' : 'transparent',
                borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
              }
              const topLabelStyle: React.CSSProperties = {
                fontSize: 11,
                fontWeight: 700,
                color: isActive ? C.gold : C.muted,
                letterSpacing: '0.04em',
                marginBottom: 2,
              }
              const secLabelStyle: React.CSSProperties = {
                fontSize: 12,
                color: isActive ? C.text : 'rgba(26,37,53,0.6)',
                fontWeight: isActive ? 600 : 400,
                lineHeight: 1.35,
              }
              return (
                <div key={sec.id} style={itemStyle} onClick={() => setActiveId(sec.id)}>
                  <div style={topLabelStyle}>
                    {sec.citation_label ?? sec.section_path ?? ''}
                  </div>
                  <div style={secLabelStyle}>
                    {sec.heading ?? sec.section_path ?? sec.section_number ?? '—'}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Main content panel ── */}
        <div style={mainStyle}>
          {!activeSection ? (
            <p style={{ color: C.muted, fontSize: 14 }}>Select a section from the list.</p>
          ) : (
            <>
              {/* Section label */}
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 13, color: C.gold, letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
                {activeSection.citation_label ?? activeSection.section_path ?? ''}
              </div>

              {/* Section heading */}
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: C.text, margin: '0 0 16px', lineHeight: 1.2 }}>
                {activeSection.heading ?? activeSection.section_path ?? ''}
              </h2>

              {/* Parse confidence bar */}
              {activeSection.parser_confidence !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 180, height: 5, backgroundColor: 'rgba(26,37,53,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((activeSection.parser_confidence ?? 0) * 100)}%`, height: '100%', backgroundColor: confidenceColor(activeSection.parser_confidence ?? 0), borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                    {Math.round((activeSection.parser_confidence ?? 0) * 100)}% parse confidence
                  </span>
                </div>
              )}

              {/* Divider */}
              <div style={{ width: 48, height: 2, backgroundColor: C.gold, borderRadius: 1, opacity: 0.4, marginBottom: 24 }} />

              {/* Body text */}
              <div style={{ fontSize: 15, lineHeight: 1.75, color: C.text, maxWidth: 680, marginBottom: 36, whiteSpace: 'pre-wrap' }}>
                {activeSection.body_text}
              </div>

              {/* Page reference */}
              {activeSection.page_start && (
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 28 }}>
                  Pages {activeSection.page_start}{activeSection.page_end && activeSection.page_end !== activeSection.page_start ? `–${activeSection.page_end}` : ''}
                </div>
              )}

              {/* Copy citation */}
              <button onClick={copyCitation} style={copyBtnStyle}>
                {copied ? '✓ Copied' : '⎘ Copy Citation'}
              </button>

              {/* Citation preview */}
              <div style={{ marginTop: 12, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                {activeSection.citation_label ?? ''} {activeSection.heading ?? ''} — {doc.title}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}