export default function DocumentsPage() {
  return (
    <main style={{
      background: '#0C1525',
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#E8E4DC',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/dashboard" style={{
          fontSize: '12px',
          color: 'rgba(232,228,220,0.3)',
          textDecoration: 'none',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: '40px',
        }}>
          ← Dashboard
        </a>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '36px',
          fontWeight: 300,
          color: '#F0EBE0',
          margin: '0 0 8px',
        }}>
          Documents
        </h1>
        <p style={{
          fontSize: '14px',
          fontWeight: 300,
          color: 'rgba(232,228,220,0.4)',
          marginBottom: '40px',
        }}>
          Upload and manage your association's governing documents.
        </p>

        <div style={{
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '4px',
          padding: '48px',
          textAlign: 'center',
          color: 'rgba(232,228,220,0.25)',
          fontSize: '14px',
          fontWeight: 300,
        }}>
          No documents uploaded yet. Upload functionality coming soon.
        </div>
      </div>
    </main>
  )
}