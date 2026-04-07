'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import AppNavbar from '../components/AppNavbar'

interface DocSummary {
  id: string
  title: string
  document_type: string
  parse_status: string
  created_at: string
  section_count?: number
}

interface DocDetail {
  section_count: number
  page_count: number | null
}

interface RecentQuestion {
  id: string
  question_text: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [associationName, setAssociationName] = useState<string | null>(null)
  const [associationId, setAssociationId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocSummary[]>([])
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([])
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [docDetails, setDocDetails] = useState<Record<string, DocDetail>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id

      const memberships = await supabase
        .from('association_memberships')
        .select('association_id')
        .eq('user_id', userId)
      const assocId = memberships.data?.[0]?.association_id ?? null
      if (!assocId) { setLoading(false); return }
      setAssociationId(assocId)

      const assocResult = await supabase
        .from('associations')
        .select('legal_name, display_name')
        .eq('id', assocId)
      const assoc = assocResult.data?.[0]
      setAssociationName(assoc?.display_name ?? assoc?.legal_name ?? 'Your Association')

      const docsResult = await supabase
        .from('documents')
        .select('id, title, document_type, parse_status, created_at')
        .eq('association_id', assocId)
        .order('created_at', { ascending: false })
      setDocuments(docsResult.data ?? [])

      const questionsResult = await supabase
        .from('question_sessions')
        .select('id, question_text, created_at')
        .eq('association_id', assocId)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentQuestions(questionsResult.data ?? [])

      setLoading(false)
    }
    load()
  }, [router])

  async function toggleDoc(docId: string) {
    if (expandedDoc === docId) { setExpandedDoc(null); return }
    setExpandedDoc(docId)
    if (docDetails[docId]) return

    setLoadingDetail(docId)
    const sectionsResult = await supabase
      .from('document_sections')
      .select('id, page_start, page_end')
      .eq('document_id', docId)
    const sections = sectionsResult.data ?? []
    const pages = sections.map(s => s.page_end).filter(Boolean)
    const maxPage = pages.length > 0 ? Math.max(...pages) : null
    setDocDetails(prev => ({ ...prev, [docId]: { section_count: sections.length, page_count: maxPage } }))
    setLoadingDetail(null)
  }

  function formatTimeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function statusLabel(status: string): { label: string; color: string; dot: string } {
    switch (status) {
      case 'indexed': return { label: 'Indexed', color: '#2D6A4F', dot: '#40916C' }
      case 'warning': return { label: 'Warning', color: '#92400E', dot: '#D97706' }
      case 'failed': return { label: 'Failed', color: '#7F1D1D', dot: '#DC2626' }
      default: return { label: 'Processing', color: '#374151', dot: '#9CA3AF' }
    }
  }

  function docTypeLabel(type: string): string {
    const map: Record<string, string> = {
      declaration: 'Declaration / CC&Rs',
      bylaws: 'Bylaws',
      rules: 'Rules & Regulations',
      amendment: 'Amendment',
      policy: 'Policy',
      articles: 'Articles of Incorporation',
      other: 'Other',
    }
    return map[type] ?? type
  }

  const sectionStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(26,37,53,0.08)',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)',
    overflow: 'hidden',
    marginBottom: '20px',
  }

  if (loading) {
    return (
      <main style={{ background: '#F8F6F1', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(26,37,53,0.4)', fontSize: '13px', fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>Loading…</p>
      </main>
    )
  }

  return (
    <main style={{ background: '#F8F6F1', minHeight: '100vh', fontFamily: "'Instrument Sans', system-ui, sans-serif", color: '#1A2535' }}>

      <AppNavbar />

      {/* Body */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 40px 80px' }}>

        {/* Association header */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4A054', fontWeight: 500, margin: '0 0 8px' }}>
            Board Workspace
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '38px', fontWeight: 400, color: '#1A2535', margin: '0 0 4px', lineHeight: 1.15 }}>
            {associationName ?? 'Your Association'}
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.45)', margin: 0 }}>
            Governing document intelligence
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

          {/* Left column: Documents */}
          <div>
            <div style={{ ...sectionStyle }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(26,37,53,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 400, color: '#1A2535', margin: '0 0 2px' }}>
                    Governing Documents
                  </h2>
                  <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)', margin: 0 }}>
                    {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
                  </p>
                </div>
                <a href="/documents" style={{ fontSize: '12px', color: '#C4A054', textDecoration: 'none', fontWeight: 500, letterSpacing: '0.02em' }}>
                  Manage →
                </a>
              </div>

              {documents.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.4)', margin: '0 0 16px' }}>No documents uploaded yet.</p>
                  <a href="/documents" style={{ fontSize: '13px', color: '#C4A054', textDecoration: 'none', fontWeight: 500 }}>Upload your first document →</a>
                </div>
              ) : (
                <div>
                  {documents.map((doc, i) => {
                    const status = statusLabel(doc.parse_status)
                    const isExpanded = expandedDoc === doc.id
                    const detail = docDetails[doc.id]
                    const isLoadingThis = loadingDetail === doc.id
                    return (
                      <div key={doc.id}>
                        {/* Document row */}
                        <button
                          onClick={() => toggleDoc(doc.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 24px', background: isExpanded ? 'rgba(196,160,84,0.04)' : 'transparent',
                            border: 'none', borderBottom: i < documents.length - 1 || isExpanded ? '1px solid rgba(26,37,53,0.05)' : 'none',
                            cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1A2535', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(26,37,53,0.45)' }}>
                              {docTypeLabel(doc.document_type)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.dot }} />
                              <span style={{ fontSize: '11px', color: status.color, fontWeight: 500 }}>{status.label}</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(26,37,53,0.3)', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                          </div>
                        </button>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div style={{ padding: '16px 24px 20px', background: 'rgba(248,246,241,0.7)', borderBottom: i < documents.length - 1 ? '1px solid rgba(26,37,53,0.05)' : 'none' }}>
                            {isLoadingThis ? (
                              <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)', margin: 0 }}>Loading details…</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <DetailStat label="Sections Indexed" value={detail ? String(detail.section_count) : '—'} />
                                <DetailStat label="Pages" value={detail?.page_count ? String(detail.page_count) : '—'} />
                                <DetailStat label="Uploaded" value={formatDate(doc.created_at)} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Ask + Recent Questions */}
          <div>
            {/* Ask a Question */}
            
            <a  href="/meeting-mode"
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: '#1A2535', color: '#F8F6F1',
                textDecoration: 'none', padding: '18px 24px',
                borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                letterSpacing: '0.02em', textAlign: 'center',
                boxShadow: '0 4px 16px rgba(26,37,53,0.18)',
                marginBottom: '16px',
              }}
            >
              Ask a Question
            </a>

            
            <a  href="/documents"
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: 'transparent', color: '#1A2535',
                textDecoration: 'none', padding: '14px 24px',
                borderRadius: '8px', fontSize: '13px', fontWeight: 400,
                letterSpacing: '0.02em', textAlign: 'center',
                border: '1px solid rgba(26,37,53,0.18)',
                marginBottom: '24px',
              }}
            >
              Upload Document
            </a>

            {/* Recent Questions */}
            <div style={{ ...sectionStyle }}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(26,37,53,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 400, color: '#1A2535', margin: 0 }}>
                  Recent Questions
                </h2>
                <a href="/history" style={{ fontSize: '11px', color: '#C4A054', textDecoration: 'none', fontWeight: 500 }}>
                  View all →
                </a>
              </div>
              <div style={{ padding: '8px 0' }}>
                {recentQuestions.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)', margin: '0 0 8px' }}>No questions yet.</p>
                    <a href="/meeting-mode" style={{ fontSize: '12px', color: '#C4A054', textDecoration: 'none' }}>Try Meeting Mode →</a>
                  </div>
                ) : recentQuestions.map((q, i) => (
                  <div key={q.id} style={{ padding: '12px 20px', borderBottom: i < recentQuestions.length - 1 ? '1px solid rgba(26,37,53,0.05)' : 'none' }}>
                    <p style={{ fontSize: '13px', color: '#1A2535', lineHeight: 1.45, margin: '0 0 4px' }}>
                      {q.question_text.length > 70 ? q.question_text.slice(0, 70) + '…' : q.question_text}
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(26,37,53,0.35)', margin: 0 }}>
                      {formatTimeAgo(q.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </main>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,37,53,0.4)', marginBottom: '4px', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontFamily: "'Cormorant Garamond', serif", color: '#1A2535', fontWeight: 400 }}>
        {value}
      </div>
    </div>
  )
}