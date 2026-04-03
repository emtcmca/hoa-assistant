export default function AskPage() {
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
          Ask Your Docs
        </h1>
        <p style={{
          fontSize: '14px',
          fontWeight: 300,
          color: 'rgba(232,228,220,0.4)',
          marginBottom: '40px',
        }}>
          Ask a question and get an answer grounded in your uploaded documents.
        </p>

        <textarea placeholder="e.g. What is the fine for a first parking violation?" style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: '3px',
          padding: '16px',
          fontSize: '14px',
          color: '#E8E4DC',
          outline: 'none',
          resize: 'vertical',
          minHeight: '120px',
          boxSizing: 'border-box',
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: '16px',
        }} />

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
          Ask Question
        </button>

        <div style={{
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '4px',
          padding: '32px',
          color: 'rgba(232,228,220,0.25)',
          fontSize: '14px',
          fontWeight: 300,
        }}>
          Your answer will appear here. All answers are based on your uploaded documents and should be reviewed before use.
        </div>
      </div>
    </main>
  )
}