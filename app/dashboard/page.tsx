export default function DashboardPage() {
  return (
    <main style={{
      background: '#0C1525',
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#E8E4DC',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '20px',
          color: '#C4A054',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '48px',
        }}>
          Covenant
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '36px',
          fontWeight: 300,
          color: '#F0EBE0',
          margin: '0 0 8px',
        }}>
          Welcome back
        </h1>
        <p style={{
          fontSize: '14px',
          fontWeight: 300,
          color: 'rgba(232,228,220,0.4)',
          marginBottom: '48px',
        }}>
          Your association workspace
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1px',
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '48px',
        }}>
          {[
            { label: 'Documents', href: '/documents', desc: 'Upload and manage governing documents' },
            { label: 'Ask Your Docs', href: '/ask', desc: 'Ask questions grounded in your documents' },
            { label: 'Draft Violation Letter', href: '/violations', desc: 'Generate a first-draft violation notice' },
            { label: 'Summarize Proposal', href: '#', desc: 'Get a board-friendly proposal summary' },
          ].map((item) => (
            <a key={item.label} href={item.href} style={{
              background: '#0C1525',
              padding: '32px 28px',
              textDecoration: 'none',
              display: 'block',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '20px',
                fontWeight: 400,
                color: '#F0EBE0',
                marginBottom: '8px',
              }}>
                {item.label}
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: 300,
                color: 'rgba(232,228,220,0.4)',
              }}>
                {item.desc}
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}