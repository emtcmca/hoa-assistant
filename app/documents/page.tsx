'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ParseProgressModal from '../components/ParseProgressModal'
import Navbar from '../components/AppNavbar'

const C = {
  bg:          '#F8F6F1',
  surface:     '#FFFFFF',
  text:        '#1A2535',
  muted:       'rgba(26,37,53,0.45)',
  gold:        '#C4A054',
  border:      'rgba(26,37,53,0.08)',
  shadow:      '0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)',
  danger:      '#DC2626',
  dangerBg:    '#FEF2F2',
  dangerBorder:'rgba(220,38,38,0.2)',
  warning:     '#D97706',
  warningBg:   '#FFFBEB',
  success:     '#40916C',
}

const DOCUMENT_TYPES = [
  { value: 'declaration', label: 'Declaration / CC&Rs' },
  { value: 'bylaws',      label: 'Bylaws' },
  { value: 'articles',    label: 'Articles of Incorporation' },
  { value: 'rules',       label: 'Rules & Regulations' },
  { value: 'policy',      label: 'Policy / Resolution' },
  { value: 'amendment',   label: 'Amendment' },
  { value: 'other',       label: 'Other' },
]

function typeLabel(value: string) {
  return DOCUMENT_TYPES.find(t => t.value === value)?.label ?? value
}

function StatusIndicator({ status }: { status: string }) {
  const config: Record<string, { dot: string; label: string; color: string }> = {
    pending:    { dot: C.muted,   label: 'Pending',    color: C.muted   },
    processing: { dot: C.gold,    label: 'Processing', color: C.gold    },
    complete:   { dot: C.success, label: 'Indexed',    color: '#2D6A4F' },
    indexed:    { dot: C.success, label: 'Indexed',    color: '#2D6A4F' },
    active:     { dot: C.success, label: 'Indexed',    color: '#2D6A4F' },
    warning:    { dot: C.warning, label: 'Warning',    color: '#92400E' },
    failed:     { dot: C.danger,  label: 'Failed',     color: '#7F1D1D' },
  }
  const s = config[status] ?? { dot: C.muted, label: status, color: C.muted }
  const dotStyle: React.CSSProperties = {
    width: 8, height: 8, borderRadius: '50%', backgroundColor: s.dot, flexShrink: 0,
  }
  const wrapStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 600, color: s.color, letterSpacing: '0.03em',
  }
  return <div style={wrapStyle}><div style={dotStyle} />{s.label}</div>
}

function TypePill({ type }: { type: string }) {
  const pillStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.gold,
    backgroundColor: 'rgba(196,160,84,0.10)',
    border: '1px solid rgba(196,160,84,0.25)',
    borderRadius: 4, padding: '2px 8px',
    letterSpacing: '0.04em', whiteSpace: 'nowrap',
  }
  return <span style={pillStyle}>{typeLabel(type)}</span>
}

type Document = {
  id: string
  title: string
  document_type: string
  document_status: string
  parse_status: string
  original_filename: string
  effective_date: string | null
  parser_warning_count: number
  created_at: string
}

type ParsePhase = 'uploading' | 'extracting' | 'complete' | 'error'

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
  marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%', backgroundColor: C.bg,
  border: '1px solid rgba(26,37,53,0.15)',
  borderRadius: 6, padding: '10px 14px', color: C.text,
  fontSize: 14, fontFamily: 'Instrument Sans, system-ui, sans-serif',
  boxSizing: 'border-box',
}

