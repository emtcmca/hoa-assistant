"use client";

// app/meeting-mode/components/AnswerCard.tsx

import { useState } from "react";

export interface Citation {
  citation_label: string;
  heading: string;
  document_title: string;
  document_type: string;
  authority_rank: number;
  authority_label: string;
  is_amendment: boolean;
  parent_document_title: string | null;
  excerpt_text: string;
  relevance_score: number;
  page_start: number | null;
  page_end: number | null;
}

export interface Answer {
  direct_answer: string;
  plain_english_explanation: string;
  confidence_level: "high" | "medium" | "low";
  ambiguity_notes: string | null;
  counsel_review_recommended: boolean;
  suggested_next_steps: string[];
  has_hierarchy_conflict: boolean;
  hierarchy_conflict_note: string | null;
  statute_note: string | null;
}

interface DimensionScore {
  score: number;
  max: number;
  explanation: string;
}

interface ConfidenceScorecard {
  total: number;
  label: "Strong" | "Moderate" | "Limited" | "Insufficient";
  labelColor: "green" | "amber" | "orange" | "red";
  dimensions: {
    authority: DimensionScore;
    agreement: DimensionScore;
    coverage: DimensionScore;
    clarity: DimensionScore;
  };
}

interface AnswerCardProps {
  answer: Answer;
  citations: Citation[];
  scorecard?: ConfidenceScorecard | null;
}

const colors = {
  text:         "#1A2535",
  textMuted:    "rgba(26,37,53,0.55)",
  textFaint:    "rgba(26,37,53,0.35)",
  border:       "rgba(26,37,53,0.08)",
  cardBg:       "#FFFFFF",
  cardShadow:   "0 2px 12px rgba(26,37,53,0.06), 0 1px 3px rgba(26,37,53,0.04)",
  gold:         "#C4A054",
  goldDim:      "rgba(196,160,84,0.10)",
  goldBorder:   "rgba(196,160,84,0.25)",
  green:        "#2D6A4F",
  greenBg:      "rgba(64,145,108,0.08)",
  greenBorder:  "rgba(64,145,108,0.25)",
  amber:        "#92400E",
  amberBg:      "rgba(217,119,6,0.08)",
  amberBorder:  "rgba(217,119,6,0.25)",
  amberText:    "#D97706",
  red:          "#7F1D1D",
  redBg:        "rgba(220,38,38,0.06)",
  redBorder:    "rgba(220,38,38,0.20)",
  redText:      "#DC2626",
  orange:       "#9A3412",
  orangeBg:     "rgba(234,88,12,0.07)",
  orangeBorder: "rgba(234,88,12,0.22)",
  orangeText:   "#EA580C",
};

const scorecardLabelConfig = {
  Strong:       { bg: "rgba(64,145,108,0.08)",  border: "rgba(64,145,108,0.25)",  color: "#2D6A4F", dot: "#40916C" },
  Moderate:     { bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.25)",   color: "#92400E", dot: "#D97706" },
  Limited:      { bg: "rgba(234,88,12,0.07)",   border: "rgba(234,88,12,0.22)",   color: "#9A3412", dot: "#EA580C" },
  Insufficient: { bg: "rgba(220,38,38,0.06)",   border: "rgba(220,38,38,0.20)",   color: "#7F1D1D", dot: "#DC2626" },
};

function getBarColor(labelColor: string): string {
  if (labelColor === "green")  return "#40916C";
  if (labelColor === "amber")  return "#D97706";
  if (labelColor === "orange") return "#EA580C";
  return "#DC2626";
}

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.round((score / max) * 100);
  const trackStyle: React.CSSProperties = {
    width: "100%",
    height: 4,
    borderRadius: 2,
    background: "rgba(26,37,53,0.08)",
    overflow: "hidden",
  };
  const fillStyle: React.CSSProperties = {
    width: `${pct}%`,
    height: "100%",
    borderRadius: 2,
    background: color,
    transition: "width 0.4s ease",
  };
  return (
    <div style={trackStyle}>
      <div style={fillStyle} />
    </div>
  );
}

