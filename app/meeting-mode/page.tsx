"use client";

// app/meeting-mode/page.tsx

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import AnswerCard, { Answer, Citation } from "./components/AnswerCard";
import DraftPanel from "../components/meeting/DraftPanel";

interface SessionEntry {
  id: string;
  question_text: string;
  answer: Answer;
  citations: Citation[];
  asked_at: Date;
}

const colors = {
  bg:           "#0C1525",
  bgCard:       "rgba(255,255,255,0.025)",
  gold:         "#C4A054",
  goldDim:      "rgba(196,160,84,0.15)",
  goldBorder:   "rgba(196,160,84,0.2)",
  text:         "#E8E4DC",
  textDim:      "rgba(232,228,220,0.65)",
  textFaint:    "rgba(232,228,220,0.4)",
  border:       "rgba(255,255,255,0.07)",
};

function LoadingSpinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:20 }}>
      <div style={{
        width: 40, height: 40,
        border: `3px solid ${colors.goldDim}`,
        borderTop: `3px solid ${colors.gold}`,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ margin:0, color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
        Searching governing documents...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState() {
  const examples = [
    "Who is responsible for maintaining the windows?",
    "What vote threshold is required to amend the bylaws?",
    "Can the board approve a special assessment without an owner vote?",
    "Are pets permitted, and is there a weight limit?",
    "What is the process for approving an architectural change?",
  ];

  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"60px 32px", gap:24,
      border: `1px dashed ${colors.goldBorder}`,
      borderRadius:10, background:"rgba(196,160,84,0.02)",
    }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ margin:"0 0 8px 0", color:colors.gold, fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600 }}>
          Ask a governing document question
        </p>
        <p style={{ margin:0, color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.6 }}>
          Type a plain-English question or paste an owner message. The system will search your association's
          governing documents and return a cited answer in seconds.
        </p>
      </div>
      <div style={{ width:"100%", maxWidth:480 }}>
        <p style={{ margin:"0 0 10px 0", color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
          Example questions
        </p>
        {examples.map((ex, i) => (
          <p key={i} style={{ margin:"0 0 6px 0", color:colors.textDim, fontFamily:"'DM Sans',sans-serif", fontSize:12, lineHeight:1.5, paddingLeft:10, borderLeft:`2px solid ${colors.goldBorder}` }}>
            {ex}
          </p>
        ))}
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
    high:   "#52B788",
    medium: "#F6AD55",
    low:    "#FC8181",
  };
  const confidenceColor = confidenceColorMap[entry.answer.confidence_level as "high" | "medium" | "low"] ?? "#94A3B8";

  return (
    <button
      onClick={onClick}
      style={{
        width:"100%", textAlign:"left",
        padding:"10px 12px",
        borderRadius:6,
        background: isActive ? colors.goldDim : "transparent",
        border: isActive ? `1px solid ${colors.goldBorder}` : "1px solid transparent",
        cursor:"pointer",
        transition:"background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <p style={{
        margin:"0 0 4px 0", color:isActive ? colors.text : colors.textDim,
        fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, lineHeight:1.4,
        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
      }}>
        {entry.question_text}
      </p>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:confidenceColor, flexShrink:0 }} />
        <span style={{ color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:10 }}>
          {entry.asked_at.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
        </span>
        <span style={{ color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:10 }}>
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

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("association_memberships")
        .select("association_id, associations(id, display_name)")
        .eq("user_id", session.user.id)
        .limit(1);

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

      const assocRaw = membership.associations as any;
      const assoc = Array.isArray(assocRaw) ? assocRaw[0] : assocRaw;

      if (!assoc) {
        setError("Could not load association data. Contact your administrator.");
        setAuthLoading(false);
        return;
      }

      setAssociationId(assoc.id);
      setAssociationName(assoc.display_name);
      setAuthLoading(false);

      setTimeout(() => inputRef.current?.focus(), 100);
    }

    init();
  }, []);

  async function handleAsk() {
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
        question_text: trimmed,
        answer: data.answer,
        citations: data.citations,
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
    return (
      <div style={{ minHeight:"100vh", background:colors.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:colors.bg, display:"flex", flexDirection:"column" }}>

      <header style={{
        padding:"16px 32px",
        borderBottom:`1px solid ${colors.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(12,21,37,0.95)",
        position:"sticky", top:0, zIndex:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{
              width:8, height:8, borderRadius:"50%",
              background:colors.gold, display:"inline-block",
              animation:"pulse 2s ease-in-out infinite",
            }} />
            <span style={{ color:colors.gold, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
              Meeting Mode
            </span>
          </div>
          <span style={{ color:colors.border }}>|</span>
          <span style={{ color:colors.textDim, fontFamily:"'Cormorant Garamond',serif", fontSize:16 }}>
            {associationName}
          </span>
        </div>
        <a
          href="/dashboard"
          style={{ color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:12, textDecoration:"none", transition:"color 0.15s" }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = colors.text; }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = colors.textFaint; }}
        >
          Exit Meeting Mode
        </a>
      </header>

      <main style={{ flex:1, display:"flex", gap:0, overflow:"hidden" }}>

        <div style={{
          width:360, flexShrink:0,
          borderRight:`1px solid ${colors.border}`,
          display:"flex", flexDirection:"column",
          height:"calc(100vh - 57px)",
        }}>

          <div style={{ padding:"24px 20px", borderBottom:`1px solid ${colors.border}` }}>
            <label style={{
              display:"block", color:colors.textFaint,
              fontFamily:"'DM Sans',sans-serif", fontSize:10,
              fontWeight:700, letterSpacing:"0.1em",
              textTransform:"uppercase", marginBottom:10,
            }}>
              Ask a Question
            </label>

            <textarea
              ref={inputRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"Ask a question or paste an owner message...\n\nShift+Enter for new line, Enter to ask."}
              disabled={isLoading}
              rows={4}
              style={{
                width:"100%", boxSizing:"border-box",
                padding:"12px 14px",
                background:"rgba(255,255,255,0.04)",
                border:`1px solid ${question.trim() ? colors.goldBorder : colors.border}`,
                borderRadius:6,
                color:colors.text,
                fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.6,
                resize:"none", outline:"none",
                transition:"border-color 0.15s",
                caretColor:colors.gold,
              }}
            />

            {error && (
              <p style={{ margin:"8px 0 0 0", color:"#FC8181", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>
                {error}
              </p>
            )}

            <button
              onClick={handleAsk}
              disabled={!question.trim() || isLoading}
              style={{
                marginTop:10, width:"100%",
                padding:"11px 0",
                background: question.trim() && !isLoading ? colors.gold : colors.goldDim,
                border:"none", borderRadius:6,
                color: question.trim() && !isLoading ? "#0C1525" : colors.textFaint,
                fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700,
                cursor: question.trim() && !isLoading ? "pointer" : "not-allowed",
                transition:"background 0.15s, color 0.15s",
                letterSpacing:"0.03em",
              }}
            >
              {isLoading ? "Searching..." : "Ask"}
            </button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"16px 12px" }}>
            {sessionHistory.length > 0 ? (
              <>
                <p style={{ margin:"0 0 10px 8px", color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  This Session ({sessionHistory.length})
                </p>
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
              <p style={{ margin:0, padding:"12px 8px", color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:12, lineHeight:1.6 }}>
                Questions asked this session will appear here. Click any to review its answer.
              </p>
            )}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"32px" }}>

          {isLoading && <LoadingSpinner />}

          {!isLoading && activeEntry && (
            <>
              <p style={{ margin:"0 0 16px 0", color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>
                <span style={{ color:colors.gold, fontWeight:600 }}>Q: </span>
                {activeEntry.question_text}
              </p>

              <AnswerCard
                answer={activeEntry.answer}
                citations={activeEntry.citations}
              />

              <div style={{ marginTop:"1.25rem" }}>
                <button
                  onClick={handleOpenDraft}
                  style={{
                    padding:"0.625rem 1.25rem",
                    background:"rgba(168,135,46,0.12)",
                    border:"1px solid rgba(168,135,46,0.35)",
                    borderRadius:"6px",
                    color:colors.gold,
                    fontFamily:"'DM Sans',sans-serif",
                    fontSize:"0.8rem",
                    fontWeight:600,
                    cursor:"pointer",
                    letterSpacing:"0.03em",
                    transition:"background 0.15s",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "rgba(168,135,46,0.22)"; }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "rgba(168,135,46,0.12)"; }}
                >
                  Draft a Response
                </button>
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
