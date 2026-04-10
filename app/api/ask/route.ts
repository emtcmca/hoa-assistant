// app/api/ask/route.ts
//
// Full question-answering pipeline:
//   1. Receive question + association_id
//   2. Keyword search (PostgreSQL full-text)
//   3. Semantic search (pgvector cosine similarity)
//   4. Hybrid merge with hierarchy-aware ranking
//   5. GPT-4o-mini answer generation (hierarchy-grounded prompt)
//   6. Persist question / answer / citations to Supabase
//   7. Return structured answer + citations to client
 
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "../../../utils/supabase/server";
import OpenAI from "openai";
import { computeTransparentConfidence } from '../../utils/transparentConfidence';
 
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 
// ─────────────────────────────────────────────────────────────
// AUTHORITY RANK CONSTANTS
// Lower number = higher legal authority.
// These mirror the authority_rank values in the documents table.
// ─────────────────────────────────────────────────────────────
const AUTHORITY_RANK = {
  STATUTE:     1,
  DECLARATION: 10,
  BYLAWS:      20,
  RULES:       30,
  OTHER:       99,
} as const;
 
function authorityLabel(rank: number): string {
  if (rank <= 1)  return "State Statute";
  if (rank <= 10) return "Declaration / CC&Rs";
  if (rank <= 20) return "Bylaws";
  if (rank <= 30) return "Rules / Policies / Board Motions";
  return "Other";
}
 
// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface CandidateSection {
  id: string;
  document_id: string;
  document_title: string;
  document_type: string;
  authority_rank: number;
  amends_document_id: string | null;
  parent_document_title: string | null;
  citation_label: string;
  heading: string;
  body_text: string;
  page_start: number | null;
  page_end: number | null;
  semantic_score: number;
  keyword_score: number;
  combined_score: number;
}
 