function DimensionRow({
  label,
  dimension,
  color,
}: {
  label: string;
  dimension: DimensionScore;
  color: string;
}) {
  const rowStyle: React.CSSProperties = {
    padding: "10px 0",
    borderBottom: "1px solid rgba(26,37,53,0.06)",
  };
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  };
  const labelStyle: React.CSSProperties = {
    color: colors.text,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    fontWeight: 600,
  };
  const scoreStyle: React.CSSProperties = {
    color: color,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.02em",
  };
  const explanationStyle: React.CSSProperties = {
    marginTop: 6,
    color: colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
    lineHeight: 1.6,
  };
  return (
    <div style={rowStyle}>
      <div style={headerStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={scoreStyle}>{dimension.score} / {dimension.max}</span>
      </div>
      <ScoreBar score={dimension.score} max={dimension.max} color={color} />
      <p style={explanationStyle}>{dimension.explanation}</p>
    </div>
  );
}

function TransparentConfidencePanel({ scorecard }: { scorecard: ConfidenceScorecard }) {
  const [expanded, setExpanded] = useState(
  scorecard.label === 'Insufficient' || scorecard.label === 'Limited'
);
  const cfg = scorecardLabelConfig[scorecard.label];
  const barColor = getBarColor(scorecard.labelColor);

  const panelStyle: React.CSSProperties = {
    marginBottom: 20,
    borderRadius: 8,
    border: `1px solid ${cfg.border}`,
    background: cfg.bg,
    overflow: "hidden",
  };
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    cursor: "pointer",
    userSelect: "none",
  };
  const leftGroupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
  const tmLabelStyle: React.CSSProperties = {
    color: cfg.color,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
  const dotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: cfg.dot,
    flexShrink: 0,
  };
  const scoreGroupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
  const numericStyle: React.CSSProperties = {
    color: cfg.color,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  };
  const dividerStyle: React.CSSProperties = {
    color: cfg.color,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
    opacity: 0.5,
  };
  const compositeStyle: React.CSSProperties = {
    color: cfg.color,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    fontWeight: 600,
  };
  const chevronStyle: React.CSSProperties = {
    color: cfg.color,
    fontSize: 11,
    opacity: 0.7,
    transition: "transform 0.2s",
    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
  };
  const breakdownStyle: React.CSSProperties = {
    padding: "0 16px 4px",
    borderTop: `1px solid ${cfg.border}`,
  };
  const footerStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderTop: `1px solid ${cfg.border}`,
    color: cfg.color,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
    opacity: 0.7,
    letterSpacing: "0.03em",
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onClick={() => setExpanded(e => !e)}>
        <div style={leftGroupStyle}>
          <span style={dotStyle} />
          <span style={tmLabelStyle}>Transparent Confidence™</span>
        </div>
        <div style={scoreGroupStyle}>
          <span style={numericStyle}>{scorecard.total}</span>
          <span style={dividerStyle}>/100</span>
          <span style={compositeStyle}>{scorecard.label}</span>
          <span style={chevronStyle}>▾</span>
        </div>
      </div>

      {expanded && (
        <div style={breakdownStyle}>
          <DimensionRow
            label="Document Authority"
            dimension={scorecard.dimensions.authority}
            color={barColor}
          />
          <DimensionRow
            label="Source Agreement"
            dimension={scorecard.dimensions.agreement}
            color={barColor}
          />
          <DimensionRow
            label="Corpus Coverage"
            dimension={scorecard.dimensions.coverage}
            color={barColor}
          />
          <DimensionRow
            label="Answer Clarity"
            dimension={scorecard.dimensions.clarity}
            color={barColor}
          />
          <div style={footerStyle}>
            Each dimension scored 0–25. Total reflects composite answer trustworthiness.
          </div>
        </div>
      )}
    </div>
  );
}

function getAuthorityStyle(rank: number) {
  if (rank <= 1)  return { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.25)",  color: "#4338CA", dot: "#6366F1" };
  if (rank <= 10) return { bg: colors.goldDim,           border: colors.goldBorder,         color: "#92712A", dot: colors.gold };
  if (rank <= 20) return { bg: "rgba(20,184,166,0.08)",  border: "rgba(20,184,166,0.25)",  color: "#0F766E", dot: "#14B8A6" };
  if (rank <= 30) return { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.20)", color: "#475569", dot: "#64748B" };
  return                 { bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.15)", color: "#64748B", dot: "#94A3B8" };
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high:   { label: "High Confidence",   bg: colors.greenBg,  border: colors.greenBorder,  color: colors.green,     dot: "#40916C" },
    medium: { label: "Medium Confidence", bg: colors.amberBg,  border: colors.amberBorder,  color: colors.amberText, dot: "#D97706" },
    low:    { label: "Low Confidence",    bg: colors.redBg,    border: colors.redBorder,    color: colors.redText,   dot: "#DC2626" },
  };
  const c = config[level];
  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 4,
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.color,
    fontSize: 11,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };
  const dotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: c.dot,
    flexShrink: 0,
  };
  return (
    <span style={badgeStyle}>
      <span style={dotStyle} />
      {c.label}
    </span>
  );
}

