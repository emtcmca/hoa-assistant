'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'
import AppNavbar from '../components/AppNavbar'

interface Homeowner {
  id: string
  full_name: string
  unit: string | null
  mailing_address: string | null
  city: string | null
  state: string | null
  zip: string | null
  email: string | null
  created_at: string
}

const TARGET_FIELDS = [
  { key: 'full_name',       label: 'Full Name',      required: true  },
  { key: 'unit',            label: 'Unit / Lot #',   required: false },
  { key: 'mailing_address', label: 'Street Address', required: false },
  { key: 'city',            label: 'City',           required: false },
  { key: 'state',           label: 'State',          required: false },
  { key: 'zip',             label: 'ZIP Code',       required: false },
  { key: 'email',           label: 'Email',          required: false },
]

function parseCSV(text: string): string[][] {
  const lines = text.split('\n').filter(l => l.trim())
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += line[i]
      }
    }
    result.push(current.trim())
    return result
  })
}

export default function HomeownersPage() {
  const router = useRouter()
  const supabase = createClient()
  const csvInputRef = useRef<HTMLInputElement>(null)
  const letterheadInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]                           = useState(true)
  const [associationId, setAssociationId]               = useState<string | null>(null)
  const [homeowners, setHomeowners]                     = useState<Homeowner[]>([])
  const [letterheadKey, setLetterheadKey]               = useState<string | null>(null)
  const [letterheadPreviewUrl, setLetterheadPreviewUrl] = useState<string | null>(null)
  const [letterheadUploading, setLetterheadUploading]   = useState(false)
  const [letterheadSuccess, setLetterheadSuccess]       = useState(false)
  const [csvHeaders, setCsvHeaders]                     = useState<string[]>([])
  const [csvAllRows, setCsvAllRows]                     = useState<string[][]>([])
  const [columnMap, setColumnMap]                       = useState<Record<string, string>>({})
  const [csvStep, setCsvStep]                           = useState<'idle' | 'mapping' | 'importing' | 'done'>('idle')
  const [importCount, setImportCount]                   = useState(0)
  const [importError, setImportError]                   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const memberRes = await supabase
        .from('association_memberships')
        .select('association_id')
        .eq('user_id', session.user.id)
      const assocId = memberRes.data?.[0]?.association_id
      if (!assocId) { setLoading(false); return }
      setAssociationId(assocId)

      const assocRes = await supabase
        .from('associations')
        .select('letterhead_storage_key')
        .eq('id', assocId)
      const assoc = assocRes.data?.[0]
      if (assoc?.letterhead_storage_key) {
        setLetterheadKey(assoc.letterhead_storage_key)
        const { data: signedData } = await supabase.storage
          .from('letterheads')
          .createSignedUrl(assoc.letterhead_storage_key, 3600)
        if (signedData?.signedUrl) setLetterheadPreviewUrl(signedData.signedUrl)
      }

      const homeownersRes = await supabase
        .from('homeowners')
        .select('id, full_name, unit, mailing_address, city, state, zip, email, created_at')
        .eq('association_id', assocId)
        .order('full_name', { ascending: true })
      setHomeowners(homeownersRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLetterheadUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !associationId) return
    setLetterheadUploading(true)
    const ext = file.name.split('.').pop() ?? 'png'
    const storageKey = `${associationId}/letterhead.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('letterheads')
      .upload(storageKey, file, { upsert: true })
    if (uploadError) {
      console.error('Letterhead upload error:', uploadError)
      setLetterheadUploading(false)
      return
    }
    await supabase.from('associations').update({ letterhead_storage_key: storageKey }).eq('id', associationId)
    const { data: signedData } = await supabase.storage.from('letterheads').createSignedUrl(storageKey, 3600)
    setLetterheadKey(storageKey)
    if (signedData?.signedUrl) setLetterheadPreviewUrl(signedData.signedUrl)
    setLetterheadUploading(false)
    setLetterheadSuccess(true)
    setTimeout(() => setLetterheadSuccess(false), 3000)
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      if (rows.length < 2) return
      const headers = rows[0]
      const dataRows = rows.slice(1)
      setCsvHeaders(headers)
      setCsvAllRows(dataRows)
      const autoMap: Record<string, string> = {}
      const matchTargets: Record<string, string[]> = {
        full_name:       ['fullname', 'name', 'ownername', 'owner'],
        unit:            ['unit', 'lot', 'unitlot'],
        mailing_address: ['mailingaddress', 'streetaddress', 'address', 'street'],
        city:            ['city'],
        state:           ['state'],
        zip:             ['zip', 'zipcode', 'postalcode'],
        email:           ['email', 'emailaddress'],
      }
      TARGET_FIELDS.forEach(field => {
        const match = headers.find(h =>
          matchTargets[field.key]?.includes(h.toLowerCase().replace(/[^a-z]/g, ''))
        )
        if (match) autoMap[field.key] = match
      })
      setColumnMap(autoMap)
      setCsvStep('mapping')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!associationId) return
    setCsvStep('importing')
    setImportError('')
    const records = csvAllRows
      .filter(row => row.some(cell => cell.trim()))
      .map(row => {
        const record: Record<string, string> = { association_id: associationId }
        TARGET_FIELDS.forEach(field => {
          const csvCol = columnMap[field.key]
          if (csvCol) {
            const idx = csvHeaders.indexOf(csvCol)
            record[field.key] = idx >= 0 ? (row[idx] ?? '').trim() : ''
          }
        })
        return record
      })
      .filter(r => r.full_name)
    const { error } = await supabase.from('homeowners').insert(records)
    if (error) {
      setImportError('Import failed. Please check your data and try again.')
      setCsvStep('mapping')
      return
    }
    const homeownersRes = await supabase
      .from('homeowners')
      .select('id, full_name, unit, mailing_address, city, state, zip, email, created_at')
      .eq('association_id', associationId)
      .order('full_name', { ascending: true })
    setHomeowners(homeownersRes.data ?? [])
    setImportCount(records.length)
    setCsvStep('done')
  }

  function resetCsv() {
    setCsvHeaders([])
    setCsvAllRows([])
    setColumnMap({})
    setCsvStep('idle')
    setImportError('')
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  async function handleDeleteHomeowner(id: string) {
    await supabase.from('homeowners').delete().eq('id', id)
    setHomeowners(prev => prev.filter(h => h.id !== id))
  }

  const pageStyle: React.CSSProperties = {
    background: '#F8F6F1',
    minHeight: '100vh',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    color: '#1A2535',
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '48px 40px 80px',
  }

  const sectionStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(26,37,53,0.08)',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(26,37,53,0.06)',
    overflow: 'hidden',
    marginBottom: '24px',
  }

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '18px 24px',
    borderBottom: '1px solid rgba(26,37,53,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '20px',
    fontWeight: 400,
    color: '#1A2535',
    margin: 0,
  }

  const sectionBodyStyle: React.CSSProperties = {
    padding: '24px',
  }

  const uploadZoneStyle: React.CSSProperties = {
    border: '2px dashed rgba(196,160,84,0.4)',
    borderRadius: '6px',
    padding: '28px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'rgba(196,160,84,0.02)',
  }

  const uploadBtnStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '8px 20px',
    background: '#1A2535',
    color: '#F8F6F1',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    marginTop: '12px',
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(26,37,53,0.4)',
    fontWeight: 600,
    borderBottom: '1px solid rgba(26,37,53,0.06)',
    background: 'rgba(248,246,241,0.6)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: '#1A2535',
    borderBottom: '1px solid rgba(26,37,53,0.04)',
    verticalAlign: 'top',
  }

  const tdMutedStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: 'rgba(26,37,53,0.5)',
    borderBottom: '1px solid rgba(26,37,53,0.04)',
    verticalAlign: 'top',
  }

  const tdSmallMutedStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: 'rgba(26,37,53,0.5)',
    fontSize: '12px',
    borderBottom: '1px solid rgba(26,37,53,0.04)',
    verticalAlign: 'top',
  }

  const mapRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid rgba(26,37,53,0.15)',
    borderRadius: '5px',
    fontSize: '12px',
    color: '#1A2535',
    background: '#FFFFFF',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const primaryBtnStyle: React.CSSProperties = {
    padding: '10px 24px',
    background: '#1A2535',
    color: '#F8F6F1',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const primaryBtnDisabledStyle: React.CSSProperties = {
    padding: '10px 24px',
    background: '#1A2535',
    color: '#F8F6F1',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'not-allowed',
    opacity: 0.4,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const secondaryBtnStyle: React.CSSProperties = {
    padding: '10px 20px',
    background: 'none',
    border: '1px solid rgba(26,37,53,0.18)',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1A2535',
    cursor: 'pointer',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  }

  const deleteBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'rgba(220,38,38,0.6)',
    fontSize: '11px',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    padding: 0,
  }

  const previewTdStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '12px',
    color: '#1A2535',
    borderBottom: '1px solid rgba(26,37,53,0.04)',
  }

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
        <p style={{ color: 'rgba(26,37,53,0.4)', fontSize: '13px', fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>Loading...</p>
      </main>
    )
  }

  const previewRows = csvAllRows.slice(0, 3)
  const mappedFields = TARGET_FIELDS.filter(f => columnMap[f.key])
  const importableCount = csvAllRows.filter(r => r.some(c => c.trim())).length

  return (
    <main style={pageStyle}>
      <AppNavbar />
      <div style={containerStyle}>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4A054', fontWeight: 500, margin: '0 0 8px' }}>
            Association Settings
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '38px', fontWeight: 400, color: '#1A2535', margin: '0 0 4px', lineHeight: 1.15 }}>
            Homeowner Roster
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.45)', margin: 0 }}>
            Upload owner data to auto-populate violation letters and board correspondence.
          </p>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Association Letterhead</h2>
            {letterheadKey && (
              <span style={{ fontSize: '11px', color: '#2D6A4F', fontWeight: 500 }}>Letterhead on file</span>
            )}
          </div>
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Upload your association letterhead image (PNG or JPG). It will appear at the top of all generated DOCX correspondence.
            </p>
            {letterheadPreviewUrl && (
              <div style={{ marginBottom: '20px', border: '1px solid rgba(26,37,53,0.08)', borderRadius: '6px', overflow: 'hidden', maxHeight: '120px' }}>
                <img src={letterheadPreviewUrl} alt="Current letterhead" style={{ width: '100%', objectFit: 'contain', maxHeight: '120px' }} />
              </div>
            )}
            <div style={uploadZoneStyle} onClick={() => letterheadInputRef.current?.click()}>
              <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.5)', margin: '0 0 4px' }}>
                {letterheadKey ? 'Click to replace letterhead' : 'Click to upload letterhead'}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(26,37,53,0.35)', margin: 0 }}>PNG or JPG only. If your letterhead is a Word doc, open it and save the header as an image.</p>
              <button style={uploadBtnStyle} disabled={letterheadUploading}>
                {letterheadUploading ? 'Uploading...' : letterheadSuccess ? 'Saved' : 'Choose File'}
              </button>
            </div>
            <input ref={letterheadInputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleLetterheadUpload} />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Current Roster</h2>
            <span style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)' }}>
              {homeowners.length} owner{homeowners.length !== 1 ? 's' : ''}
            </span>
          </div>
          {homeowners.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.4)', margin: 0 }}>
                No homeowners imported yet. Upload a CSV below to populate the roster.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Unit</th>
                    <th style={thStyle}>Address</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {homeowners.map(h => {
                    const addressLine = [h.mailing_address, h.city, h.state, h.zip].filter(Boolean).join(', ')
                    return (
                      <tr key={h.id}>
                        <td style={tdStyle}>{h.full_name}</td>
                        <td style={tdMutedStyle}>{h.unit ?? '---'}</td>
                        <td style={tdSmallMutedStyle}>{addressLine || '---'}</td>
                        <td style={tdSmallMutedStyle}>{h.email ?? '---'}</td>
                        <td style={tdStyle}>
                          <button onClick={() => handleDeleteHomeowner(h.id)} style={deleteBtnStyle}>Remove</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Import from CSV</h2>
          </div>
          <div style={sectionBodyStyle}>

            {csvStep === 'idle' && (
              <>
                <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.55)', margin: '0 0 8px', lineHeight: 1.6 }}>
                  Export owner data from your HOA management software and upload it here. Common exports from Vantaca, AppFolio, and Buildium work out of the box.
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.4)', margin: '0 0 20px' }}>
                  Required column: <strong>Name</strong>. Optional: Unit, Address, City, State, ZIP, Email.
                </p>
                <div style={uploadZoneStyle} onClick={() => csvInputRef.current?.click()}>
                  <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.5)', margin: '0 0 4px' }}>Click to select a CSV file</p>
                  <p style={{ fontSize: '11px', color: 'rgba(26,37,53,0.35)', margin: 0 }}>.csv format only</p>
                  <button style={uploadBtnStyle}>Choose CSV</button>
                </div>
                <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFile} />
              </>
            )}

            {csvStep === 'mapping' && (
              <>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A2535', margin: '0 0 4px' }}>
                  Map your CSV columns
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.5)', margin: '0 0 24px' }}>
                  {csvAllRows.length} data rows detected. Match each field to the correct column in your file. Columns that look like obvious matches have been auto-selected.
                </p>

                {TARGET_FIELDS.map(field => (
                  <div key={field.key} style={mapRowStyle}>
                    <label style={{ fontSize: '12px', fontWeight: field.required ? 600 : 400, color: field.required ? '#1A2535' : 'rgba(26,37,53,0.6)', fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
                      {field.label}{field.required && <span style={{ color: '#C4A054' }}> *</span>}
                    </label>
                    <select
                      value={columnMap[field.key] ?? ''}
                      onChange={e => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="">-- skip --</option>
                      {csvHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {previewRows.length > 0 && columnMap.full_name && (
                  <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,37,53,0.4)', fontWeight: 600, margin: '0 0 10px' }}>
                      Preview -- first {previewRows.length} rows
                    </p>
                    <div style={{ overflowX: 'auto', border: '1px solid rgba(26,37,53,0.08)', borderRadius: '6px' }}>
                      <table style={tableStyle}>
                        <thead>
                          <tr>
                            {mappedFields.map(f => (
                              <th key={f.key} style={thStyle}>{f.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i}>
                              {mappedFields.map(f => {
                                const idx = csvHeaders.indexOf(columnMap[f.key])
                                return <td key={f.key} style={previewTdStyle}>{row[idx] ?? '---'}</td>
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importError && (
                  <p style={{ fontSize: '12px', color: '#DC2626', margin: '0 0 12px' }}>{importError}</p>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    onClick={handleImport}
                    disabled={!columnMap.full_name}
                    style={columnMap.full_name ? primaryBtnStyle : primaryBtnDisabledStyle}
                  >
                    Import {importableCount} Records
                  </button>
                  <button onClick={resetCsv} style={secondaryBtnStyle}>Cancel</button>
                </div>
              </>
            )}

            {csvStep === 'importing' && (
              <p style={{ fontSize: '13px', color: 'rgba(26,37,53,0.5)', margin: 0 }}>Importing records...</p>
            )}

            {csvStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '24px', fontFamily: "'Cormorant Garamond', serif", color: '#1A2535', margin: '0 0 4px' }}>
                  {importCount} records imported
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(26,37,53,0.45)', margin: '0 0 20px' }}>
                  Your homeowner roster is ready for use in draft generation.
                </p>
                <button onClick={resetCsv} style={secondaryBtnStyle}>Import Another File</button>
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}

