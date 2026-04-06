"use client";

// app/meeting-mode/components/AnswerCard.tsx
//
// Renders a structured answer from /api/ask.
// Sections are always in the same fixed order so board members
// know exactly where to look every time.
//
// Hierarchy-aware features:
//   - Each citation shows an authority badge (Declaration, Bylaws, etc.)
//   - Amendments display their parent document relationship
//   - A conflict warning block appears when sources span authority levels
//   - A statute disclaimer is always shown at the bottom

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface Citation {
  citation_label: string;           // e.g. "§ 4.2"
  heading: string;                  // e.g. "Maintenance Responsibilities"
  document_title: string;           // e.g. "CC&Rs"
  document_type: string;
  authority_rank: number;           // 10=Declaration, 20=Bylaws, 30=Rules
  authority_label: string;          // "Declaration / CC&Rs" etc.
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

interface AnswerCardProps {
  answer: Answer;
  citations: Citation[];
}

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const colors = {
  gold:         "#C4A054",
  goldDim:      "rgba(196, 160, 84, 0.15)",
  goldBorder:   "rgba(196, 160, 84, 0.2)",
  text:         "#E8E4DC",
  textDim:      "rgba(232, 228, 220, 0.65)",
  textFaint:    "rgba(232, 228, 220, 0.4)",
  green:        "#52B788",
  greenBg:      "rgba(45, 106, 79, 0.15)",
  greenBorder:  "rgba(45, 106, 79, 0.35)",
  amber:        "#F6AD55",
  amberBg:      "rgba(183, 121, 31, 0.12)",
  amberBorder:  "rgba(183, 121, 31, 0.35)",
  red:          "#FC8181",
  redBg:        "rgba(155, 44, 44, 0.12)",
  redBorder:    "rgba(155, 44, 44, 0.35)",
  orange:       "#F97316",
  orangeBg:     "rgba(249, 115, 22, 0.10)",
  orangeBorder: "rgba(249, 115, 22, 0.35)",
};

// ─────────────────────────────────────────────────────────────
// AUTHORITY BADGE CONFIG
//
// Maps authority_rank to a visual style so board members can
// immediately see which level of the hierarchy sourced each answer.
// Lower rank = higher authority = more prominent color.
// ─────────────────────────────────────────────────────────────
function getAuthorityStyle(rank: number) {
  if (rank <= 1)  return { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.4)",   color: "#A5B4FC", dot: "#818CF8" }; // Statute (future)
  if (rank <= 10) return { bg: colors.goldDim,           border: "rgba(196,160,84,0.4)",   color: colors.gold,   dot: colors.gold   }; // Declaration
  if (rank <= 20) return { bg: "rgba(56,178,172,0.12)",  border: "rgba(56,178,172,0.35)",  color: "#81E6D9", dot: "#4FD1C5" }; // Bylaws
  if (rank <= 30) return { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)", color: "#94A3B8", dot: "#94A3B8" }; // Rules
  return                 { bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.2)",  color: "#64748B", dot: "#64748B" }; // Other
}

// ─────────────────────────────────────────────────────────────
// CONFIDENCE BADGE
// ─────────────────────────────────────────────────────────────
function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high:   { label: "High Confidence",   bg: colors.greenBg,  border: colors.greenBorder,  color: colors.green,  dot: colors.green  },
    medium: { label: "Medium Confidence", bg: colors.amberBg,  border: colors.amberBorder,  color: colors.amber,  dot: colors.amber  },
    low:    { label: "Low Confidence",    bg: colors.redBg,    border: colors.redBorder,    color: colors.red,    dot: colors.red    },
  };
  const c = config[level];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:4, background:c.bg, border:`1px solid ${c.border}`, color:c.color, fontSize:11, fontFamily:"'DM Sans',sans-serif", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, flexShrink:0 }} />
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// AUTHORITY BADGE
// Appears on each citation to show hierarchy level.
// ─────────────────────────────────────────────────────────────
function AuthorityBadge({ rank, label }: { rank: number; label: string }) {
  const s = getAuthorityStyle(rank);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:3, background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:10, fontFamily:"'DM Sans',sans-serif", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION LABEL — labeled divider
// ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, marginTop:24 }}>
      <span style={{ color:"rgba(196,160,84,0.55)", fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
        {children}
      </span>
      <div style={{ flex:1, height:1, background:colors.goldBorder }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CITATION ITEM
//
// Renders one cited section. Shows:
//   - Authority badge (Declaration / Bylaws / Rules)
//   - Amendment relationship with parent document name
//   - The actual excerpt from the section
// ─────────────────────────────────────────────────────────────
function CitationItem({ citation, index }: { citation: Citation; index: number }) {
  return (
    <div style={{ padding:"14px 16px", borderRadius:6, background:"rgba(196,160,84,0.04)", border:`1px solid ${colors.goldBorder}`, marginBottom:10 }}>

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8 }}>
        {/* Index circle */}
        <span style={{ flexShrink:0, width:22, height:22, borderRadius:"50%", background:colors.goldDim, color:colors.gold, fontSize:11, fontFamily:"'DM Sans',sans-serif", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {index + 1}
        </span>

        <div style={{ flex:1 }}>
          {/* Citation label + heading */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
            <span style={{ color:colors.gold, fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:600 }}>
              {citation.citation_label}
            </span>
            <span style={{ color:colors.text, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500 }}>
              {citation.heading}
            </span>
          </div>

          {/* Document title + authority badge */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:11 }}>
              {citation.document_title}
            </span>
            <AuthorityBadge rank={citation.authority_rank} label={citation.authority_label} />
          </div>

          {/* Amendment relationship — shown only when this doc amends a parent */}
          {citation.is_amendment && citation.parent_document_title && (
            <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:3, background:colors.amberBg, border:`1px solid ${colors.amberBorder}`, color:colors.amber, fontSize:10, fontFamily:"'DM Sans',sans-serif", fontWeight:600, letterSpacing:"0.04em" }}>
                ↳ Amends: {citation.parent_document_title}
              </span>
              <span style={{ color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:10 }}>
                Reflects current version of that document
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Excerpt */}
      <p style={{ margin:0, marginLeft:32, color:colors.textDim, fontFamily:"'DM Sans',sans-serif", fontSize:12, lineHeight:1.65, fontStyle:"italic", borderLeft:"2px solid rgba(196,160,84,0.2)", paddingLeft:12 }}>
        "{citation.excerpt_text}"
      </p>

      {/* Page reference */}
      {citation.page_start && (
        <p style={{ margin:"6px 0 0 32px", color:colors.textFaint, fontFamily:"'DM Sans',sans-serif", fontSize:10 }}>
          Page {citation.page_start}{citation.page_end && citation.page_end !== citation.page_start ? `–${citation.page_end}` : ""}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ANSWER CARD — MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function AnswerCard({ answer, citations }: AnswerCardProps) {
  // Sort: highest authority first, then by relevance score within same rank
  const sortedCitations = [...citations].sort((a, b) => {
    if (a.authority_rank !== b.authority_rank) return a.authority_rank - b.authority_rank;
    return b.relevance_score - a.relevance_score;
  });

  return (
    <div style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${colors.goldBorder}`, borderRadius:10, padding:28, width:"100%" }}>

      {/* ── Confidence badge ─────────────────────────────── */}
      <div style={{ marginBottom:20 }}>
        <ConfidenceBadge level={answer.confidence_level} />
      </div>

      {/* ── 1. Direct Answer ─────────────────────────────── */}
      <div style={{ padding:"18px 20px", background:"rgba(196,160,84,0.07)", borderLeft:`3px solid ${colors.gold}`, borderRadius:"0 6px 6px 0" }}>
        <p style={{ margin:0, color:colors.text, fontFamily:"'Cormorant Garamond',serif", fontSize:20, lineHeight:1.4, fontWeight:600 }}>
          {answer.direct_answer}
        </p>
      </div>

      {/* ── 2. Plain-English Explanation ─────────────────── */}
      <SectionLabel>Plain-English Explanation</SectionLabel>
      <p style={{ margin:0, color:colors.textDim, fontFamily:"'DM Sans',sans-serif", fontSize:14, lineHeight:1.75 }}>
        {answer.plain_english_explanation}
      </p>

      {/* ── 3. Citations ──────────────────────────────────── */}
      {/* Sorted by authority rank so Declaration always appears above Bylaws above Rules */}
      {sortedCitations.length > 0 && (
        <>
          <SectionLabel>Source Sections ({sortedCitations.length})</SectionLabel>
          {sortedCitations.map((c, i) => (
            <CitationItem key={`${c.citation_label}-${i}`} citation={c} index={i} />
          ))}
        </>
      )}

      {/* ── 4a. Hierarchy Conflict Warning ───────────────── */}
      {/*
        Orange block. Distinct from ambiguity (amber) and legal flag (red).
        Appears when documents at different authority levels address
        the same question differently. The answer notes which controls.

        Three different warning types:
          Conflict (orange)   = different authority levels disagree
          Ambiguity (amber)   = a single document is unclear
          Legal flag (red)    = attorney review needed regardless
      */}
      {answer.has_hierarchy_conflict && answer.hierarchy_conflict_note && (
        <>
          <SectionLabel>Authority Conflict Detected</SectionLabel>
          <div style={{ padding:"14px 16px", background:colors.orangeBg, border:`1px solid ${colors.orangeBorder}`, borderLeft:`3px solid ${colors.orange}`, borderRadius:"0 6px 6px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:14 }}>⚠️</span>
              <span style={{ color:colors.orange, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase" }}>
                Documents at different authority levels address this topic differently
              </span>
            </div>
            <p style={{ margin:0, color:"rgba(249,115,22,0.85)", fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.65 }}>
              {answer.hierarchy_conflict_note}
            </p>
          </div>
        </>
      )}

      {/* ── 4b. Ambiguity Notes ───────────────────────────── */}
      {answer.ambiguity_notes && (
        <>
          <SectionLabel>Caution</SectionLabel>
          <div style={{ padding:"14px 16px", background:colors.amberBg, border:`1px solid ${colors.amberBorder}`, borderLeft:`3px solid ${colors.amber}`, borderRadius:"0 6px 6px 0" }}>
            <p style={{ margin:0, color:"rgba(246,173,85,0.9)", fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.65 }}>
              {answer.ambiguity_notes}
            </p>
          </div>
        </>
      )}

      {/* ── 4c. Legal Review Flag ─────────────────────────── */}
      {answer.counsel_review_recommended && (
        <div style={{ marginTop:12, padding:"10px 14px", background:colors.redBg, border:`1px solid ${colors.redBorder}`, borderRadius:6, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>⚖️</span>
          <p style={{ margin:0, color:"rgba(252,129,129,0.9)", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500 }}>
            Legal counsel review recommended before acting on this answer.
          </p>
        </div>
      )}

      {/* ── 5. Suggested Next Steps ───────────────────────── */}
      {answer.suggested_next_steps?.length > 0 && (
        <>
          <SectionLabel>Suggested Next Steps</SectionLabel>
          <ol style={{ margin:0, paddingLeft:18, color:colors.textDim, fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.8 }}>
            {answer.suggested_next_steps.map((step, i) => (
              <li key={i} style={{ marginBottom:4 }}>{step}</li>
            ))}
          </ol>
        </>
      )}

      {/* ── 6. Statute Disclaimer ─────────────────────────── */}
      {/*
        Always shown. State statute sits above all uploaded documents
        in the legal hierarchy. V1 does not include statute text in the
        corpus, so we always surface this note so boards are never misled
        into thinking their uploaded documents are the complete applicable law.
      */}
      <div style={{ marginTop:24, padding:"10px 14px", background:"rgba(148,163,184,0.06)", border:"1px solid rgba(148,163,184,0.15)", borderRadius:6 }}>
        <p style={{ margin:0, color:"rgba(148,163,184,0.7)", fontFamily:"'DM Sans',sans-serif", fontSize:11, lineHeight:1.6 }}>
          <span style={{ fontWeight:700 }}>Note: </span>
          {answer.statute_note ??
            "State statute (e.g. Ohio Revised Code § 5312 for HOAs or § 5311 for condominiums) sits above all governing documents in the legal hierarchy. Uploaded documents alone may not reflect all applicable law. Consult legal counsel for statute-dependent questions."}
        </p>
      </div>

    </div>
  );
}
