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
  authority_rank: number | null
  effective_date: string | null
}

interface DocDetail {
  section_count: number
  embedded_count: number
  avg_confidence: number | null
}

interface RecentQuestion {
  id: string
  question_text: string
  created_at: string
}

interface Stats {
  corpusDocs: number
  sectionsIndexed: number
  questionsAsked: number
  boardSessions: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading]                 = useState(true)
  const [associationName, setAssociationName] = useState<string | null>(null)
  const [associationId, setAssociationId]     = useState<string | null>(null)
  const [documents, setDocuments]             = useState<DocSummary[]>([])
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([])
  const [expandedDoc, setExpandedDoc]         = useState<string | null>(null)
  const [docDetails, setDocDetails]           = useState<Record<string, DocDetail>>({})
  const [loadingDetail, setLoadingDetail]     = useState<string | null>(null)
  const [showTourBanner, setShowTourBanner]   = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [stats, setStats]                     = useState<Stats>({ corpusDocs: 0, sectionsIndexed: 0, questionsAsked: 0, boardSessions: 0 })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id

      const profileResult = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', userId)
      const profile = profileResult.data?.[0]
      if (!profile?.onboarding_completed_at) setShowTourBanner(true)

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
        .select('id, title, document_type, parse_status, created_at, authority_rank, effective_date')
        .eq('association_id', assocId)
        .neq('document_status', 'inactive')
        .order('created_at', { ascending: false })
      const docs = docsResult.data ?? []
      setDocuments(docs)

      const [sectionsRes, questionsRes, sessionsRes] = await Promise.all([
        supabase.from('document_sections').select('id', { count: 'exact', head: true }).eq('association_id', assocId),
        supabase.from('question_sessions').select('id', { count: 'exact', head: true }).eq('association_id', assocId),
        supabase.from('meeting_sessions').select('id', { count: 'exact', head: true }).eq('association_id', assocId),
      ])
      setStats({
        corpusDocs:      docs.length,
        sectionsIndexed: sectionsRes.count  ?? 0,
        questionsAsked:  questionsRes.count ?? 0,
        boardSessions:   sessionsRes.count  ?? 0,
      })

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

    const handleVisibility = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [router])

  async function handleDismissBanner() {
    setShowTourBanner(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', session.user.id)
    }
  }

  async function handleDeleteDoc(docId: string) {
    setDeletingId(docId)
    await supabase.from('documents').update({ document_status: 'inactive' }).eq('id', docId)
    setDocuments(prev => prev.filter(d => d.id !== docId))
    setStats(prev => ({ ...prev, corpusDocs: prev.corpusDocs - 1 }))
    setExpandedDoc(null)
    setConfirmDeleteId(null)
    setDeletingId(null)
  }

  async function toggleDoc(docId: string) {
    if (expandedDoc === docId) { setExpandedDoc(null); return }
    setExpandedDoc(docId)
    setConfirmDeleteId(null)
    if (docDetails[docId]) return

    setLoadingDetail(docId)
    const [sectionsResult, embeddedResult] = await Promise.all([
      supabase.from('document_sections').select('id, parser_confidence').eq('document_id', docId),
      supabase.from('document_sections').select('id', { count: 'exact', head: true }).eq('document_id', docId).not('embedding', 'is', null),
    ])
    const sections    = sectionsResult.data ?? []
    const confidences = sections.map((s: any) => s.parser_confidence).filter((c: any) => c !== null && c !== undefined)
    const avgConf     = confidences.length > 0
      ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
      : null
    setDocDetails(prev => ({
      ...prev,
      [docId]: { section_count: sections.length, embedded_count: embeddedResult.count ?? 0, avg_confidence: avgConf },
    }))
    setLoadingDetail(null)
  }

  function formatTimeAgo(isoString: string): string {
    const diff    = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours   = Math.floor(diff / 3600000)
    const days    = Math.floor(diff / 86400000)
    if (minutes < 1)  return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24)   return `${hours}h ago`
    return `${days}d ago`
  }

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function statusLabel(status: string): { label: string; color: string; dot: string } {
    switch (status) {
      case 'complete':
      case 'indexed':  return { label: 'Indexed',    color: '#2D6A4F', dot: '#40916C' }
      case 'warning':  return { label: 'Warning',    color: '#92400E', dot: '#D97706' }
      case 'failed':   return { label: 'Failed',     color: '#7F1D1D', dot: '#DC2626' }
      default:         return { label: 'Processing', color: '#374151', dot: '#9CA3AF' }
    }
  }

  function docTypeLabel(type: string): string {
    const map: Record<string, string> = {
      declaration: 'Declaration / CC&Rs',
      bylaws:      'Bylaws',
      rules:       'Rules & Regulations',
      amendment:   'Amendment',
      policy:      'Policy',
      articles:    'Articles of Incorporation',
      other:       'Other',
    }
    return map[type] ?? type
  }

  function authorityLabel(rank: number | null): string {
    if (rank === 1)  return 'Statute'
    if (rank === 10) return 'Declaration / CC&Rs'
    if (rank === 20) return 'Bylaws'
    if (rank === 30) return 'Rules & Policy'
    return '—'
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    background: '#F8F6F1',
    minHeight: '100vh',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    color: '#1A2535',
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '48px 40px 80px',
  }

  const statsRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  }

  const mainGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
    alignItems: 'start',
    marginBottom: '24px',
  }

  const sectionStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(26,37,53,0.08)',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)',
    overflow: 'hidden',
    marginBottom: '20px',
  }

  const comingSoonRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  }

  const tourBannerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(196,160,84,0.08)',
    border: '1px solid rgba(196,160,84,0.3)',
    borderRadius: '8px',
    padding: '14px 20px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  }

  const tourBannerActionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  }

  const tourBannerLinkStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#A8872E',
    textDecoration: 'none',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const tourBannerDismissStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: 'rgba(26,37,53,0.4)',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    padding: 0,
  }

  const deleteConfirmStyle: React.CSSProperties = {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: 'rgba(220,38,38,0.04)',
    border: '1px solid rgba(220,38,38,0.15)',
    borderRadius: '6px',
  }

  const deleteConfirmActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  }

  const deleteConfirmYesStyle: React.CSSProperties = {
    background: '#DC2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '5px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const deleteConfirmCancelStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid rgba(26,37,53,0.2)',
    borderRadius: '5px',
    padding: '6px 14px',
    fontSize: '12px',
    color: '#1A2535',
    cursor: 'pointer',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const removeDocBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'rgba(220,38,38,0.7)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '8px 0 0',
    textDecoration: 'underline',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    display: 'block',
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    const loadingWrapStyle: React.CSSProperties = {
      background: '#F8F6F1',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
    return (
      <main style={loadingWrapStyle}>
        <p style={{ color: 'rgba(26,37,53,0.4)', fontSize: '13px', fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>Loading…</p>
      </main>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main style={pageStyle}>
      <AppNavbar />
      <div style={containerStyle}>

        {/* Association header */}
        <div style={{ marginBottom: '32px' }}>
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

        {/* Tour banner */}
        {showTourBanner && (
          <div style={tourBannerStyle}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A2535' }}>New to BoardPath? </span>
              <span style={{ fontSize: '13px', color: 'rgba(26,37,53,0.6)' }}>Take the 2-minute tour to see how it works.</span>
            </div>
            <div style={tourBannerActionsStyle}>
              <a href="/onboarding?mode=tour" style={tourBannerLinkStyle}>Take the tour →</a>
              <button onClick={handleDismissBanner} style={tourBannerDismissStyle}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={statsRowStyle}>
          <StatCard
            label="Corpus"
            primary={`${stats.corpusDocs} document${stats.corpusDocs !== 1 ? 's' : ''}`}
            secondary={`${stats.sectionsIndexed.toLocaleString()} sections indexed`}
          />
          <StatCard
            label="Questions Asked"
            primary={stats.questionsAsked.toLocaleString()}
            secondary="across all sessions"
          />
          <StatCard
            label="Board Sessions"
            primary={stats.boardSessions.toLocaleString()}
            secondary="meeting sessions recorded"
          />
        </div>

        {/* Main two-column grid */}
        <div style={mainGridStyle}>

          {/* Left: Documents */}
          <div>
            <div style={sectionStyle}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(26,37,53,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 400, color: '#1A2535', margin: '0 0 2px' }}>
                    Governing Documents
                  </h2>
                  <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)', margin: 0 }}>
                    {documents.length} document{documents.length !== 1 ? 's' : ''} in corpus
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
                    const status        = statusLabel(doc.parse_status)
                    const isExpanded    = expandedDoc === doc.id
                    const detail        = docDetails[doc.id]
                    const isLoadingThis = loadingDetail === doc.id

                    const rowBtnStyle: React.CSSProperties = {
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      background: isExpanded ? 'rgba(196,160,84,0.04)' : 'transparent',
                      border: 'none',
                      borderBottom: i < documents.length - 1 || isExpanded ? '1px solid rgba(26,37,53,0.05)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }

                    const chevronStyle: React.CSSProperties = {
                      fontSize: '12px',
                      color: 'rgba(26,37,53,0.3)',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      display: 'inline-block',
                      transition: 'transform 0.2s',
                    }

                    const detailPanelStyle: React.CSSProperties = {
                      padding: '16px 24px 20px',
                      background: 'rgba(248,246,241,0.7)',
                      borderBottom: i < documents.length - 1 ? '1px solid rgba(26,37,53,0.05)' : 'none',
                    }

                    return (
                      <div key={doc.id}>
                        <button onClick={() => toggleDoc(doc.id)} style={rowBtnStyle}>
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
                            <span style={chevronStyle}>▾</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div style={detailPanelStyle}>
                            {isLoadingThis ? (
                              <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)', margin: 0 }}>Loading details…</p>
                            ) : (
                              <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                  <DetailStat label="Sections Indexed"   value={detail ? String(detail.section_count) : '—'} />
                                  <DetailStat label="Sections Embedded"  value={detail ? String(detail.embedded_count) : '—'} />
                                  <DetailStat label="Parse Confidence"   value={detail?.avg_confidence != null ? `${Math.round(detail.avg_confidence * 100)}%` : '—'} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                  <DetailStat label="Authority"     value={authorityLabel(doc.authority_rank)} small />
                                  <DetailStat label="Uploaded"      value={formatDate(doc.created_at)} small />
                                  <DetailStat label="Effective Date" value={doc.effective_date ? formatDate(doc.effective_date) : '—'} small />
                                </div>

                                {confirmDeleteId === doc.id ? (
                                  <div style={deleteConfirmStyle}>
                                    <p style={{ fontSize: '12px', color: '#7F1D1D', margin: 0, lineHeight: 1.5 }}>
                                      You are about to remove <strong>{doc.title}</strong> from your governing document corpus.
                                      BoardPath grounds every answer in the documents you have uploaded. Removing a document —
                                      particularly a Declaration, CC&Rs, or Bylaws — may cause the Q&amp;A system to return
                                      incomplete, unsupported, or materially incorrect answers on questions that relied on it.
                                      This action does not delete the original file, but it will be excluded from all retrieval
                                      immediately. You can restore access by re-uploading the document at any time.
                                    </p>
                                    <div style={deleteConfirmActionsStyle}>
                                      <button onClick={() => handleDeleteDoc(doc.id)} disabled={deletingId === doc.id} style={deleteConfirmYesStyle}>
                                        {deletingId === doc.id ? 'Removing…' : 'Yes, remove'}
                                      </button>
                                      <button onClick={() => setConfirmDeleteId(null)} style={deleteConfirmCancelStyle}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmDeleteId(doc.id)} style={removeDocBtnStyle}>
                                    Remove from corpus
                                  </button>
                                )}
                              </>
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

          {/* Right: Quick Actions + Recent Questions */}
          <div>
            <div style={sectionStyle}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(26,37,53,0.06)' }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 400, color: '#1A2535', margin: 0 }}>
                  Quick Actions
                </h2>
              </div>
              <div>
                <QuickAction href="/meeting-mode" title="Ask a Question"   description="Query your governing documents with cited answers" primary />
                <QuickAction href="/documents"    title="Upload Document"  description="Add a governing document to your corpus" />
                <QuickAction href="/history"      title="Answer History"   description="Review and pin past Q&A sessions" />
                <QuickAction href="/homeowners"   title="Draft a Notice"   description="Generate violation letters and board correspondence on letterhead" last />
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(26,37,53,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 400, color: '#1A2535', margin: 0 }}>
                  Recent Questions
                </h2>
                <a href="/history" style={{ fontSize: '11px', color: '#C4A054', textDecoration: 'none', fontWeight: 500 }}>View all →</a>
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

        {/* Coming Soon row */}
        <div style={comingSoonRowStyle}>
          <ComingSoonCard
            title="Warning Center"
            description="Flags parse quality issues, hierarchy conflicts, and corpus gaps across your document library."
          />
          <ComingSoonCard
            title="Homeowner Roster"
            description="Upload owner data to auto-populate violation letters and board correspondence."
          />
        </div>

      </div>
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, primary, secondary }: { label: string; primary: string; secondary: string }) {
  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(26,37,53,0.08)',
    borderRadius: '8px',
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(26,37,53,0.05)',
  }
  return (
    <div style={cardStyle}>
      <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4A054', fontWeight: 500, margin: '0 0 8px', fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 400, color: '#1A2535', margin: '0 0 4px', lineHeight: 1 }}>
        {primary}
      </p>
      <p style={{ fontSize: '11px', color: 'rgba(26,37,53,0.4)', margin: 0, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        {secondary}
      </p>
    </div>
  )
}

function DetailStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,37,53,0.4)', marginBottom: '4px', fontWeight: 500, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: small ? '13px' : '18px', fontFamily: "'Cormorant Garamond', serif", color: '#1A2535', fontWeight: 400 }}>
        {value}
      </div>
    </div>
  )
}

function QuickAction({ href, title, description, primary, last }: { href: string; title: string; description: string; primary?: boolean; last?: boolean }) {
  const actionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    textDecoration: 'none',
    borderBottom: last ? 'none' : '1px solid rgba(26,37,53,0.05)',
    background: primary ? 'rgba(26,37,53,0.02)' : 'transparent',
    transition: 'background 0.15s',
  }
  return (
    <a href={href} style={actionStyle}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: primary ? 600 : 500, color: '#1A2535', margin: '0 0 2px', fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
          {title}
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(26,37,53,0.5)', margin: 0, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
          {description}
        </p>
      </div>
      <span style={{ fontSize: '14px', color: primary ? '#C4A054' : 'rgba(26,37,53,0.25)', marginLeft: '12px', flexShrink: 0 }}>→</span>
    </a>
  )
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(26,37,53,0.08)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(26,37,53,0.05)',
    opacity: 0.75,
  }
  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: '9px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(26,37,53,0.4)',
    background: 'rgba(26,37,53,0.05)',
    borderRadius: '3px',
    padding: '3px 7px',
    fontWeight: 600,
    marginBottom: '10px',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }
  return (
    <div style={cardStyle}>
      <div style={badgeStyle}>Coming Soon</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 400, color: '#1A2535', margin: '0 0 8px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.5)', margin: 0, lineHeight: 1.55, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        {description}
      </p>
    </div>
  )
}