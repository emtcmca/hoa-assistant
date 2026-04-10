'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

export default function AppNavbar() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      setIsSignedIn(!!data.session);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const navbarStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid rgba(26,37,53,0.08)',
    boxShadow: '0 1px 3px rgba(26,37,53,0.04)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 32px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoStyle: React.CSSProperties = {
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: '20px',
    fontWeight: '600',
    textDecoration: 'none',
    letterSpacing: '-0.01em',
  };

  const navLinkStyle: React.CSSProperties = {
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: '14px',
    color: 'rgba(26,37,53,0.65)',
    textDecoration: 'none',
    fontWeight: '400',
  };

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    backgroundColor: 'rgba(26,37,53,0.15)',
    margin: '0 8px',
  };

  const signOutStyle: React.CSSProperties = {
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: '14px',
    color: '#1A2535',
    fontWeight: '500',
    padding: '0 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  };
  const tourLinkStyle: React.CSSProperties = {
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    fontSize: '13px',
    color: 'rgba(26,37,53,0.45)',
    textDecoration: 'none',
    fontWeight: '400',
  }
  
  return (
    <nav style={navbarStyle}>
      <div style={innerStyle}>

        {/* Logo */}
        <Link href="/" style={logoStyle}>
          <span style={{ color: '#1A2535' }}>Board</span>
          <span style={{ color: '#C4A054' }}>Path</span>
        </Link>

        {/* Right side — links + auth together */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
            <Link href="/documents" style={navLinkStyle}>Documents</Link>
            <Link href="/meeting-mode" style={navLinkStyle}>Meeting Mode</Link>
            <Link href="/history" style={navLinkStyle}>History</Link>
            <div style={separatorStyle} />
              {isSignedIn ? (
                <>
                  <a href="/onboarding?mode=tour" style={tourLinkStyle}>
                    Take the tour
                  </a>
                  <button onClick={handleSignOut} style={signOutStyle}>
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" style={signOutStyle}>Sign in</Link>
              )}
            </div>
        )}

      </div>
    </nav>
  );
}