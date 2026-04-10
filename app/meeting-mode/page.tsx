"use client";

// app/meeting-mode/page.tsx

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import AnswerCard, { Answer, Citation } from "./components/AnswerCard";
import type { ConfidenceScorecard } from "../utils/transparentConfidence";
import DraftPanel from "../components/meeting/DraftPanel";
import ShareButton from './components/ShareButton';
import CorpusStatusBadge from './components/CorpusStatusBadge';
import SessionSelector from './components/SessionSelector';

interface SessionEntry {
  id: string;
  answer_id: string;
  question_text: string;
  answer: Answer;
  citations: Citation[];
  scorecard: ConfidenceScorecard | null;
  asked_at: Date;
}

const colors = {
  bg:          "#F4F2ED",
  bgLeftPanel: "#ECEAE4",
  bgCard:      "#FFFFFF",
  gold:        "#C4A054",
  goldDim:     "rgba(196,160,84,0.12)",
  goldBorder:  "rgba(196,160,84,0.25)",
  text:        "#1A2535",
  textMuted:   "rgba(26,37,53,0.55)",
  textFaint:   "rgba(26,37,53,0.35)",
  border:      "rgba(26,37,53,0.08)",
  borderInput: "rgba(26,37,53,0.14)",
  white:       "#FFFFFF",
};

