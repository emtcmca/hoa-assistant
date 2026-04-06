export default function TrustStrip() {
  const items = [
    "Citation-grounded answers only",
    "Built for live board meetings",
    "Plain English your whole board can use",
    "No legal advice · Always review with counsel",
  ]

  return (
    <div style={{
      background: 'var(--bg-navy)',
      padding: '20px var(--pad)',
    }}>
      <div style={{
        maxWidth: 'var(--max)',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{
              fontSize: '13px',
              color: 'rgba(248,246,241,0.75)',
              fontWeight: 400,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}>
              {item}
            </span>
            {i < items.length - 1 && (
              <div style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: 'var(--gold-b)',
                flexShrink: 0,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}