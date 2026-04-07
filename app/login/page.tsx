'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'
import Link from 'next/link'

const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  const pageStyle: React.CSSProperties = {
    background: '#F8F6F1',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    color: '#1A2535',
  }

  const navStyle: React.CSSProperties = {
    padding: '0 40px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(26,37,53,0.08)',
    backgroundColor: '#FFFFFF',
  }

  const logoStyle: React.CSSProperties = {
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: '20px',
    fontWeight: 600,
    textDecoration: 'none',
    letterSpacing: '-0.01em',
  }

  const centerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    background: '#FFFFFF',
    border: '1px solid rgba(26,37,53,0.08)',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)',
    padding: '48px 40px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(26,37,53,0.45)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#F8F6F1',
    border: '1px solid rgba(26,37,53,0.15)',
    borderRadius: '6px',
    padding: '11px 14px',
    fontSize: '14px',
    color: '#1A2535',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    marginTop: '8px',
    width: '100%',
    background: loading ? 'rgba(196,160,84,0.5)' : '#1A2535',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  }

  return (
    <div style={pageStyle}>

      {/* Minimal nav — just the logo */}
      <nav style={navStyle}>
        <Link href="/" style={logoStyle}>
          <span style={{ color: '#1A2535' }}>Board</span>
          <span style={{ color: '#C4A054' }}>Path</span>
        </Link>
      </nav>

      {/* Centered card */}
      <div style={centerStyle}>
        <div style={cardStyle}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 600, color: '#1A2535', margin: '0 0 8px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(26,37,53,0.55)', margin: 0 }}>
              Sign in to your association workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', color: '#DC2626', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

          </form>

          {/* Footer */}
          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'rgba(26,37,53,0.45)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/" style={{ color: '#C4A054', textDecoration: 'none', fontWeight: 500 }}>
              Contact us
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}