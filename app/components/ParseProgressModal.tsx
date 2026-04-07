'use client'

type ParsePhase = 'uploading' | 'extracting' | 'complete' | 'error'

interface ParseProgressModalProps {
  isOpen: boolean
  phase: ParsePhase
  documentTitle: string
  sectionCount?: number
  errorMessage?: string
  onClose: () => void
}

const PHASE_CONFIG: Record<ParsePhase, { label: string; detail: string; icon: string }> = {
  uploading: {
    icon: '📤',
    label: 'Uploading document',
    detail: 'Sending your file to secure storage…',
  },
  extracting: {
    icon: '🔍',
    label: 'Reading and parsing',
    detail: 'OCR is running, then GPT-4o is extracting sections. This takes 2–4 minutes for most documents.',
  },
  complete: {
    icon: '✅',
    label: 'Document ready',
    detail: '',
  },
  error: {
    icon: '⚠️',
    label: 'Something went wrong',
    detail: '',
  },
}

export default function ParseProgressModal({
  isOpen,
  phase,
  documentTitle,
  sectionCount,
  errorMessage,
  onClose,
}: ParseProgressModalProps) {
  if (!isOpen) return null

  const config = PHASE_CONFIG[phase]
  const isFinished = phase === 'complete' || phase === 'error'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#1A2535',
        border: '1px solid #2A3545',
        borderRadius: 12,
        padding: '40px 48px',
        maxWidth: 480,
        width: '90%',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          {config.icon}
        </div>

        {/* Phase label */}
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 24,
          color: '#E8E4DC',
          margin: '0 0 8px',
        }}>
          {config.label}
        </h2>

        {/* Document title */}
        <p style={{
          color: '#C4A054',
          fontSize: 14,
          fontWeight: 600,
          margin: '0 0 16px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {documentTitle}
        </p>

        {/* Detail text or dynamic message */}
        {phase === 'complete' && (
          <p style={{ color: '#27AE60', fontSize: 14, margin: '0 0 24px', fontFamily: 'DM Sans, sans-serif' }}>
            Parsed into {sectionCount} sections and indexed for search.
          </p>
        )}
        {phase === 'error' && (
          <p style={{ color: '#C0392B', fontSize: 14, margin: '0 0 24px', fontFamily: 'DM Sans, sans-serif' }}>
            {errorMessage ?? 'An unknown error occurred. Please try again.'}
          </p>
        )}
        {!isFinished && (
          <p style={{ color: '#8A8A8A', fontSize: 13, margin: '0 0 28px', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
            {config.detail}
          </p>
        )}

        {/* Spinner or close button */}
        {!isFinished ? (
          <Spinner />
        ) : (
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#C4A054',
              color: '#0C1525',
              border: 'none',
              borderRadius: 6,
              padding: '10px 32px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {phase === 'complete' ? 'Done' : 'Close'}
          </button>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#C4A054',
            animation: 'bounce 1.2s infinite ease-in-out',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}