function AuthorityBadge({ rank, label }: { rank: number; label: string }) {
  const s = getAuthorityStyle(rank);
  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "2px 8px",
    borderRadius: 3,
    background: s.bg,
    border: `1px solid ${s.border}`,
    color: s.color,
    fontSize: 10,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  const dotStyle: React.CSSProperties = {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: s.dot,
    flexShrink: 0,
  };
  return (
    <span style={badgeStyle}>
      <span style={dotStyle} />
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    marginTop: 24,
  };
  const textStyle: React.CSSProperties = {
    color: "rgba(196,160,84,0.7)",
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  const lineStyle: React.CSSProperties = {
    flex: 1,
    height: 1,
    background: colors.goldBorder,
  };
  return (
    <div style={wrapperStyle}>
      <span style={textStyle}>{children}</span>
      <div style={lineStyle} />
    </div>
  );
}

function CitationItem({ citation, index }: { citation: Citation; index: number }) {
  const containerStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: 6,
    background: "rgba(196,160,84,0.04)",
    border: `1px solid ${colors.goldBorder}`,
    borderLeft: `3px solid ${colors.gold}`,
    marginBottom: 10,
  };
  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  };
  const indexCircleStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: colors.goldDim,
    color: "#92712A",
    fontSize: 11,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const labelRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  };
  const citationLabelStyle: React.CSSProperties = {
    color: colors.gold,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    fontWeight: 600,
  };
  const headingStyle: React.CSSProperties = {
    color: colors.text,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    fontWeight: 500,
  };
  const docRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  };
  const docTitleStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
  };
  const amendmentRowStyle: React.CSSProperties = {
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  };
  const amendmentBadgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "2px 8px",
    borderRadius: 3,
    background: colors.amberBg,
    border: `1px solid ${colors.amberBorder}`,
    color: colors.amberText,
    fontSize: 10,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: "0.04em",
  };
  const amendmentNoteStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
  };
  const excerptStyle: React.CSSProperties = {
    margin: 0,
    marginLeft: 32,
    color: colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    lineHeight: 1.65,
    fontStyle: "italic",
    borderLeft: `2px solid ${colors.goldBorder}`,
    paddingLeft: 12,
  };
  const pageRefStyle: React.CSSProperties = {
    margin: "6px 0 0 32px",
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 10,
  };

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <span style={indexCircleStyle}>{index + 1}</span>
        <div style={{ flex: 1 }}>
          <div style={labelRowStyle}>
            <span style={citationLabelStyle}>{citation.citation_label}</span>
            <span style={headingStyle}>{citation.heading}</span>
          </div>
          <div style={docRowStyle}>
            <span style={docTitleStyle}>{citation.document_title}</span>
            <AuthorityBadge rank={citation.authority_rank} label={citation.authority_label} />
          </div>
          {citation.is_amendment && citation.parent_document_title && (
            <div style={amendmentRowStyle}>
              <span style={amendmentBadgeStyle}>
                ↳ Amends: {citation.parent_document_title}
              </span>
              <span style={amendmentNoteStyle}>Reflects current version of that document</span>
            </div>
          )}
        </div>
      </div>
      <p style={excerptStyle}>"{citation.excerpt_text}"</p>
      {citation.page_start && (
        <p style={pageRefStyle}>
          Page {citation.page_start}
          {citation.page_end && citation.page_end !== citation.page_start ? `–${citation.page_end}` : ""}
        </p>
      )}
    </div>
  );
}

