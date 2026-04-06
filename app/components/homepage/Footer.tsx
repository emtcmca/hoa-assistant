'use client'

export default function Footer() {
  const links = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Who it\'s for', href: '#who-its-for' },
    { label: 'Meeting Mode', href: '/meeting-mode' },
    { label: 'Sign in', href: '/login' },
    { label: 'Contact', href: 'mailto:hello@boardpath.com' },
  ]

  return (
    <footer style={{
      background: 'var(--bg-navy)',
      borderTop: '1px solid rgba(248,246,241,0.08)',
      padding: '48px var(--pad)',
    }}>
      <div style={{
        maxWidth: 'var(--max)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '24px',
      }}>
        {/* Logo + tagline */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '1px',
            marginBottom: '6px',
          }}>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '20px',
              fontWeight: 600,
              color: '#F8F6F1',
            }}>Board</span>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--gold-b)',
            }}>Path</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(248,246,241,0.4)',
            letterSpacing: '0.04em',
          }}>
            Association Governance Intelligence
          </div>
        </div>

        {/* Links */}
        <div style={{
          display: 'flex',
          gap: '28px',
          flexWrap: 'wrap',
        }}>
          {links.map((link) => (
            <a key={link.label} href={link.href} style={{
              fontSize: '13px',
              color: 'rgba(248,246,241,0.45)',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,246,241,0.85)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,246,241,0.45)')}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Legal */}
        <div style={{
          width: '100%',
          paddingTop: '24px',
          borderTop: '1px solid rgba(248,246,241,0.06)',
          fontSize: '11px',
          color: 'rgba(248,246,241,0.25)',
          letterSpacing: '0.03em',
        }}>
          All outputs are first drafts requiring human review · BoardPath does not provide legal advice · Always consult qualified counsel for legal interpretation
        </div>
      </div>
    </footer>
  )
}