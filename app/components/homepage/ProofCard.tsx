'use client'

import { useState, useEffect, useRef } from 'react'

const QA = [
  {
    q: "Can an owner install a security camera that captures the common area hallway?",
    answer: "An owner may install a camera near their unit entrance, but board approval is required if the field of view captures more than three feet of the common hallway. A written request is sufficient for most standard doorbell-style cameras.",
    plain: "Three governing documents address this together. The declaration requires board approval for any installation affecting common elements — and the hallway is a defined common element. The security device policy permits cameras facing inward or capturing only the immediate entryway without approval, but requires a written request for hallway footage. A 2022 board resolution set the limit at three feet of adjacent hallway without a full board vote. Most doorbell cameras fall within this range.",
    sources: ["Declaration § 4.8", "Declaration § 1.6", "Rules § 7.3", "Resolution 2022-04"],
    pct: 100,
    label: "High",
    flag: null,
  },
  {
    q: "Who is responsible for repairing a water leak originating inside a unit wall?",
    answer: "Responsibility depends on whether the pipe exclusively serves the unit or is shared infrastructure. Pipes within the unit boundary serving only that unit are the owner's responsibility. Pipes serving multiple units or running through common elements are the association's responsibility.",
    plain: "The wall is generally the boundary line. If the leaking pipe only serves one unit, the owner handles the repair. If it serves multiple units or runs through common space, the association steps in. The rules also require the owner to report water intrusion within 24 hours — which matters significantly if there is a later dispute about when damage began.",
    sources: ["Declaration § 6.2", "Declaration § 6.5", "Rules § 9.1"],
    pct: 100,
    label: "High",
    flag: null,
  },
  {
    q: "Can the board impose a fine for a second parking violation within 30 days?",
    answer: "Yes. A second parking violation within 30 days qualifies for a $50 fine under the violation schedule. If the original warning cited the expedited procedure, the board may assess the fine without an additional cure period.",
    plain: "The rules set a clear escalation schedule — written warning first, then fines. A 2021 resolution tightened the process for repeat offenders: if the first notice mentioned the expedited procedure, the board does not need another cure period before issuing the fine. The 10-day written notice before assessment still applies regardless.",
    sources: ["Declaration § 12.3", "Rules § 11.2", "Resolution 2021-07"],
    pct: 100,
    label: "High",
    flag: "Confirm the original violation notice included the expedited procedure language before assessing without a cure period.",
  },
  {
    q: "Does adding a dog park to the common area require an owner vote?",
    answer: "Most likely yes. A dedicated dog park involves fixed structures and restricts general access to a portion of common property — which the board's own 2023 resolution defines as a permanent alteration requiring owner approval, regardless of project cost.",
    plain: "The board has spending authority up to $15,000 without an owner vote, but that authority does not apply when a project permanently changes the character of common property. A 2023 resolution the board itself adopted defined permanent alteration to include dedicated-use installations that restrict general owner access. Even if the cost is under the threshold, the vote is likely required.",
    sources: ["Declaration § 3.4", "Bylaws § 8.2", "Resolution 2023-02"],
    pct: 75,
    label: "Moderate",
    flag: "Counsel review recommended before scheduling an owner vote.",
  },
  {
    q: "Can an owner rent their unit for less than 30 days?",
    answer: "No. The rules prohibit leases of less than 30 consecutive days, and this prohibition explicitly covers vacation rentals and platform-based rentals such as Airbnb or VRBO.",
    plain: "The declaration gives the board authority to set lease terms through the rules, and the rules set a firm 30-day minimum. A 2020 resolution confirmed the board takes this seriously — it authorized management to monitor listing platforms actively and empowered the board to seek legal remedies including fee recovery against violators. This is a clear prohibition with active enforcement behind it.",
    sources: ["Declaration § 9.1", "Rules § 14.1", "Resolution 2020-11"],
    pct: 100,
    label: "High",
    flag: null,
  },
]

type QAItem = typeof QA[0]

function useTypewriter(text: string, active: boolean, speed = 36) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) {
      setDisplayed('')
      setDone(false)
      return
    }
    let i = 0
    setDisplayed('')
    setDone(false)
    const tick = () => {
      i++
      setDisplayed(text.slice(0, i))
      if (i < text.length) {
        setTimeout(tick, speed + Math.random() * 18)
      } else {
        setDone(true)
      }
    }
    const t = setTimeout(tick, speed)
    return () => clearTimeout(t)
  }, [text, active, speed])

  return { displayed, done }
}