export default function DocumentsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [documents, setDocuments]             = useState<Document[]>([])
  const [loading, setLoading]                 = useState(true)
  const [showUploadForm, setShowUploadForm]   = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId]           = useState<string | null>(null)

  const [modalOpen, setModalOpen]                 = useState(false)
  const [modalPhase, setModalPhase]               = useState<ParsePhase>('uploading')
  const [modalTitle, setModalTitle]               = useState('')
  const [modalSectionCount, setModalSectionCount] = useState<number | undefined>()
  const [modalError, setModalError]               = useState<string | undefined>()

  const [file, setFile]                   = useState<File | null>(null)
  const [title, setTitle]                 = useState('')
  const [docType, setDocType]             = useState('declaration')
  const [effectiveDate, setEffectiveDate] = useState('')

  useEffect(() => { loadDocuments() }, [])

  async function loadDocuments() {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .neq('document_status', 'inactive')
      .order('created_at', { ascending: false })
    if (error) {
      setError('Failed to load documents.')
    } else {
      setDocuments(data ?? [])
    }
    setLoading(false)
  }

  async function handleDeleteDoc(docId: string) {
  setDeletingId(docId)
  const { error } = await supabase
    .from('documents')
    .update({ document_status: 'inactive' })
    .eq('id', docId)
  
  if (error) {
    console.error('[handleDeleteDoc] Update failed:', error)
  } else {
    console.log('[handleDeleteDoc] Update succeeded for:', docId)
  }

  setDocuments(prev => prev.filter(d => d.id !== docId))
  setConfirmDeleteId(null)
  setDeletingId(null)
}

  function closeModal() {
    setModalOpen(false)
    loadDocuments()
  }

  async function handleUpload() {
    if (!file || !title || !docType) {
      setError('Please fill in all required fields and select a file.')
      return
    }
    setError(null)
    setModalTitle(title)
    setModalPhase('uploading')
    setModalSectionCount(undefined)
    setModalError(undefined)
    setModalOpen(true)
    setShowUploadForm(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setModalPhase('error'); setModalError('You must be logged in.'); return }

    const { data: memberships } = await supabase
      .from('association_memberships')
      .select('association_id')
      .eq('user_id', user.id)
    const membership = memberships?.[0]
    if (!membership) { setModalPhase('error'); setModalError('No association found.'); return }

    const associationId = membership.association_id
    const fileExt = file.name.split('.').pop()
    const storagePath = `${associationId}/${Date.now()}.${fileExt}`

    const { error: storageError } = await supabase.storage.from('documents').upload(storagePath, file)
    if (storageError) { setModalPhase('error'); setModalError(`Upload failed: ${storageError.message}`); return }

    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        association_id: associationId,
        title,
        document_type: docType,
        document_status: 'active',
        parse_status: 'pending',
        original_filename: file.name,
        file_storage_key: storagePath,
        effective_date: effectiveDate || null,
        parser_warning_count: 0,
        upload_user_id: user.id,
      })
      .select()
    if (dbError) { setModalPhase('error'); setModalError(`Database error: ${dbError.message}`); return }

    setModalPhase('extracting')
    const parseResponse = await fetch('/api/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: data[0].id }),
    })
    const parseResult = await parseResponse.json()

    if (parseResult.success) {
      setModalSectionCount(parseResult.sectionCount)
      setModalPhase('complete')
    } else {
      setModalPhase('error')
      setModalError(parseResult.error ?? 'Parsing failed.')
    }

    setFile(null); setTitle(''); setDocType('declaration'); setEffectiveDate('')
  }

  const indexedCount = documents.filter(d =>
    d.parse_status === 'complete' || d.parse_status === 'indexed' || d.parse_status === 'active'
  ).length
  const warningCount = documents.filter(d => d.parse_status === 'warning').length

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: C.bg,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }
  const mainStyle: React.CSSProperties = {
    maxWidth: 1000, margin: '0 auto', padding: '40px 40px 80px',
  }
  const cardStyle: React.CSSProperties = {
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxShadow: C.shadow,
  }
  const confirmPanelStyle: React.CSSProperties = {
    backgroundColor: 'rgba(220,38,38,0.03)',
    border: '1px solid rgba(220,38,38,0.15)',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    padding: '16px 24px 20px',
  }
  const confirmWarningStyle: React.CSSProperties = {
    fontSize: 13, color: '#7F1D1D', lineHeight: 1.65, margin: '0 0 14px',
  }
  const confirmActionsStyle: React.CSSProperties = {
    display: 'flex', gap: 10, alignItems: 'center',
  }
  const confirmYesBtnStyle: React.CSSProperties = {
    backgroundColor: C.danger, color: '#ffffff', border: 'none',
    borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }
  const confirmCancelBtnStyle: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(26,37,53,0.2)',
    borderRadius: 6, padding: '7px 16px', fontSize: 13, color: C.text,
    cursor: 'pointer', fontFamily: 'Instrument Sans, system-ui, sans-serif',
  }
  const removeBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'rgba(220,38,38,0.55)',
    fontSize: 12, cursor: 'pointer', padding: '0 0 0 16px',
    textDecoration: 'underline', fontFamily: 'Instrument Sans, system-ui, sans-serif',
    flexShrink: 0,
  }

  return (
    <div style={pageStyle}>

      <ParseProgressModal
        isOpen={modalOpen}
        phase={modalPhase}
        documentTitle={modalTitle}
        sectionCount={modalSectionCount}
        errorMessage={modalError}
        onClose={closeModal}
      />

      <Navbar />

      <div style={mainStyle}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.1 }}>
              Document Library
            </h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '8px 0 0' }}>
              Upload and manage your association's governing documents.
            </p>
          </div>
          <button
            onClick={() => { setShowUploadForm(!showUploadForm); setError(null) }}
            style={{
              backgroundColor: C.gold, color: '#FFFFFF', border: 'none',
              borderRadius: 8, padding: '10px 20px',
              fontFamily: 'Instrument Sans, system-ui, sans-serif',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {showUploadForm ? 'Cancel' : '+ Upload Document'}
          </button>
        </div>

        {documents.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Documents', value: documents.length },
              { label: 'Indexed',         value: indexedCount,  accent: C.success },
              { label: 'Warnings',        value: warningCount,  accent: warningCount > 0 ? C.warning : C.muted },
            ].map(stat => {
              const statCardStyle: React.CSSProperties = { ...cardStyle, padding: '16px 20px', flex: 1 }
              return (
                <div key={stat.label} style={statCardStyle}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: stat.accent ?? C.text, fontFamily: 'Cormorant Garamond, serif' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: C.danger, fontSize: 14 }}>
            {error}
          </div>
        )}

        {showUploadForm && (
          <div style={{ ...cardStyle, padding: 28, marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: C.text, margin: '0 0 20px' }}>
              Upload New Document
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Document Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Declaration of Condominium" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Document Type *</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} style={inputStyle}>
                  {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Effective Date</label>
                <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>File (PDF or DOCX) *</label>
                <input type="file" accept=".pdf,.docx"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  style={{ ...inputStyle, padding: '8px 12px' }} />
              </div>
            </div>
            <button
              onClick={handleUpload}
              style={{
                backgroundColor: C.gold, color: '#FFFFFF', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontWeight: 600,
                fontSize: 14, cursor: 'pointer',
                fontFamily: 'Instrument Sans, system-ui, sans-serif',
              }}
            >
              Upload &amp; Process Document
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ color: C.muted, fontSize: 14, padding: '40px 0' }}>Loading documents…</p>
        ) : documents.length === 0 ? (
          <div style={{ ...cardStyle, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: C.text, marginBottom: 8, fontWeight: 500 }}>No documents uploaded yet.</p>
            <p style={{ fontSize: 13, color: C.muted }}>Upload your declaration, bylaws, rules, and amendments to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map(doc => {
              const isConfirming = confirmDeleteId === doc.id
              const isDeleting   = deletingId === doc.id

              const rowStyle: React.CSSProperties = {
                backgroundColor: C.surface,
                border: `1px solid ${isConfirming ? 'rgba(220,38,38,0.15)' : C.border}`,
                borderRadius: isConfirming ? '12px 12px 0 0' : 12,
                boxShadow: isConfirming ? 'none' : C.shadow,
                borderBottom: isConfirming ? 'none' : undefined,
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }

              return (
                <div key={doc.id}>
                  <div style={rowStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Link href={`/documents/${doc.id}`} style={{ fontWeight: 600, color: C.text, fontSize: 15, textDecoration: 'none' }}>
                          {doc.title}
                        </Link>
                        <TypePill type={doc.document_type} />
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{doc.original_filename}</span>
                        {doc.effective_date && (
                          <><span style={{ opacity: 0.4 }}>·</span><span>Effective {doc.effective_date}</span></>
                        )}
                        {doc.parser_warning_count > 0 && (
                          <><span style={{ opacity: 0.4 }}>·</span>
                          <span style={{ color: C.warning, fontWeight: 600 }}>
                            ⚠ {doc.parser_warning_count} warning{doc.parser_warning_count > 1 ? 's' : ''}
                          </span></>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <StatusIndicator status={doc.parse_status} />
                      {!isConfirming && (
                        <button onClick={() => setConfirmDeleteId(doc.id)} style={removeBtnStyle}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {isConfirming && (
                    <div style={confirmPanelStyle}>
                      <p style={{ ...confirmWarningStyle, fontWeight: 600, marginBottom: 10 }}>
                        You are about to remove <strong>{doc.title}</strong>{' '}from your governing document corpus.
                      </p>
                      <p style={{ ...confirmWarningStyle, marginBottom: 8 }}>
                        BoardPath grounds every answer in the documents you have uploaded. Removing a document — particularly a Declaration, CC&Rs, or Bylaws — may cause the Q&amp;A system to return incomplete, unsupported, or materially incorrect answers on questions that relied on it.
                      </p>
                      <p style={{ ...confirmWarningStyle, marginBottom: 14 }}>
                        This action does not delete the original file, but it will be excluded from all retrieval immediately. You can restore access by re-uploading the document at any time.
                      </p>
                      <div style={confirmActionsStyle}>
                        <button onClick={() => handleDeleteDoc(doc.id)} disabled={isDeleting} style={confirmYesBtnStyle}>
                          {isDeleting ? 'Removing…' : 'Yes, remove from corpus'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} style={confirmCancelBtnStyle}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
