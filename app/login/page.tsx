export default function LoginPage() {
  return (
    <main style={{
      background: '#0C1525',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      color: '#E8E4DC',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '48px 40px',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '20px',
          color: '#C4A054',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Covenant
        </div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '28px',
          fontWeight: 300,
          color: '#F0EBE0',
          margin: '0 0 8px',
          textAlign: 'center',
        }}>
          Sign In
        </h1>
        <p style={{
          fontSize: '13px',
          fontWeight: 300,
          color: 'rgba(232,228,220,0.4)',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          Access your association workspace
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(232,228,220,0.4)',
              display: 'block',
              marginBottom: '8px',
            }}>
              Email
            </label>
            <input type="email" placeholder="you@example.com" style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '3px',
              padding: '12px 14px',
              fontSize: '14px',
              color: '#E8E4DC',
              outline: 'none',
              boxSizing: 'border-box',
            }} />
          </div>
          <div>
            <label style={{
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(232,228,220,0.4)',
              display: 'block',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <input type="password" placeholder="••••••••" style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '3px',
              padding: '12px 14px',
              fontSize: '14px',
              color: '#E8E4DC',
              outline: 'none',
              boxSizing: 'border-box',
            }} />
          </div>
          <a href="/dashboard" style={{
            display: 'block',
            textAlign: 'center',
            marginTop: '8px',
            background: '#C4A054',
            color: '#0C1525',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '14px',
            borderRadius: '3px',
            textDecoration: 'none',
          }}>
            Sign In
          </a>
        </div>
      </div>
    </main>
  )
}