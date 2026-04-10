// app/utils/transparentConfidence.ts
//
// Transparent Confidence™ scoring engine
// Computes a 0–100 score across four dimensions for every answer.
// Result is stored in answers.confidence_scorecard (jsonb).

export interface DimensionScore {
  score: number;
  max: number;
  explanation: string;
}

export interface ConfidenceScorecard {
  total: number;
  label: 'Strong' | 'Moderate' | 'Limited' | 'Insufficient';
  labelColor: 'green' | 'amber' | 'orange' | 'red';
  dimensions: {
    authority: DimensionScore;
    agreement: DimensionScore;
    coverage: DimensionScore;
    clarity: DimensionScore;
  };
}

interface ScoringInputs {
  // From the answer generation
  confidence_level: 'high' | 'medium' | 'low';
  ambiguity_notes: string | null;
  counsel_review_recommended: boolean;
  statute_note: string | null;
  has_hierarchy_conflict: boolean;

  // From the top candidates (retrieved sections)
  candidates: Array<{
    authority_rank: number;
    semantic_score: number;
    keyword_score: number;
    amends_document_id: string | null;
    document_type: string | null;
    combined_score: number; 
  }>;

  // From corpus status
  corpus_doc_count: number; // how many of 5 expected types are present
  missing_relevant_type: boolean; // true if the doc type most relevant to this Q is absent
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 1 — Document Authority (0–25)
// Measures the legal rank of sources that produced the answer.
// ─────────────────────────────────────────────────────────────
function scoreAuthority(inputs: ScoringInputs): DimensionScore {
  const { candidates } = inputs;

  if (candidates.length === 0) {
    return {
      score: 0,
      max: 25,
      explanation: 'No governing document sections were retrieved for this question.',
    };
  }

  // Normalize rank — fall back to document_type inference if rank is 99 or missing
  const effectiveRanks = candidates.map(c => {
    if (c.authority_rank && c.authority_rank < 99) return c.authority_rank;
    const dt = (c.document_type ?? '').toLowerCase();
    if (dt.includes('declaration') || dt.includes('ccr')) return 10;
    if (dt.includes('bylaw')) return 20;
    // Amendments treated at Declaration level unless title suggests Bylaws
    if (dt.includes('amendment')) {
      const title = (c.document_type ?? '').toLowerCase();
      return title.includes('bylaw') ? 20 : 10;
    }
    if (dt.includes('rule') || dt.includes('policy')) return 30;
    return 99;
  });

  const minRank = Math.min(...effectiveRanks);
  const hasAmendment = candidates.some(c => c.amends_document_id !== null);
  const hasMultipleLevels = new Set(effectiveRanks).size > 1;

  let base = 0;
  let explanation = '';

  if (minRank <= 10) {
    base = 25;
    explanation = 'Answer grounded in Declaration / CC&Rs — highest governing authority in your document corpus.';
  } else if (minRank <= 20) {
    base = 20;
    explanation = 'Answer grounded in Bylaws — second-tier governing authority.';
  } else if (minRank <= 30) {
    base = 13;
    explanation = 'Answer grounded in Rules or Policies — lower governing authority. Declaration and Bylaws would supersede if they address this topic.';
  } else {
    base = 5;
    explanation = 'Answer grounded in documents of unclassified or minimal authority.';
  }

  if (hasAmendment) {
    explanation += ' Amendment sections included and weighted at parent document authority — amended version controls over original language.';
  }

  if (hasMultipleLevels) {
    base = Math.min(25, base + 2);
    explanation += ' Multiple authority levels consulted.';
  }

  return { score: base, max: 25, explanation };
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 2 — Source Agreement (0–25)
// Measures whether independent retrieval paths agreed.
// ─────────────────────────────────────────────────────────────
function scoreAgreement(inputs: ScoringInputs): DimensionScore {
  const { candidates, has_hierarchy_conflict } = inputs;

  if (candidates.length === 0) {
    return {
      score: 0,
      max: 25,
      explanation: 'No sections retrieved — source agreement cannot be evaluated.',
    };
  }

  // Check how many top candidates appeared in both retrieval paths
  const bothPaths = candidates.filter(c => c.semantic_score > 0 && c.keyword_score > 0);
  const semanticOnly = candidates.filter(c => c.semantic_score > 0 && c.keyword_score === 0);
  const keywordOnly = candidates.filter(c => c.semantic_score === 0 && c.keyword_score > 0);

  if (has_hierarchy_conflict) {
    return {
      score: 5,
      max: 25,
      explanation: 'A conflict was detected between document authority levels. Sections from different governing tiers address this question differently — the higher-authority provision controls, but the conflict reduces answer certainty.',
    };
  }

  if (bothPaths.length >= 2) {
    return {
      score: 25,
      max: 25,
      explanation: `${bothPaths.length} sections were independently confirmed by both semantic and keyword search — strong retrieval agreement.`,
    };
  }

  if (bothPaths.length === 1) {
    return {
      score: 20,
      max: 25,
      explanation: '1 section confirmed by both retrieval methods. Remaining sections found by a single method only.',
    };
  }

  if (semanticOnly.length > 0 && keywordOnly.length === 0) {
    return {
      score: 15,
      max: 25,
      explanation: 'Sections retrieved via semantic search only. Keyword search did not independently surface the same content — moderate retrieval confidence.',
    };
  }

  if (keywordOnly.length > 0 && semanticOnly.length === 0) {
    return {
      score: 12,
      max: 25,
      explanation: 'Sections retrieved via keyword search only. Semantic search did not independently surface the same content.',
    };
  }

  return {
    score: 8,
    max: 25,
    explanation: 'Limited retrieval agreement. Only a single section was found and it was not corroborated by a second retrieval method.',
  };
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 3 — Corpus Coverage (0–25)
// Measures whether the document set is complete enough
// to answer this question reliably.
// ─────────────────────────────────────────────────────────────
function scoreCoverage(inputs: ScoringInputs): DimensionScore {
  const { corpus_doc_count, missing_relevant_type, candidates, confidence_level } = inputs;

  const capped = Math.min(5, Math.max(0, corpus_doc_count));

  // If the question is answered directly by a high-authority document
  // (Declaration or Bylaws) with high confidence, coverage is satisfied
  // regardless of total corpus size. The controlling document is present
  // and it speaks clearly — no other document needs to address this topic.
  const hasHighAuthorityAnswer = candidates.some(
    c => c.authority_rank <= 20 && c.combined_score > 0.5
  );

  if (hasHighAuthorityAnswer && confidence_level === 'high') {
    const explanation = capped >= 3
      ? 'Controlling document is present and directly addresses this question. Full corpus not required for this topic.'
      : capped === 2
      ? 'Controlling document present and answer is grounded. Additional document types would strengthen coverage on other topics.'
      : 'Controlling document present. Consider uploading additional document types to improve coverage on other questions.';

    return {
      score: 25,
      max: 25,
      explanation,
    };
  }

  // For medium/low confidence answers, or answers not grounded in
  // high-authority documents, corpus completeness matters more
  let base = 0;
  let baseLabel = '';

  if (capped === 5) { base = 25; baseLabel = 'All 5 expected document types are present and active.'; }
  else if (capped === 4) { base = 20; baseLabel = '4 of 5 expected document types are present.'; }
  else if (capped === 3) { base = 14; baseLabel = '3 of 5 expected document types are present.'; }
  else if (capped === 2) { base = 8;  baseLabel = '2 of 5 expected document types are present.'; }
  else if (capped === 1) { base = 4;  baseLabel = 'Only 1 document type is present in your corpus.'; }
  else                   { base = 0;  baseLabel = 'No documents are active in your corpus.'; }

  let score = base;
  let explanation = baseLabel;

  if (missing_relevant_type) {
    score = Math.max(0, score - 5);
    explanation += ' A document type directly relevant to this question appears to be missing — the answer may be incomplete.';
  }

  if (capped === 5 && !missing_relevant_type) {
    explanation += ' Full corpus coverage supports high answer reliability.';
  }

  return { score, max: 25, explanation };
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 4 — Answer Clarity (0–25)
// Measures how directly the governing text addressed
// the question versus how much inference was required.
// ─────────────────────────────────────────────────────────────
function scoreClarity(inputs: ScoringInputs): DimensionScore {
  const { confidence_level, ambiguity_notes, counsel_review_recommended, statute_note } = inputs;

  let base = 0;
  let explanation = '';

  if (confidence_level === 'high' && !ambiguity_notes) {
    base = 25;
    explanation = 'Governing text directly and unambiguously addresses this question.';
  } else if (confidence_level === 'high' && ambiguity_notes) {
    base = 18;
    explanation = 'Governing text addresses this question but contains some ambiguity: ' + ambiguity_notes;
  } else if (confidence_level === 'medium') {
    base = 12;
    explanation = 'Answer is inferable from governing text but not explicitly stated, or is drawn from a lower-authority document only.';
    if (ambiguity_notes) {
      explanation += ' Ambiguity noted: ' + ambiguity_notes;
    }
  } else {
    base = 5;
    explanation = 'Governing documents are silent, conflicting, or ambiguous on this question. Answer reflects best available inference only.';
  }

  if (counsel_review_recommended) {
    base = Math.max(0, base - 3);
    explanation += ' Legal counsel review recommended before acting on this answer.';
  }

  if (statute_note) {
    base = Math.max(0, base - 2);
    explanation += ' State statute may impose additional requirements not reflected in the uploaded documents.';
  }

  return { score: base, max: 25, explanation };
}

// ─────────────────────────────────────────────────────────────
// COMPOSITE LABEL
// ─────────────────────────────────────────────────────────────
function deriveLabel(total: number): {
  label: ConfidenceScorecard['label'];
  labelColor: ConfidenceScorecard['labelColor'];
} {
  if (total >= 85) return { label: 'Strong',       labelColor: 'green'  };
  if (total >= 65) return { label: 'Moderate',     labelColor: 'amber'  };
  if (total >= 40) return { label: 'Limited',      labelColor: 'orange' };
  return               { label: 'Insufficient',  labelColor: 'red'    };
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export function computeTransparentConfidence(inputs: ScoringInputs): ConfidenceScorecard {
  const authority = scoreAuthority(inputs);
  const agreement = scoreAgreement(inputs);
  const coverage  = scoreCoverage(inputs);
  const clarity   = scoreClarity(inputs);

  const total = authority.score + agreement.score + coverage.score + clarity.score;
  const { label, labelColor } = deriveLabel(total);

  return {
    total,
    label,
    labelColor,
    dimensions: { authority, agreement, coverage, clarity },
  };
}