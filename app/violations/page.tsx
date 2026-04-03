export default function ViolationsPage() {
  return (
    <main style={{
      background: '#0C1525',
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#E8E4DC',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
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
          Draft Violation Letter
        </h1>
        <p style={{
          fontSize: '14px',
          fontWeight: 300,
          color: 'rgba(232,228,220,0.4)',
          marginBottom: '40px',
        }}>
          Complete the form below to generate a first-draft violation notice for board review.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Owner Name', placeholder: 'e.g. Jane Smith' },
            { label: 'Property Address', placeholder: 'e.g. 123 Maple Drive' },
            { label: 'Violation Type', placeholder: 'e.g. Unauthorized landscaping modification' },
            { label: 'Cure Deadline', placeholder: 'e.g. 30 days from notice date' },
          ].map((field) => (
            <div key={field.label}>
              <label style={{
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(232,228,220,0.4)',
                display: 'block',
                marginBottom: '8px',
              }}>
                {field.label}
              </label>
              <input type="text" placeholder={field.placeholder} style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: '3px',
                padding: '12px 14px',
                fontSize: '14px',
                color: '#E8E4DC',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'DM Sans', sans-serif",
              }} />
            </div>
          ))}
          <div>
            <label style={{
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(232,228,220,0.4)',
              display: 'block',
              marginBottom: '8px',
            }}>
              Additional Notes
            </label>
            <textarea placeholder="Any additional context for the letter..." style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '3px',
              padding: '12px 14px',
              fontSize: '14px',
              color: '#E8E4DC',
              outline: 'none',
              resize: 'vertical',
              minHeight: '100px',
              boxSizing: 'border-box',
              fontFamily: "'DM Sans', sans-serif",
            }} />
          </div>
        </div>

        <button style={{
          background: '#C4A054',
          color: '#0C1525',
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '13px 28px',
          borderRadius: '3px',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '40px',
        }}>
          Generate Draft Letter
        </button>

        <div style={{
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '4px',
          padding: '32px',
          color: 'rgba(232,228,220,0.25)',
          fontSize: '14px',
          fontWeight: 300,
        }}>
          Your draft letter will appear here. This is a first draft only — review carefully before sending.
        </div>
      </div>
    </main>
  )
}