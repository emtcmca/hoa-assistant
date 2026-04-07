'use client'

import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Who it\'s for', href: '#who-its-for' },
    { label: 'See it in action', href: '#walkthrough' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--pad)',
        height: '64px',
        background: scrolled ? 'rgba(248,246,241,0.90)' : 'rgba(248,246,241,0.82)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid var(--border-m)' : '1px solid transparent',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: '1px' }}>
          <span style={{
            fontFamily: 'Instrument Sans, system-ui, sans-serif',
            fontSize: '20px',
            fontWeight: 600,
            color: '#1A2535',
            letterSpacing: '-0.01em',
          }}>Board</span>
          <span style={{
            fontFamily: 'Instrument Sans, system-ui, sans-serif',
            fontSize: '20px',
            fontWeight: 600,
            color: '#C4A054',
            letterSpacing: '-0.01em',
          }}>Path</span>
        </a>

        {/* Desktop nav */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }} className="desktop-nav">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} style={{
              fontSize: '14px',
              color: 'var(--text-d)',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-d)')}
            onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <div style={{ width: '1px', height: '18px', background: 'var(--border-m)' }} />

          <a href="/login" style={{
            fontSize: '14px',
            color: 'var(--text-m)',
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            Sign in
          </a>

          <a href="#demo" style={{
            background: 'var(--bg-navy)',
            color: '#F8F6F1',
            fontSize: '13px',
            fontWeight: 500,
            padding: '8px 20px',
            borderRadius: '6px',
            textDecoration: 'none',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-navy2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-navy)')}
          >
            Try demo
          </a>
        </div>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: '5px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Toggle menu"
        >
          <span style={{
            display: 'block',
            width: '22px',
            height: '2px',
            background: 'var(--text)',
            borderRadius: '2px',
            transition: 'transform 0.25s ease, opacity 0.25s ease',
            transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
          }} />
          <span style={{
            display: 'block',
            width: '22px',
            height: '2px',
            background: 'var(--text)',
            borderRadius: '2px',
            transition: 'opacity 0.25s ease',
            opacity: menuOpen ? 0 : 1,
          }} />
          <span style={{
            display: 'block',
            width: '22px',
            height: '2px',
            background: 'var(--text)',
            borderRadius: '2px',
            transition: 'transform 0.25s ease, opacity 0.25s ease',
            transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
          }} />
        </button>
      </nav>

      {/* Mobile menu */}
      <div style={{
        position: 'fixed',
        top: '64px',
        left: 0,
        right: 0,
        zIndex: 99,
        background: 'rgba(248,246,241,0.98)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-m)',
        display: 'flex',
        flexDirection: 'column',
        padding: menuOpen ? '16px var(--pad) 24px' : '0 var(--pad)',
        maxHeight: menuOpen ? '300px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, padding 0.3s ease',
      }} className="mobile-menu">
        {navLinks.map((link) => (
          <a key={link.label} href={link.href} style={{
            fontSize: '16px',
            color: 'var(--text)',
            textDecoration: 'none',
            fontWeight: 500,
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
          }}
          onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <a href="/login" style={{
            flex: 1,
            textAlign: 'center',
            padding: '11px',
            border: '1px solid var(--border-m)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--text)',
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            Sign in
          </a>
          <a href="#demo" style={{
            flex: 1,
            textAlign: 'center',
            padding: '11px',
            background: 'var(--bg-navy)',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#F8F6F1',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          onClick={() => setMenuOpen(false)}
          >
            Try demo
          </a>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 600px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}