export default function ProofCard() {
  const [index, setIndex] = useState(0)
  const [typing, setTyping] = useState(false)
  const [showCursor, setShowCursor] = useState(false)
  const [revealStep, setRevealStep] = useState(0)
  const [bodyVisible, setBodyVisible] = useState(true)
  const [currentQA, setCurrentQA] = useState<QAItem>(QA[0])
  const bodyRef = useRef<HTMLDivElement>(null)

  const { displayed, done: typeDone } = useTypewriter(currentQA.q, typing)

  const runSequence = (qa: QAItem) => {
    setRevealStep(0)
    setShowCursor(false)
    setTyping(false)
    // Reset revealStep first, then swap content a frame later
    setTimeout(() => {
      setCurrentQA(qa)
      // Then fade back in after content is fully swapped
      setTimeout(() => {
        setBodyVisible(true)
        setTimeout(() => {
          setTyping(true)
          setShowCursor(true)
        }, 85)
      }, 60)
    }, 85)
  }

  // Kick off on mount
  useEffect(() => {
    setTimeout(() => {
      setTyping(true)
      setShowCursor(true)
    }, 900)
  }, [])

  // When typing finishes → reveal answer blocks one by one
  useEffect(() => {
    if (!typeDone) return

    setShowCursor(false)

    const delays = [380, 760, 1100, 1400, 1680, 1860]
    const timers: ReturnType<typeof setTimeout>[] = []

    delays.forEach((d, i) => {
      timers.push(setTimeout(() => setRevealStep(i + 1), d))
    })

    // After reading pause → fade out → swap to next question
    timers.push(setTimeout(() => {
      setBodyVisible(false)
      setTimeout(() => {
        const next = (index + 1) % QA.length
        setIndex(next)
        runSequence(QA[next])
      }, 500)
    }, 1860 + 8500))

    return () => timers.forEach(clearTimeout)
  }, [typeDone, index])

  const confColor = currentQA.pct === 100 ? 'var(--gold)' : '#B45309'

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '520px',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--border)',
    }}>
      {/* macOS chrome */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 16px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        {['#FF5F57', '#FFBD2E', '#28C840'].map((color, i) => (
          <div key={i} style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
          }} />
        ))}
        <div style={{
          flex: 1,
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-d)',
          fontWeight: 500,
          letterSpacing: '0.03em',
        }}>
          BoardPath — Meeting Mode
        </div>
      </div>

      {/* Progress dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px 16px 0',
      }}>
        {QA.map((_, i) => (
          <div key={i} style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: i === index ? 'var(--gold-b)' : 'var(--border-m)',
            transform: i === index ? 'scale(1.4)' : 'scale(1)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Card body */}
      <div
        ref={bodyRef}
        style={{
          padding: '16px 20px 20px',
          opacity: bodyVisible ? 1 : 0,
          transition: 'opacity 0.45s ease',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* Question label */}
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '6px',
        }}>
          Question
        </div>

        {/* Typed question */}
        <div style={{
          fontSize: '14px',
          color: 'var(--text)',
          fontWeight: 500,
          lineHeight: 1.5,
          minHeight: '42px',
          marginBottom: '14px',
        }}>
          {displayed}
          {showCursor && (
            <span style={{
              display: 'inline-block',
              width: '2px',
              height: '14px',
              background: 'var(--text)',
              marginLeft: '2px',
              verticalAlign: 'middle',
              animation: 'blink 0.7s step-end infinite',
            }} />
          )}
        </div>

        {/* Direct Answer */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '10px',
          opacity: revealStep >= 1 ? 1 : 0,
          transform: revealStep >= 1 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-d)', marginBottom: '4px' }}>Direct Answer</div>
          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.55 }}>{currentQA.answer}</div>
        </div>

        {/* Plain English */}
        <div style={{
          background: 'var(--gold-bg)',
          border: '1px solid var(--gold-border)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '10px',
          opacity: revealStep >= 2 ? 1 : 0,
          transform: revealStep >= 2 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '4px' }}>Plain-English Explanation</div>
          <div style={{ fontSize: '12px', color: 'var(--text-m)', lineHeight: 1.6 }}>{currentQA.plain}</div>
        </div>

        {/* Sources */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '10px',
          opacity: revealStep >= 3 ? 1 : 0,
          transition: 'opacity 0.45s ease',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-d)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', alignSelf: 'center' }}>Sources:</span>
          {currentQA.sources.map((s) => (
            <span key={s} style={{
              fontSize: '11px',
              background: 'var(--gold-bg)',
              border: '1px solid var(--gold-border)',
              color: 'var(--gold)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 500,
            }}>{s}</span>
          ))}
        </div>

        {/* Confidence */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
          opacity: revealStep >= 4 ? 1 : 0,
          transition: 'opacity 0.45s ease',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-d)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Confidence</span>
          <div style={{ flex: 1, height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: revealStep >= 4 ? `${currentQA.pct}%` : '0%',
              background: confColor,
              borderRadius: '2px',
              transition: 'width 0.6s ease 0.06s',
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: confColor }}>{currentQA.label}</span>
        </div>

        {/* Flag */}
        {currentQA.flag && (
          <div style={{
            background: 'rgba(180,83,9,0.06)',
            border: '1px solid rgba(180,83,9,0.2)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '12px',
            color: '#92400E',
            lineHeight: 1.5,
            opacity: revealStep >= 5 ? 1 : 0,
            transition: 'opacity 0.45s ease',
          }}>
            ⚠ {currentQA.flag}
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          opacity: revealStep >= 6 ? 1 : 0,
          transition: 'opacity 0.45s ease',
        }}>
          {['Save Answer', 'Draft Notice', 'Copy Citation'].map((label) => (
            <button key={label} style={{
              flex: 1,
              padding: '7px 4px',
              fontSize: '11px',
              fontWeight: 500,
              background: 'var(--bg2)',
              border: '1px solid var(--border-m)',
              borderRadius: '6px',
              color: 'var(--text-m)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}