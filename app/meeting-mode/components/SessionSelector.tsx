'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Session {
  id: string;
  title: string;
  session_date: string;
  status: string;
  created_at: string;
}

interface SessionSelectorProps {
  associationId: string;
  userId?: string;
  onSessionChange: (session: Session | null) => void;
}

export default function SessionSelector({ associationId, userId, onSessionChange }: SessionSelectorProps) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Generate a smart default session title based on today's date
  const defaultTitle = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' Board Meeting';
  };

  // Load recent sessions on mount
  useEffect(() => {
    if (!associationId) return;
    fetchSessions();
  }, [associationId]);

  // Click-outside to close panel
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
        setCreating(false);
      }
    }
    if (panelOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  async function fetchSessions() {
    const res = await fetch(`/api/sessions?association_id=${associationId}`);
    const data = await res.json();
    if (data.sessions) {
      const active = data.sessions.find((s: Session) => s.status === 'active') || null;
      setActiveSession(active);
      setRecentSessions(data.sessions.filter((s: Session) => s.status === 'closed').slice(0, 5));
      onSessionChange(active);
    }
  }

  async function handleCreateSession() {
    const title = newTitle.trim() || defaultTitle();
    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ association_id: associationId, title, user_id: userId }),
    });
    const data = await res.json();
    if (data.session) {
      setActiveSession(data.session);
      onSessionChange(data.session);
      setRecentSessions(prev => [data.session, ...prev].slice(0, 5));
    }
    setNewTitle('');
    setCreating(false);
    setLoading(false);
    setPanelOpen(false);
  }

  async function handleCloseSession() {
    if (!activeSession) return;
    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: activeSession.id }),
    });
    const data = await res.json();
    if (data.session) {
      setRecentSessions(prev => [{ ...activeSession, status: 'closed' }, ...prev].slice(0, 5));
      setActiveSession(null);
      onSessionChange(null);
    }
    setLoading(false);
    setPanelOpen(false);
  }

  const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'opacity 0.15s',
  border: '1px solid #D1CBB8',
  backgroundColor: activeSession ? '#1A2535' : '#F8F6F1',
  color: activeSession ? '#C4A054' : '#1A2535',
};

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E1D8',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    width: '300px',
    zIndex: 100,
    overflow: 'hidden',
  };

  const panelHeaderStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: '#F8F6F1',
    borderBottom: '1px solid #E5E1D8',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6B7280',
  };

  const panelSectionStyle: React.CSSProperties = {
    padding: '12px 16px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #D1CBB8',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#1A2535',
    backgroundColor: '#FAFAF8',
    boxSizing: 'border-box',
    marginBottom: '8px',
  };

  const btnPrimaryStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#1A2535',
    color: '#C4A054',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    marginBottom: '6px',
  };

  const btnSecondaryStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #E5E1D8',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  const btnDangerStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#DC2626',
    border: '1px solid #FECACA',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    marginTop: '6px',
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button style={pillStyle} onClick={() => setPanelOpen(p => !p)}>
        <span style={{ fontSize: '8px' }}>●</span>
        {activeSession ? activeSession.title : 'No Session'}
      </button>

      {panelOpen && (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Meeting Session</div>

          {activeSession && !creating && (
            <div style={panelSectionStyle}>
              <div style={{ fontSize: '13px', color: '#1A2535', fontWeight: 600, marginBottom: '4px' }}>
                {activeSession.title}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '12px' }}>
                Started {new Date(activeSession.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <button style={btnSecondaryStyle} onClick={() => { setPanelOpen(false); }}>
                Continue This Session
              </button>
              <button style={btnDangerStyle} onClick={handleCloseSession} disabled={loading}>
                Close Session
              </button>
            </div>
          )}

          {!activeSession && !creating && (
            <div style={panelSectionStyle}>
              <button style={btnPrimaryStyle} onClick={() => setCreating(true)}>
                + Start New Session
              </button>
              <button style={btnSecondaryStyle} onClick={() => setPanelOpen(false)}>
                Continue Without Session
              </button>
              {recentSessions.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Recent
                  </div>
                  {recentSessions.map(s => (
                    <div key={s.id} style={{ fontSize: '12px', color: '#6B7280', padding: '4px 0', borderBottom: '1px solid #F0EDE6' }}>
                      {s.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {creating && (
            <div style={panelSectionStyle}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                Name this session — or use the default.
              </div>
              <input
                style={inputStyle}
                type="text"
                placeholder={defaultTitle()}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateSession(); }}
                autoFocus
              />
              <button style={btnPrimaryStyle} onClick={handleCreateSession} disabled={loading}>
                {loading ? 'Starting…' : 'Start Session'}
              </button>
              <button style={btnSecondaryStyle} onClick={() => setCreating(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}