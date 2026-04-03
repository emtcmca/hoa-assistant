export default function Home() {
  return (
    <main style={{
      background: '#0C1525',
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#E8E4DC',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grid background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Gold glow */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '300px',
        background: 'radial-gradient(ellipse, rgba(196,160,84,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Nav */}
      <nav style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '20px',
          fontWeight: 400,
          color: '#C4A054',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
        }}>
          Covenant
        </div>
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {['Documents', 'Ask', 'Workflows'].map((item) => (
            <a key={item} href="#" style={{
              fontSize: '13px',
              color: 'rgba(232,228,220,0.5)',
              textDecoration: 'none',
              letterSpacing: '0.03em',
            }}>
              {item}
            </a>
          ))}
          <a href="/login" style={{
            background: '#C4A054',
            color: '#0C1525',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            padding: '8px 18px',
            borderRadius: '3px',
            textDecoration: 'none',
          }}>
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        padding: '80px 40px 72px',
        maxWidth: '780px',
        margin: '0 auto',
      }}>
        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: '#C4A054',
          background: 'rgba(196,160,84,0.1)',
          border: '0.5px solid rgba(196,160,84,0.25)',
          padding: '6px 14px',
          borderRadius: '20px',
          marginBottom: '28px',
        }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C4A054' }} />
          Private · Document-grounded · Board-ready
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '58px',
          fontWeight: 300,
          lineHeight: 1.1,
          color: '#F0EBE0',
          margin: '0 0 20px',
          letterSpacing: '0.01em',
        }}>
          Your association&apos;s documents,<br />
          <em style={{ color: '#C4A054', fontStyle: 'italic' }}>finally working for you</em>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: '15px',
          fontWeight: 300,
          color: 'rgba(232,228,220,0.55)',
          lineHeight: 1.7,
          maxWidth: '520px',
          margin: '0 auto 40px',
        }}>
          Upload your governing documents, ask questions in plain English,
          and generate board-ready drafts — all grounded in your
          association&apos;s actual rules.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '72px' }}>
          <a href="/dashboard" style={{
            background: '#C4A054',
            color: '#0C1525',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            padding: '13px 32px',
            borderRadius: '3px',
            textDecoration: 'none',
          }}>
            Get Started
          </a>
          <a href="/login" style={{
            background: 'transparent',
            color: 'rgba(232,228,220,0.6)',
            fontSize: '13px',
            fontWeight: 400,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            padding: '13px 32px',
            borderRadius: '3px',
            border: '0.5px solid rgba(232,228,220,0.15)',
            textDecoration: 'none',
          }}>
            Sign In
          </a>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: 'rgba(255,255,255,0.06)',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {[
          {
            num: 'Art. I',
            title: 'Ask Your Docs',
            body: 'Ask questions in plain English and get answers grounded in your uploaded governing documents — not general AI guesswork.',
          },
          {
            num: 'Art. II',
            title: 'Draft Violation Letters',
            body: "Generate professional first-draft violation notices ready for board review, based on your CC&Rs and rules.",
          },
          {
            num: 'Art. III',
            title: 'Summarize Proposals',
            body: 'Get clear, board-friendly summaries of vendor proposals, highlighting scope, pricing, and key terms.',
          },
        ].map((card) => (
          <div key={card.num} style={{ background: '#0C1525', padding: '36px 32px' }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '13px',
              fontWeight: 300,
              fontStyle: 'italic',
              color: 'rgba(196,160,84,0.5)',
              letterSpacing: '0.08em',
              marginBottom: '16px',
            }}>
              {card.num}
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '22px',
              fontWeight: 400,
              color: '#F0EBE0',
              marginBottom: '10px',
              letterSpacing: '0.01em',
            }}>
              {card.title}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 300,
              color: 'rgba(232,228,220,0.45)',
              lineHeight: 1.65,
            }}>
              {card.body}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '20px 40px',
        fontSize: '11px',
        color: 'rgba(232,228,220,0.2)',
        letterSpacing: '0.04em',
        borderTop: '0.5px solid rgba(255,255,255,0.05)',
      }}>
        All outputs are first drafts requiring human review · This tool does not provide legal advice
      </div>
    </main>
  )
}