'use client';

import { useState } from 'react';

interface ShareButtonProps {
  answerId: string;
}

export default function ShareButton({ answerId }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');

  const handleShare = async () => {
    setStatus('loading');

    try {
      const res = await fetch('/api/share-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerId }),
      });

      if (!res.ok) throw new Error('Share failed');

      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.token}`;

      await navigator.clipboard.writeText(shareUrl);
      setStatus('copied');

      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const labelMap = {
    idle: '🔗 Share',
    loading: 'Creating link...',
    copied: '✓ Link copied!',
    error: 'Error — try again',
  };

  const colorMap: Record<string, string> = {
    idle: '#1A2535',
    loading: '#6B7280',
    copied: '#166534',
    error: '#991B1B',
  };

  const buttonStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid #D1C9B8',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: status === 'loading' ? 'wait' : 'pointer',
    color: colorMap[status],
    fontFamily: 'Instrument Sans, sans-serif',
    transition: 'all 0.15s ease',
  };

  return (
    <button
      style={buttonStyle}
      onClick={handleShare}
      disabled={status === 'loading'}
    >
      {labelMap[status]}
    </button>
  );
}