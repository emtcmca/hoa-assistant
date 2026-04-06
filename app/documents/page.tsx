'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

const COLORS = {
  bg: '#0C1525',
  gold: '#C4A054',
  text: '#E8E4DC',
  muted: '#8A8A8A',
  surface: '#1A2535',
  border: '#2A3545',
  danger: '#C0392B',
  success: '#27AE60',
  warning: '#F39C12',
}

const DOCUMENT_TYPES = [
  { value: 'declaration', label: 'Declaration / CC&Rs' },
  { value: 'bylaws', label: 'Bylaws' },
  { value: 'articles', label: 'Articles of Incorporation' },
  { value: 'rules', label: 'Rules & Regulations' },
  { value: 'policy', label: 'Policy / Resolution' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'other', label: 'Other' },
]

function typeLabel(value: string) {
  return DOCUMENT_TYPES.find(t => t.value === value)?.label ?? value
}

function ParseStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending:    { label: 'Pending',    color: COLORS.muted },
    processing: { label: 'Processing', color: COLORS.gold },
    indexed:    { label: 'Indexed',    color: COLORS.success },
    warning:    { label: 'Warning',    color: COLORS.warning },
    failed:     { label: 'Failed',     color: COLORS.danger },
  }
  const c = config[status] ?? { label: status, color: COLORS.muted }
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: c.color,
      border: `1px solid ${c.color}`,
      borderRadius: 4,
      padding: '2px 8px',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {c.label}
    </span>
  )
}

function DocTypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: 11,
      color: COLORS.gold,
      border: `1px solid ${COLORS.gold}`,
      borderRadius: 4,
      padding: '2px 8px',
      letterSpacing: '0.05em',
    }}>
      {typeLabel(type)}
    </span>
  )
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

export default function DocumentsPage() {
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('declaration')
  const [effectiveDate, setEffectiveDate] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load documents.')
    } else {
      setDocuments(data ?? [])
    }
    setLoading(false)
  }

  async function handleUpload() {
    if (!file || !title || !docType) {
      setError('Please fill in all required fields and select a file.')
      return
    }

    setUploading(true)
    setError(null)

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to upload documents.')
      setUploading(false)
      return
    }

    // 2. Get the user's association
    const { data: membership } = await supabase
      .from('association_memberships')
      .select('association_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      setError('No association found for your account. Contact your administrator.')
      setUploading(false)
      return
    }

    const associationId = membership.association_id

    // 3. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const storagePath = `${associationId}/${Date.now()}.${fileExt}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file)

    if (storageError) {
      setError(`File upload failed: ${storageError.message}`)
      setUploading(false)
      return
    }

    // 4. Insert document row into database
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

    if (dbError) {
      setError(`Database error: ${dbError.message}`)
      setUploading(false)
      return
    }

    // 5. Trigger parsing
    setSuccessMsg(`"${title}" uploaded — parsing document...`)
    
    const parseResponse = await fetch('/api/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: data[0].id }),
    })

    const parseResult = await parseResponse.json()

    if (parseResult.success) {
      setSuccessMsg(`"${title}" uploaded and parsed into ${parseResult.sectionCount} sections.`)
    } else {
      setSuccessMsg(`"${title}" uploaded. Parsing failed: ${parseResult.error}`)
    }

    // 6. Reset and reload
    setFile(null)
    setTitle('')
    setDocType('declaration')
    setEffectiveDate('')
    setShowUploadForm(false)
    setUploading(false)
    loadDocuments()

    setTimeout(() => setSuccessMsg(null), 6000)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: COLORS.text, margin: 0 }}>
            Document Library
          </h1>
          <p style={{ color: COLORS.muted, marginTop: 6, fontSize: 14 }}>
            Upload and manage your association's governing documents.
          </p>
        </div>
        <button
          onClick={() => { setShowUploadForm(!showUploadForm); setError(null) }}
          style={{
            backgroundColor: COLORS.gold,
            color: '#0C1525',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {showUploadForm ? 'Cancel' : '+ Upload Document'}
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div style={{ backgroundColor: '#2A1515', border: `1px solid ${COLORS.danger}`, borderRadius: 6, padding: '12px 16px', marginBottom: 20, color: COLORS.danger, fontSize: 14 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#152A1E', border: `1px solid ${COLORS.success}`, borderRadius: 6, padding: '12px 16px', marginBottom: 20, color: COLORS.success, fontSize: 14 }}>
          {successMsg}
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 28, marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: COLORS.text, margin: '0 0 20px' }}>
            Upload New Document
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Document Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Declaration of Condominium"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Document Type *</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                style={inputStyle}
              >
                {DOCUMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Effective Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>File (PDF or DOCX) *</label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                style={{ ...inputStyle, padding: '8px 12px' }}
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              backgroundColor: uploading ? COLORS.muted : COLORS.gold,
              color: '#0C1525',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: 14,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 14 }}>Loading documents...</p>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.muted }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>No documents uploaded yet.</p>
          <p style={{ fontSize: 13 }}>Upload your declaration, bylaws, rules, and amendments to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {documents.map(doc => (
            <div
              key={doc.id}
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Link
                    href={`/documents/${doc.id}`}
                    style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: COLORS.gold, fontSize: 15, textDecoration: 'none' }}
                  >
                    {doc.title}
                  </Link>
                  <DocTypeBadge type={doc.document_type} />
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  {doc.original_filename}
                  {doc.effective_date && ` · Effective ${doc.effective_date}`}
                  {doc.parser_warning_count > 0 && (
                    <span style={{ color: COLORS.warning, marginLeft: 8 }}>
                      ⚠ {doc.parser_warning_count} warning{doc.parser_warning_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ParseStatusBadge status={doc.parse_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#8A8A8A',
  marginBottom: 6,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0C1525',
  border: '1px solid #2A3545',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#E8E4DC',
  fontSize: 14,
  fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}