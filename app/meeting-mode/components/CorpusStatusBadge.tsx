'use client';

import { useEffect, useState } from 'react';

interface BreakdownItem {
  type: string;
  label: string;
  weight: string;
  present: boolean;
}

interface CorpusStatus {
  status: 'core_complete' | 'critical_gap' | 'empty';
  statusLabel: string;
  breakdown: BreakdownItem[];
}

const badgeColors: Record<string, React.CSSProperties> = {
  core_complete: {
    backgroundColor: '#EBF5EC',
    color: '#2D6A35',
    border: '1px solid #A8D5AD',
  },
  critical_gap: {
    backgroundColor: '#FDF3E7',
    color: '#8B4F17',
    border: '1px solid #E8B87A',
  },
  empty: {
    backgroundColor: '#F5F5F5',
    color: '#666666',
    border: '1px solid #CCCCCC',
  },
};

const statusIcons: Record<string, string> = {
  core_complete: '✓',
  critical_gap: '⚠',
  empty: '○',
};

export default function CorpusStatusBadge({ associationId }: { associationId: string }) {
  const [data, setData] = useState<CorpusStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) return;
    fetch(`/api/corpus-status?association_id=${associationId}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [associationId]);

  useEffect(() => {
    if (!expanded) return;
    const handler = () => setExpanded(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [expanded]);

  if (loading || !data) return null;

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: 'Instrument Sans, sans-serif',
    ...badgeColors[data.status],
  };

  const chevronStyle: React.CSSProperties = {
    fontSize: '9px',
    opacity: 0.6,
  };

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E0DDD6',
    borderRadius: '10px',
    padding: '14px 16px',
    minWidth: '250px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    zIndex: 200,
  };

  const panelHeaderStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    color: '#999999',
    letterSpacing: '0.08em',
    marginBottom: '10px',
    fontFamily: 'Instrument Sans, sans-serif',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #F0EDE6',
    fontSize: '13px',
    color: '#1A2535',
    fontFamily: 'Instrument Sans, sans-serif',
  };

  const disclaimerStyle: React.CSSProperties = {
    marginTop: '10px',
    fontSize: '11px',
    color: '#AAAAAA',
    lineHeight: 1.5,
    fontFamily: 'Instrument Sans, sans-serif',
  };

  return (
    <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
      <div style={badgeStyle} onClick={() => setExpanded(e => !e)}>
        <span>{statusIcons[data.status]}</span>
        <span>{data.statusLabel}</span>
        <span style={chevronStyle}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>DOCUMENT COVERAGE</div>

          {data.breakdown.map((item, i) => (
            <div
              key={item.type}
              style={{
                ...rowStyle,
                borderBottom: i === data.breakdown.length - 1 ? 'none' : '1px solid #F0EDE6',
              }}
            >
              <span style={{
                color: item.present ? '#2D6A35' : '#C0392B',
                fontWeight: 700,
                minWidth: '14px',
                fontSize: '13px',
              }}>
                {item.present ? '✓' : '✗'}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {!item.present && item.weight === 'core' && (
                <span style={{
                  fontSize: '10px',
                  color: '#8B4F17',
                  fontWeight: 700,
                  backgroundColor: '#FDF3E7',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}>
                  CORE
                </span>
              )}
            </div>
          ))}

          <div style={disclaimerStyle}>
            Indicates expected document types only. Does not confirm legal completeness.
          </div>
        </div>
      )}
    </div>
  );
}