function LoadingSpinner() {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: 20,
  };
  const spinnerStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    border: `3px solid ${colors.goldDim}`,
    borderTop: `3px solid ${colors.gold}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };
  const labelStyle: React.CSSProperties = {
    margin: 0,
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
  };
  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      <p style={labelStyle}>Searching governing documents...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState() {
  const examples = [
    "Who is responsible for maintaining the landscaping?",
    "What vote threshold is required to amend the bylaws?",
    "Can the board approve a special assessment without an owner vote?",
    "Are pets permitted, and is there a weight limit?",
    "What is the process for approving an architectural change?",
  ];

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 32px",
    gap: 24,
    border: `1px dashed ${colors.goldBorder}`,
    borderRadius: 10,
    background: "rgba(196,160,84,0.03)",
  };
  const headingStyle: React.CSSProperties = {
    margin: "0 0 8px 0",
    color: colors.gold,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
  };
  const subStyle: React.CSSProperties = {
    margin: 0,
    color: colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.6,
  };
  const labelStyle: React.CSSProperties = {
    margin: "0 0 10px 0",
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: "center" }}>
        <p style={headingStyle}>Ask a governing document question</p>
        <p style={subStyle}>
          Type a plain-English question or paste an owner message. The system will search your
          association's governing documents and return a cited answer in seconds.
        </p>
      </div>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <p style={labelStyle}>Example questions</p>
        {examples.map((ex, i) => {
          const exStyle: React.CSSProperties = {
            margin: "0 0 6px 0",
            color: colors.textMuted,
            fontFamily: "'Instrument Sans', system-ui, sans-serif",
            fontSize: 12,
            lineHeight: 1.5,
            paddingLeft: 10,
            borderLeft: `2px solid ${colors.goldBorder}`,
          };
          return <p key={i} style={exStyle}>{ex}</p>;
        })}
      </div>
    </div>
  );
}

function HistoryItem({
  entry,
  isActive,
  onClick,
}: {
  entry: SessionEntry;
  isActive: boolean;
  onClick: () => void;
}) {
  const confidenceColorMap: Record<"high" | "medium" | "low", string> = {
    high:   "#40916C",
    medium: "#D97706",
    low:    "#DC2626",
  };
  const confidenceColor =
    confidenceColorMap[entry.answer.confidence_level as "high" | "medium" | "low"] ?? "#94A3B8";

  const btnStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 6,
    background: isActive ? colors.goldDim : "transparent",
    border: isActive ? `1px solid ${colors.goldBorder}` : "1px solid transparent",
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
  };
  const qStyle: React.CSSProperties = {
    margin: "0 0 4px 0",
    color: isActive ? colors.text : colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  };
  const metaStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  const dotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: confidenceColor,
    flexShrink: 0,
  };
  const timeStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
  };

  return (
    <button
      onClick={onClick}
      style={btnStyle}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) e.currentTarget.style.background = "rgba(26,37,53,0.04)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <p style={qStyle}>{entry.question_text}</p>
      <div style={metaStyle}>
        <span style={dotStyle} />
        <span style={timeStyle}>
          {entry.asked_at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span style={timeStyle}>
          {" "}· {entry.citations.length} source{entry.citations.length !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}

export default function MeetingModePage() {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [associationId, setAssociationId]     = useState<string | null>(null);
  const [associationName, setAssociationName] = useState<string>("");
  const [authLoading, setAuthLoading]         = useState(true);

  const [question, setQuestion]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([]);
  const [activeEntryId, setActiveEntryId]   = useState<string | null>(null);

  const [showDraft, setShowDraft]           = useState(false);
  const [draftAnswer, setDraftAnswer]       = useState<any>(null);
  const [draftCitations, setDraftCitations] = useState<any[]>([]);

  const activeEntry = sessionHistory.find(e => e.id === activeEntryId) ?? null;

  const [activeSession, setActiveSession] = useState<{ id: string; title: string } | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
  async function init() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("association_memberships")
      .select("association_id")
      .eq("user_id", session.user.id)
      .limit(1);

      setUserId(session.user.id);

    if (membershipError) {
      console.error("Membership query error:", membershipError);
      setError("No association found for your account. Contact your administrator.");
      setAuthLoading(false);
      return;
    }

    const membership = memberships?.[0];
    if (!membership) {
      setError("No association found for your account. Contact your administrator.");
      setAuthLoading(false);
      return;
    }

    const { data: assocData, error: assocError } = await supabase
      .from("associations")
      .select("id, display_name")
      .eq("id", membership.association_id);

    if (assocError || !assocData || assocData.length === 0) {
      setError("Could not load association data. Contact your administrator.");
      setAuthLoading(false);
      return;
    }

    const assoc = assocData[0];

    setAssociationId(assoc.id);
    setAssociationName(assoc.display_name);
    setAuthLoading(false);

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  init();
}, []);

  async function handleAsk() {
    console.log('handleAsk — activeSession:', activeSession);
    const trimmed = question.trim();
    if (!trimmed || !associationId || isLoading) return;

    setIsLoading(true);
    setError(null);
    setShowDraft(false);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: trimmed,
          association_id: associationId,
          session_id: activeSession?.id || null,
          mode: "meeting",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.message ?? data.error ?? "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      const entry: SessionEntry = {
        id: data.session_id,
        answer_id: data.answer.id,
        question_text: trimmed,
        answer: data.answer,
        citations: data.citations,
        scorecard: data.scorecard ?? null,
        asked_at: new Date(),
      };

      setSessionHistory(prev => [entry, ...prev]);
      setActiveEntryId(entry.id);
      setQuestion("");
    } catch (err) {
      console.error("Ask error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleOpenDraft() {
    if (!activeEntry) return;
    setDraftAnswer({
      direct_answer:       activeEntry.answer.direct_answer,
      plain_english:       activeEntry.answer.plain_english_explanation,
      confidence_level:    activeEntry.answer.confidence_level,
      has_conflict:        activeEntry.answer.has_hierarchy_conflict,
      conflict_note:       activeEntry.answer.hierarchy_conflict_note,
      counsel_recommended: activeEntry.answer.counsel_review_recommended,
    });
    setDraftCitations(
      (activeEntry.citations ?? []).map((c: Citation) => ({
        citation_label: c.citation_label,
        heading:        c.heading,
        excerpt:        c.excerpt_text,
      }))
    );
    setShowDraft(true);
  }

  if (authLoading) {
    const loadingPageStyle: React.CSSProperties = {
      minHeight: "100vh",
      background: colors.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };
    return <div style={loadingPageStyle}><LoadingSpinner /></div>;
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: colors.bg,
    display: "flex",
    flexDirection: "column",
  };

  const headerStyle: React.CSSProperties = {
    padding: "14px 32px",
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: colors.white,
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 1px 3px rgba(26,37,53,0.06)",
  };

  const meetingLabelRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
  };

  const meetingBadgeStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  const pulseDotStyle: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#40916C",
    display: "inline-block",
    animation: "pulse 2s ease-in-out infinite",
  };

  const meetingLabelStyle: React.CSSProperties = {
    color: "#2D6A4F",
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };

  const dividerStyle: React.CSSProperties = {
    color: colors.border,
  };

  const assocNameStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
  };

  const exitLinkStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    textDecoration: "none",
    transition: "color 0.15s",
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    gap: 0,
    overflow: "hidden",
  };

  const leftPanelStyle: React.CSSProperties = {
    width: 360,
    flexShrink: 0,
    borderRight: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 57px)",
    background: colors.bgLeftPanel,
  };

  const inputAreaStyle: React.CSSProperties = {
    padding: "24px 20px",
    borderBottom: `1px solid ${colors.border}`,
  };

  const inputLabelStyle: React.CSSProperties = {
    display: "block",
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 10,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    background: colors.white,
    border: `1px solid ${question.trim() ? colors.goldBorder : colors.borderInput}`,
    borderRadius: 6,
    color: colors.text,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.6,
    resize: "none",
    outline: "none",
    transition: "border-color 0.15s",
    caretColor: colors.gold,
  };

  const errorStyle: React.CSSProperties = {
    margin: "8px 0 0 0",
    color: "#DC2626",
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
  };

  const askBtnStyle: React.CSSProperties = {
    marginTop: 10,
    width: "100%",
    padding: "11px 0",
    background: question.trim() && !isLoading ? colors.gold : colors.goldDim,
    border: "none",
    borderRadius: 6,
    color: question.trim() && !isLoading ? "#FFFFFF" : colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    fontWeight: 700,
    cursor: question.trim() && !isLoading ? "pointer" : "not-allowed",
    transition: "background 0.15s, color 0.15s",
    letterSpacing: "0.03em",
  };

  const historyScrollStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px",
  };

  const sessionLabelStyle: React.CSSProperties = {
    margin: "0 0 10px 8px",
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };

  const emptyHistoryStyle: React.CSSProperties = {
    margin: 0,
    padding: "12px 8px",
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    lineHeight: 1.6,
  };

  const rightPanelStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "32px",
    background: colors.bg,
  };

  const questionPrefixStyle: React.CSSProperties = {
    margin: "0 0 16px 0",
    color: colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
  };

  const draftBtnStyle: React.CSSProperties = {
    padding: "0.625rem 1.25rem",
    background: colors.goldDim,
    border: `1px solid ${colors.goldBorder}`,
    borderRadius: "6px",
    color: colors.gold,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.03em",
    transition: "background 0.15s",
  };
  console.log('render check — associationId:', associationId);
  console.log('render check — activeSession:', activeSession);

return (
    <div style={pageStyle}>

      <header style={headerStyle}>
        <div style={meetingLabelRowStyle}>
          <div style={meetingBadgeStyle}>
            <span style={pulseDotStyle} />
            <span style={meetingLabelStyle}>Meeting Mode</span>
          </div>
          <span style={dividerStyle}>|</span>
          <span style={assocNameStyle}>{associationName}</span>
          {associationId && (
            <CorpusStatusBadge associationId={associationId} />
          )}
          {associationId && (
            <SessionSelector
              associationId={associationId}
              userId={userId ?? undefined}
              onSessionChange={setActiveSession}
            />
          )}
        </div>
        
         <a href="/dashboard"
          style={exitLinkStyle}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = colors.text; }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = colors.textFaint; }}
        >
          Exit Meeting Mode
        </a>
      </header>

      <main style={mainStyle}>

        <div style={leftPanelStyle}>
          <div style={inputAreaStyle}>
            <label style={inputLabelStyle}>Ask a Question</label>
            <textarea
              ref={inputRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"Ask a question or paste an owner message...\n\nShift+Enter for new line, Enter to ask."}
              disabled={isLoading}
              rows={4}
              style={textareaStyle}
            />
            {error && <p style={errorStyle}>{error}</p>}
            <button
              onClick={handleAsk}
              disabled={!question.trim() || isLoading}
              style={askBtnStyle}
            >
              {isLoading ? "Searching..." : "Ask"}
            </button>
          </div>

          <div style={historyScrollStyle}>
            {sessionHistory.length > 0 ? (
              <>
                <p style={sessionLabelStyle}>This Session ({sessionHistory.length})</p>
                {sessionHistory.map(entry => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    isActive={entry.id === activeEntryId}
                    onClick={() => {
                      setActiveEntryId(entry.id);
                      setShowDraft(false);
                    }}
                  />
                ))}
              </>
            ) : (
              <p style={emptyHistoryStyle}>
                Questions asked this session will appear here. Click any to review its answer.
              </p>
            )}
          </div>
        </div>

        <div style={rightPanelStyle}>
          {isLoading && <LoadingSpinner />}
          {!isLoading && activeEntry && (
            <>
              <p style={questionPrefixStyle}>
                <span style={{ color: colors.gold, fontWeight: 600 }}>Q: </span>
                {activeEntry.question_text}
              </p>
              <AnswerCard
                answer={activeEntry.answer}
                citations={activeEntry.citations}
                scorecard={activeEntry.scorecard ?? null}
              />
              <div style={{ marginTop: "1.25rem", display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleOpenDraft}
                  style={draftBtnStyle}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "rgba(196,160,84,0.22)"; }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = colors.goldDim; }}
                >
                  Draft a Response
                </button>
                <ShareButton answerId={activeEntry.answer_id} />
              </div>
            </>
          )}
          {!isLoading && !activeEntry && <EmptyState />}
        </div>
      </main>

      {showDraft && draftAnswer && (
        <DraftPanel
          question={activeEntry?.question_text ?? ""}
          answer={draftAnswer}
          citations={draftCitations}
          onClose={() => setShowDraft(false)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

    </div>
  );
}