interface AnswerJSON {
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
 
// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
//
// Instructs GPT-4o-mini to reason in legal hierarchy order,
// respect the amendment rule, flag cross-authority conflicts,
// and always note that state statute may apply.
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a governing document analysis assistant for HOA and condominium associations. Your job is to answer board questions by reasoning carefully from the provided document sections.
 
LEGAL HIERARCHY — always reason in this order:
1. State Statute / Law (highest authority — not in the document corpus for this query, but may apply; always note this possibility)
2. Declaration / CC&Rs (including all amendments to the Declaration)
3. Bylaws (including all amendments to the Bylaws)
4. Rules, Policies, Board Motions, Design Guidelines, Handbooks (lowest authority)
 
AMENDMENT RULE — critical:
- An amendment to the Declaration or Bylaws is NOT a separate or lower-authority document.
- An amendment IS the Declaration or Bylaws, updated. It reflects the current version of that document.
- When an amendment section and the original parent section both address the same topic, the amendment's version CONTROLS. Always prefer the amendment.
- When citing an amendment, note that it reflects the amended version of the parent document (e.g. "per the 2022 Amendment to the Declaration").
 
CONFLICT RULE:
- If sections from different authority levels address the same question and appear to say different things, identify the conflict explicitly.
- State which provision is likely controlling based on hierarchy.
- Do not silently pick one source without acknowledging the other.
- Set has_hierarchy_conflict to true if this occurs.
 
ANSWER RULES:
- Only assert what the provided sections actually say. Never fabricate authority.
- If the sections do not clearly answer the question, say so. Do not guess.
- If the answer is clear from a higher-authority document, ground the direct_answer there.
- Always note that state statute may impose additional requirements or limitations not reflected in the uploaded documents.
- Confidence: "high" = clear unambiguous provision in controlling document; "medium" = inferable but not explicit, or only in lower-authority doc; "low" = conflicting, silent, or ambiguous.
 
OUTPUT FORMAT — respond ONLY with a valid JSON object, no markdown, no preamble:
{
  "direct_answer": "Short decisive answer. One to three sentences maximum.",
  "plain_english_explanation": "Practical explanation a non-lawyer board member can act on.",
  "confidence_level": "high" | "medium" | "low",
  "ambiguity_notes": "Describe any ambiguity, silence, or uncertainty in the documents. Null if none.",
  "counsel_review_recommended": true | false,
  "suggested_next_steps": ["Step 1", "Step 2"],
  "has_hierarchy_conflict": true | false,
  "hierarchy_conflict_note": "Describe the conflict between authority levels if present. Null if none.",
  "statute_note": "Note that state statute (e.g. Ohio Revised Code § 5312 for HOAs or § 5311 for condominiums) may impose additional requirements or limitations. The uploaded documents alone may not reflect all applicable law. Consult legal counsel for statute-dependent questions."
}`;
 
// ─────────────────────────────────────────────────────────────
// HYBRID RANKING
//
// final_score = (semantic × 0.60)
//             + (keyword  × 0.25)
//             + authority_bonus
//             + amendment_bonus
//
// authority_bonus: rewards higher-authority documents.
// amendment_bonus: prevents amendments being penalized vs parent.
// ─────────────────────────────────────────────────────────────
function computeCombinedScore(
  semanticScore: number,
  keywordScore: number,
  authorityRank: number,
  isAmendment: boolean
): number {
  const base = semanticScore * 0.60 + keywordScore * 0.25;
 
  let authorityBonus = 0;
  if (authorityRank <= AUTHORITY_RANK.DECLARATION) authorityBonus = 0.15;
  else if (authorityRank <= AUTHORITY_RANK.BYLAWS)  authorityBonus = 0.10;
  else if (authorityRank <= AUTHORITY_RANK.RULES)   authorityBonus = 0.05;
 
  // Amendments get parent's authority bonus PLUS small recency bonus
  // so the amended version is preferred over the original when both surface.
  const amendmentBonus = isAmendment ? 0.03 : 0;
 
  return Math.min(1.0, base + authorityBonus + amendmentBonus);
}
 
// ─────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
 
    // Accept both snake_case (new) and camelCase (legacy) field names
    // so this route works regardless of which client calls it.
    const question_text   = body.question_text   ?? body.question     ?? null;
    const association_id  = body.association_id  ?? body.associationId ?? null;
    const mode            = body.mode            ?? "meeting";
    const meeting_id      = body.meeting_id      ?? body.meetingId    ?? null;
    const session_id      = body.session_id      ?? null;
 
    if (!question_text || !association_id) {
      return NextResponse.json(
        { error: "question_text and association_id are required" },
        { status: 400 }
      );
    }
 
    const supabase = createServiceClient();
 
    // ── 1. Embed the question ────────────────────────────────
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question_text,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
 
    // ── 2. Semantic search via pgvector ──────────────────────
    const { data: semanticResults, error: semanticError } = await supabase.rpc(
      "match_sections",
      {
        query_embedding: queryEmbedding,
        association_id_filter: association_id,
        match_count: 20,
      }
    );
 
    if (semanticError) {
      console.error("Semantic search error:", semanticError);
      return NextResponse.json({ error: "Semantic search failed" }, { status: 500 });
    }
 
    // ── 3. Keyword search via full-text ──────────────────────
    const { data: keywordResults, error: keywordError } = await supabase
      .from("document_sections")
      .select(`
        id,
        document_id,
        citation_label,
        heading,
        body_text,
        page_start,
        page_end,
        documents!inner (
          id,
          title,
          document_type,
          document_status,
          authority_rank,
          amends_document_id
        )
      `)
      .eq("association_id", association_id)
      .eq("documents.document_status", "active")
      .textSearch("search_vector", question_text, { type: "websearch" })
      .limit(20);
 
    if (keywordError) {
      console.error("Keyword search error:", keywordError);
      // Non-fatal — continue with semantic only
    }
 
    // ── 4. Resolve amendment parent ranks ───────────────────
    const amendmentParentIds = new Set<string>();
    (semanticResults || []).forEach((r: any) => {
      if (r.amends_document_id) amendmentParentIds.add(r.amends_document_id);
    });
    (keywordResults || []).forEach((r: any) => {
      if (r.documents?.amends_document_id) amendmentParentIds.add(r.documents.amends_document_id);
    });
 
    const parentDocMap: Record<string, { authority_rank: number; title: string }> = {};
    if (amendmentParentIds.size > 0) {
      const { data: parents } = await supabase
        .from("documents")
        .select("id, title, authority_rank")
        .in("id", Array.from(amendmentParentIds));
      (parents || []).forEach((p: any) => {
        parentDocMap[p.id] = { authority_rank: p.authority_rank, title: p.title };
      });
    }
 
    // ── 5. Build deduplicated candidate map ─────────────────
    const candidateMap = new Map<string, CandidateSection>();
 
    (semanticResults || []).forEach((r: any) => {
      const parent = r.amends_document_id ? parentDocMap[r.amends_document_id] : null;
      const effectiveRank = parent?.authority_rank ?? r.authority_rank ?? AUTHORITY_RANK.OTHER;
 
      candidateMap.set(r.id, {
        id: r.id,
        document_id: r.document_id,
        document_title: r.document_title,
        document_type: r.document_type,
        authority_rank: effectiveRank,
        amends_document_id: r.amends_document_id ?? null,
        parent_document_title: parent?.title ?? null,
        citation_label: r.citation_label,
        heading: r.heading,
        body_text: r.body_text,
        page_start: r.page_start,
        page_end: r.page_end,
        semantic_score: 1 - r.distance,
        keyword_score: 0,
        combined_score: 0,
      });
    });
 
    (keywordResults || []).forEach((r: any) => {
      const doc = r.documents;
      const parent = doc?.amends_document_id ? parentDocMap[doc.amends_document_id] : null;
      const effectiveRank = parent?.authority_rank ?? doc?.authority_rank ?? AUTHORITY_RANK.OTHER;
 
      const existing = candidateMap.get(r.id);
      if (existing) {
        existing.keyword_score = 0.8;
      } else {
        candidateMap.set(r.id, {
          id: r.id,
          document_id: r.document_id,
          document_title: doc?.title ?? "Unknown",
          document_type: doc?.document_type ?? "other",
          authority_rank: effectiveRank,
          amends_document_id: doc?.amends_document_id ?? null,
          parent_document_title: parent?.title ?? null,
          citation_label: r.citation_label,
          heading: r.heading,
          body_text: r.body_text,
          page_start: r.page_start,
          page_end: r.page_end,
          semantic_score: 0,
          keyword_score: 0.8,
          combined_score: 0,
        });
      }
    });
 
    // ── 6. Score and rank ────────────────────────────────────
    const candidates: CandidateSection[] = Array.from(candidateMap.values()).map((c) => ({
      ...c,
      combined_score: computeCombinedScore(
        c.semantic_score,
        c.keyword_score,
        c.authority_rank,
        !!c.amends_document_id
      ),
    }));
 
    candidates.sort((a, b) => b.combined_score - a.combined_score);
    const topCandidates = candidates.slice(0, 6);

    if (topCandidates.length === 0) {
      return NextResponse.json(
        { error: "no_results", message: "No relevant sections found for this question." },
        { status: 200 }
      );
    }

    const meaningfulCandidates = topCandidates.filter(
      c => c.combined_score > 0.05
    );

    if (meaningfulCandidates.length === 0) {
      return NextResponse.json(
        { error: "no_results", message: "No relevant sections found for this question." },
        { status: 200 }
      );
    }
    // Corpus coverage inputs for Transparent Confidence scoring
const activeDocTypes = new Set(
  topCandidates.map(c => c.document_type).filter(Boolean)
);

// Count distinct expected document types present across ALL active documents
// We use topCandidates as a proxy — not perfect but avoids an extra DB query
const expectedTypes = ['declaration', 'bylaws', 'rules', 'amendments', 'other'];
const presentExpectedCount = expectedTypes.filter(t =>
  Array.from(activeDocTypes).some(active =>
    active?.toLowerCase().includes(t)
  )
).length;

// missing_relevant_type = true only when:
// the question clearly needs a doc type AND that type is completely absent
// We approximate: if all top candidates are from one doc type AND
// the question would benefit from a higher-authority doc that isn't present
// For now: only flag if NO declaration or bylaws present at all
const hasHighAuthority = Array.from(activeDocTypes).some(dt =>
  dt?.toLowerCase().includes('declaration') ||
  dt?.toLowerCase().includes('bylaw') ||
  dt?.toLowerCase().includes('ccr')
);
const missingRelevantType = !hasHighAuthority && presentExpectedCount < 3;

    // ── 7. Build evidence block for the prompt ───────────────
    const evidenceBlock = topCandidates
      .map((c, i) => {
        const amendmentNote = c.amends_document_id && c.parent_document_title
          ? ` [Amendment to: ${c.parent_document_title}]`
          : "";
        return [
          `--- SOURCE ${i + 1} ---`,
          `Document: ${c.document_title}`,
          `[Authority Level: ${authorityLabel(c.authority_rank)}${amendmentNote}]`,
          `Section: ${c.citation_label} — ${c.heading}`,
          `Text: ${c.body_text}`,
        ].join("\n");
      })
      .join("\n\n");
 
    const userPrompt = `Question: ${question_text}\n\nDocument sections (ordered by relevance and legal authority):\n\n${evidenceBlock}`;
 
    // ── 8. Generate answer ───────────────────────────────────
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    });
 
    const rawAnswer = completion.choices[0]?.message?.content ?? "";
 
    // ── 9. Parse JSON response ───────────────────────────────
    let answer: AnswerJSON;
    try {
      const clean = rawAnswer.replace(/```json|```/g, "").trim();
      answer = JSON.parse(clean);
    } catch (parseErr) {
      console.error("Failed to parse model response:", rawAnswer);
      return NextResponse.json(
        { error: "Answer generation failed — could not parse model response." },
        { status: 500 }
      );
    }
    
 // Compute Transparent Confidence scorecard
    const scorecard = computeTransparentConfidence({
      confidence_level: answer.confidence_level,
      ambiguity_notes: answer.ambiguity_notes ?? null,
      counsel_review_recommended: answer.counsel_review_recommended,
      statute_note: answer.statute_note ?? null,
      has_hierarchy_conflict: answer.has_hierarchy_conflict ?? false,
      candidates: topCandidates.map(c => ({
        authority_rank: c.authority_rank,
        semantic_score: c.semantic_score,
        keyword_score: c.keyword_score,
        amends_document_id: c.amends_document_id,
        document_type: c.document_type,
        combined_score: c.combined_score,
      })),
      corpus_doc_count: presentExpectedCount,
      missing_relevant_type: missingRelevantType,
    });
    // ── 10. Persist to Supabase ──────────────────────────────
 
    // 10a. Question session
    const { data: session, error: sessionError } = await supabase
      .from("question_sessions")
      .insert({ association_id, mode, meeting_id, question_text })
      .select()
      .single();
 
    if (sessionError) {
      console.error("Failed to save question session:", sessionError);
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }
 
    // 10b. Answer row
    const { data: savedAnswer, error: answerError } = await supabase
      .from("answers")
      .insert({
        association_id,
        question_session_id: session.id,
        answer_status: "complete",
        direct_answer: answer.direct_answer,
        plain_english_explanation: answer.plain_english_explanation,
        ambiguity_notes: answer.ambiguity_notes,
        confidence_level: answer.confidence_level,
        counsel_review_recommended: answer.counsel_review_recommended,
        has_hierarchy_conflict: answer.has_hierarchy_conflict ?? false,
        hierarchy_conflict_note: answer.hierarchy_conflict_note ?? null,
        session_id: session_id,
        confidence_scorecard: scorecard,
      })
      .select()
      .single();
 
    if (answerError) {
      console.error("Failed to save answer:", answerError);
      return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
    }
 
    // 10c. Citations
    const citationRows = topCandidates.map((c, i) => ({
      association_id,
      answer_id: savedAnswer.id,
      document_section_id: c.id,
      citation_order: i + 1,
      relevance_score: c.combined_score,
      excerpt_text: c.body_text.slice(0, 500),
      evidence_role: i === 0 ? "primary" : "supporting",
    }));
 
    const { error: citationError } = await supabase
      .from("answer_citations")
      .insert(citationRows);
 
    if (citationError) {
      console.error("Failed to save citations:", citationError);
      // Non-fatal
    }
 
    // ── 11. Return response ──────────────────────────────────
    const citations = topCandidates.map((c) => ({
      citation_label: c.citation_label,
      heading: c.heading,
      document_title: c.document_title,
      document_type: c.document_type,
      authority_rank: c.authority_rank,
      authority_label: authorityLabel(c.authority_rank),
      is_amendment: !!c.amends_document_id,
      parent_document_title: c.parent_document_title,
      excerpt_text: c.body_text.slice(0, 400),
      relevance_score: c.combined_score,
      page_start: c.page_start,
      page_end: c.page_end,
    }));
 
    return NextResponse.json({
      answer: { ...answer, id: savedAnswer.id },
      citations,
      session_id: session.id,
      question_text,
      scorecard,
    });
 
  } catch (err) {
    console.error("Unhandled error in /api/ask:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
 