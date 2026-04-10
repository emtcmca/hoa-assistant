import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

const supabase = createClient(
  'https://erufxxxmabwllqqndbkc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydWZ4eHhtYWJ3bGxxcW5kYmtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDg1MSwiZXhwIjoyMDkwNzkwODUxfQ.NVzWsJrK0u2g_FlA6dc062TNcKRyNGxrb8BFfCg15Jo'
);

interface Citation {
  id: string;
  excerpt_text: string;
  document_sections: {
    section_number: string | null;
    heading: string | null;
    page_start: number | null;
    documents: {
      title: string | null;
      document_type: string | null;
    } | null;
  } | null;
}

interface Answer {
  id: string;
  direct_answer: string;
  plain_english_explanation: string | null;
  confidence_level: string | null;
  ambiguity_notes: string | null;
  created_at: string;
  question_sessions: { question_text: string }[] | null;
  answer_citations: Citation[];
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

// Fetch the share record
const shareResult = await supabase
  .from('shared_answers')
  .select('answer_id')
  .eq('token', token);

if (!shareResult.data || shareResult.data.length === 0) {
  notFound();
}

  const answerId = shareResult.data[0].answer_id;

  // Fetch the answer with citations
  const answerResult = await supabase
  .from('answers')
  .select(`
    id,
    direct_answer,
    plain_english_explanation,
    confidence_level,
    ambiguity_notes,
    created_at,
    question_sessions!question_session_id (
      question_text
    ),
    answer_citations (
      id,
      excerpt_text,
      document_sections (
        section_number,
        heading,
        page_start,
        documents (
          title,
          document_type
        )
      )
    )
  `)
  .eq('id', answerId);

if (!answerResult.data || answerResult.data.length === 0) {
  notFound();
}

  // Increment view count (fire and forget — don't await)
  supabase
    .from('shared_answers')
    .update({ view_count: supabase.rpc('increment') })
    .eq('token', token);

  const answer = answerResult.data[0] as unknown as Answer;

  const confidenceBadgeColor = (level: string | null): string => {
    if (level === 'high') return '#166534';
    if (level === 'medium') return '#92400E';
    return '#6B7280';
  };

  // --- Styles ---
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#F8F6F1',
    fontFamily: 'Instrument Sans, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    background: '#1A2535',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoStyle: React.CSSProperties = {
    color: '#C4A054',
    fontFamily: 'Instrument Sans, sans-serif',
    fontWeight: '600',
    fontSize: '18px',
    letterSpacing: '-0.3px',
  };

  const badgeStyle: React.CSSProperties = {
    background: '#2A3545',
    color: '#A0AEC0',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '20px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E5E0D8',
    borderRadius: '12px',
    padding: '28px 32px',
    maxWidth: '720px',
    margin: '40px auto',
  };

  const questionStyle: React.CSSProperties = {
    fontSize: '15px',
    color: '#6B7280',
    marginBottom: '8px',
    fontStyle: 'italic',
  };

  const answerStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#1A2535',
    fontWeight: '600',
    lineHeight: '1.5',
    marginBottom: '20px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
    marginTop: '20px',
  };

  const citationChipStyle: React.CSSProperties = {
    display: 'inline-block',
    background: '#F3F0E8',
    border: '1px solid #D1C9B8',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    color: '#1A2535',
    marginRight: '8px',
    marginBottom: '8px',
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '32px',
    fontSize: '13px',
    color: '#9CA3AF',
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={logoStyle}>BoardPath</span>
        <span style={badgeStyle}>Shared Answer</span>
      </div>

      {/* Answer Card */}
      <div style={cardStyle}>
        <p style={questionStyle}>"{(answer.question_sessions as any)?.question_text}"</p>

        <p style={answerStyle}>{answer.direct_answer}</p>

        {answer.plain_english_explanation && (
          <>
            <div style={sectionLabelStyle}>Plain English</div>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
              {answer.plain_english_explanation}
            </p>
          </>
        )}

        {answer.answer_citations && answer.answer_citations.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Citations</div>
            <div>
              {answer.answer_citations.map((c) => (
                <span key={c.id} style={citationChipStyle}>
                  {c.document_sections?.section_number && `§ ${c.document_sections.section_number}`}
                  {c.document_sections?.heading ? ` — ${c.document_sections.heading}` : ''}
                  {c.document_sections?.documents?.title ? ` (${c.document_sections.documents.title})` : ''}
                </span>
              ))}
            </div>
          </>
        )}

        {answer.ambiguity_notes && (
          <>
            <div style={sectionLabelStyle}>⚠ Notes</div>
            <p style={{ fontSize: '13px', color: '#92400E', lineHeight: '1.5' }}>
              {answer.ambiguity_notes}
            </p>
          </>
        )}

        {answer.confidence_level && (
          <div style={{ marginTop: '20px' }}>
            <span
              style={{
                fontSize: '12px',
                color: confidenceBadgeColor(answer.confidence_level),
                fontWeight: '600',
              }}
            >
              Confidence: {answer.confidence_level}
            </span>
          </div>
        )}

        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #E5E0D8',
            fontSize: '12px',
            color: '#9CA3AF',
          }}
        >
          Shared from BoardPath ·{' '}
          {new Date(answer.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>

      <div style={footerStyle}>
        This answer is grounded in governing documents uploaded to BoardPath.
        It is not legal advice. Consult qualified legal counsel for complex matters.
        <br />
        <br />
        <strong style={{ color: '#C4A054' }}>BoardPath</strong> · Association Governance Intelligence
      </div>
    </div>
  );
}