export default function AnswerCard({ answer, citations, scorecard }: AnswerCardProps) {
  const sortedCitations = [...citations].sort((a, b) => {
    if (a.authority_rank !== b.authority_rank) return a.authority_rank - b.authority_rank;
    return b.relevance_score - a.relevance_score;
  });

  const cardStyle: React.CSSProperties = {
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: 28,
    width: "100%",
    boxShadow: colors.cardShadow,
  };
  const directAnswerBlockStyle: React.CSSProperties = {
    padding: "18px 20px",
    background: "rgba(196,160,84,0.07)",
    borderLeft: `3px solid ${colors.gold}`,
    borderRadius: "0 6px 6px 0",
  };
  const directAnswerTextStyle: React.CSSProperties = {
    margin: 0,
    color: colors.text,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    lineHeight: 1.4,
    fontWeight: 600,
  };
  const plainEnglishStyle: React.CSSProperties = {
    margin: 0,
    color: colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.75,
  };
  const conflictBlockStyle: React.CSSProperties = {
    padding: "14px 16px",
    background: colors.orangeBg,
    border: `1px solid ${colors.orangeBorder}`,
    borderLeft: `3px solid ${colors.orangeText}`,
    borderRadius: "0 6px 6px 0",
  };
  const conflictHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  };
  const conflictLabelStyle: React.CSSProperties = {
    color: colors.orangeText,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  };
  const conflictTextStyle: React.CSSProperties = {
    margin: 0,
    color: colors.orange,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.65,
  };
  const ambiguityBlockStyle: React.CSSProperties = {
    padding: "14px 16px",
    background: colors.amberBg,
    border: `1px solid ${colors.amberBorder}`,
    borderLeft: `3px solid ${colors.amberText}`,
    borderRadius: "0 6px 6px 0",
  };
  const ambiguityTextStyle: React.CSSProperties = {
    margin: 0,
    color: colors.amber,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.65,
  };
  const legalFlagStyle: React.CSSProperties = {
    marginTop: 12,
    padding: "10px 14px",
    background: colors.redBg,
    border: `1px solid ${colors.redBorder}`,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  const legalTextStyle: React.CSSProperties = {
    margin: 0,
    color: colors.redText,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 12,
    fontWeight: 500,
  };
  const stepsListStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: 18,
    color: colors.textMuted,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.8,
  };
  const statuteBlockStyle: React.CSSProperties = {
    marginTop: 24,
    padding: "10px 14px",
    background: "rgba(26,37,53,0.03)",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
  };
  const statuteTextStyle: React.CSSProperties = {
    margin: 0,
    color: colors.textFaint,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: 11,
    lineHeight: 1.6,
  };

  return (
    <div style={cardStyle}>

      {scorecard && (
        <TransparentConfidencePanel scorecard={scorecard} />
      )}

      <div style={{ marginBottom: 20 }}>
        <ConfidenceBadge level={answer.confidence_level} />
      </div>

      <div style={directAnswerBlockStyle}>
        <p style={directAnswerTextStyle}>{answer.direct_answer}</p>
      </div>

      <SectionLabel>Plain-English Explanation</SectionLabel>
      <p style={plainEnglishStyle}>{answer.plain_english_explanation}</p>

      {sortedCitations.length > 0 && (
        <>
          <SectionLabel>Source Sections ({sortedCitations.length})</SectionLabel>
          {sortedCitations.map((c, i) => (
            <CitationItem key={`${c.citation_label}-${i}`} citation={c} index={i} />
          ))}
        </>
      )}

      {answer.has_hierarchy_conflict && answer.hierarchy_conflict_note && (
        <>
          <SectionLabel>Authority Conflict Detected</SectionLabel>
          <div style={conflictBlockStyle}>
            <div style={conflictHeaderStyle}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={conflictLabelStyle}>
                Documents at different authority levels address this topic differently
              </span>
            </div>
            <p style={conflictTextStyle}>{answer.hierarchy_conflict_note}</p>
          </div>
        </>
      )}

      {answer.ambiguity_notes && (
        <>
          <SectionLabel>Caution</SectionLabel>
          <div style={ambiguityBlockStyle}>
            <p style={ambiguityTextStyle}>{answer.ambiguity_notes}</p>
          </div>
        </>
      )}

      {answer.counsel_review_recommended && (
        <div style={legalFlagStyle}>
          <span style={{ fontSize: 14 }}>⚖️</span>
          <p style={legalTextStyle}>
            Legal counsel review recommended before acting on this answer.
          </p>
        </div>
      )}

      {answer.suggested_next_steps?.length > 0 && (
        <>
          <SectionLabel>Suggested Next Steps</SectionLabel>
          <ol style={stepsListStyle}>
            {answer.suggested_next_steps.map((step, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{step}</li>
            ))}
          </ol>
        </>
      )}

      <div style={statuteBlockStyle}>
        <p style={statuteTextStyle}>
          <span style={{ fontWeight: 700 }}>Note: </span>
          {answer.statute_note ??
            "State statute (e.g. Ohio Revised Code § 5312 for HOAs or § 5311 for condominiums) sits above all governing documents in the legal hierarchy. Uploaded documents alone may not reflect all applicable law. Consult legal counsel for statute-dependent questions."}
        </p>
      </div>

    </div>
  );
}
