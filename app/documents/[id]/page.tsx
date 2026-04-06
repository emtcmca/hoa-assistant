// app/documents/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'
import Link from 'next/link'

// --- Types ---
interface Document {
  id: string
  title: string
  document_type: string
  document_status: string
  authority_rank: number
  effective_date: string | null
  original_filename: string
  parser_warning_count: number
}

interface Section {
  id: string
  section_path: string
  section_number: string | null
  heading: string | null
  body_text: string
  page_start: number | null
  page_end: number | null
  sequence_index: number
  citation_label: string | null
  parser_confidence: number | null
}

// --- Authority badge helper ---
function AuthorityBadge({ rank }: { rank: number }) {
  const map: Record<number, { label: string; color: string }> = {
    10: { label: 'Declaration / CC&Rs', color: '#C4A054' },
    20: { label: 'Bylaws', color: '#81E6D9' },
    30: { label: 'Rules / Policies', color: '#94A3B8' },
    99: { label: 'Other', color: '#6B7280' },
  }
  const badge = map[rank] ?? map[99]
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 600,
      color: badge.color,
      border: `1px solid ${badge.color}`,
      borderRadius: '4px',
      padding: '2px 8px',
      letterSpacing: '0.05em',
    }}>
      {badge.label}
    </span>
  )
}

// --- Document type label ---
function docTypeLabel(type: string) {
  const map: Record<string, string> = {
    declaration: 'Declaration / CC&Rs',
    bylaws: 'Bylaws',
    rules: 'Rules & Policies',
    amendment: 'Amendment',
    other: 'Other',
  }
  return map[type] ?? type
}

// --- Confidence indicator ---
function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: '#6B7280', fontSize: '12px' }}>No confidence data</span>
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? '#4ADE80' : pct >= 50 ? '#FBBF24' : '#F87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '80px', height: '6px', background: '#1E2D45', borderRadius: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', color }}>{pct}% parse confidence</span>
    </div>
  )
}

// --- Main Page ---
export default function DocumentSectionViewer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const supabase = createClient()

  const [doc, setDoc] = useState<Document | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      // 1. Check auth
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // 2. Get user's association
      const { data: memberships } = await supabase
        .from('association_memberships')
        .select('association_id')
        .eq('user_id', session.user.id)

      const associationId = memberships?.[0]?.association_id
      if (!associationId) { setError('No association found.'); setLoading(false); return }

      // 3. Load document — verify it belongs to user's association
      const { data: docData, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('association_id', associationId)
        .single()

      if (docErr || !docData) {
        setError('Document not found or access denied.')
        setLoading(false)
        return
      }
      setDoc(docData)

      // 4. Load all sections for this document
      const { data: sectionData, error: secErr } = await supabase
        .from('document_sections')
        .select('id, section_path, section_number, heading, body_text, page_start, page_end, sequence_index, citation_label, parser_confidence')
        .eq('document_id', id)
        .eq('association_id', associationId)
        .order('sequence_index', { ascending: true })

      if (secErr) { setError('Failed to load sections.'); setLoading(false); return }

      setSections(sectionData ?? [])
      if (sectionData && sectionData.length > 0) setActiveSection(sectionData[0])
      setLoading(false)
    }
    load()
  }, [id])

  function copyCitation() {
    if (!activeSection || !doc) return
    const label = activeSection.citation_label ?? activeSection.section_number ?? ''
    const heading = activeSection.heading ?? ''
    const text = `${label} ${heading} — ${doc.title}`.trim()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // --- Render states ---
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0C1525', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8E4DC', fontFamily: 'DM Sans, sans-serif' }}>
      Loading document...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0C1525', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F87171', fontFamily: 'DM Sans, sans-serif' }}>
      {error}
    </div>
  )

  if (!doc) return null

  // --- Main layout ---
  return (
    <div style={{ minHeight: '100vh', background: '#0C1525', color: '#E8E4DC', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #1E2D45', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link href="/documents" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>
          ← Back to Documents
        </Link>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontFamily: 'Cormorant Garamond, serif', color: '#E8E4DC' }}>
              {doc.title}
            </h1>
            <AuthorityBadge rank={doc.authority_rank} />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{docTypeLabel(doc.document_type)}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
            {doc.effective_date && <span>Effective: {new Date(doc.effective_date).toLocaleDateString()}</span>}
            <span>{sections.length} sections parsed</span>
            {doc.parser_warning_count > 0 && (
              <span style={{ color: '#FBBF24' }}>⚠ {doc.parser_warning_count} parser warnings</span>
            )}
          </div>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 80px)' }}>

        {/* Left: section tree */}
        <div style={{ width: '280px', borderRight: '1px solid #1E2D45', overflowY: 'auto', padding: '8px 0', flexShrink: 0 }}>
          {sections.length === 0 && (
            <div style={{ padding: '24px 16px', color: '#6B7280', fontSize: '13px' }}>No sections found.</div>
          )}
          {sections.map(sec => {
            const isActive = activeSection?.id === sec.id
            const label = sec.citation_label ?? sec.section_number ?? `#${sec.sequence_index + 1}`
            const heading = sec.heading ?? '(untitled section)'
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: isActive ? '#132032' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #C4A054' : '3px solid transparent',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  color: isActive ? '#E8E4DC' : '#94A3B8',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ color: '#C4A054', fontWeight: 600, marginRight: '6px', fontSize: '11px' }}>
                  {label}
                </span>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                  {heading}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right: section content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          {!activeSection ? (
            <div style={{ color: '#6B7280', fontSize: '15px', marginTop: '60px', textAlign: 'center' }}>
              Select a section from the left to read its full text.
            </div>
          ) : (
            <div style={{ maxWidth: '760px' }}>

              {/* Citation label + heading */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#C4A054', fontWeight: 700, marginBottom: '8px' }}>
                  {activeSection.citation_label ?? activeSection.section_number ?? ''}
                </div>
                <div style={{ fontSize: '20px', color: '#E8E4DC', fontWeight: 600, marginBottom: '12px' }}>
                  {activeSection.heading ?? '(untitled section)'}
                </div>

                {/* Metadata row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <ConfidenceBar score={activeSection.parser_confidence} />
                  {(activeSection.page_start || activeSection.page_end) && (
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      Page {activeSection.page_start}{activeSection.page_end && activeSection.page_end !== activeSection.page_start ? `–${activeSection.page_end}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #1E2D45', marginBottom: '24px' }} />

              {/* Body text */}
              <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#E8E4DC', whiteSpace: 'pre-wrap' }}>
                {activeSection.body_text}
              </div>

              {/* Copy citation button */}
              <div style={{ marginTop: '40px' }}>
                <button
                  onClick={copyCitation}
                  style={{
                    background: 'transparent',
                    border: '1px solid #C4A054',
                    color: '#C4A054',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy Citation'}
                </button>
                <span style={{ marginLeft: '12px', fontSize: '12px', color: '#6B7280' }}>
                  {activeSection.citation_label ?? ''} {activeSection.heading ?? ''} — {doc.title}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}