import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../utils/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { documentId } = await request.json();

  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: sections, error: fetchError } = await supabase
    .from('document_sections')
    .select('id, heading, body_text, citation_label')
    .eq('document_id', documentId)
    .is('embedding', null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!sections || sections.length === 0) {
    return NextResponse.json({ message: 'No sections need embeddings', count: 0 });
  }

  let processed = 0;
  let failed = 0;

  const batchSize = 20;
  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize);

    const texts = batch.map((section: { id: string; heading: string | null; body_text: string | null; citation_label: string | null }) =>
      [section.citation_label, section.heading, section.body_text]
        .filter(Boolean)
        .join(' ')
        .slice(0, 8000)
    );

    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      for (let j = 0; j < batch.length; j++) {
        const embedding = embeddingResponse.data[j].embedding;
        await supabase
          .from('document_sections')
          .update({ embedding })
          .eq('id', batch[j].id);
        processed++;
      }
    } catch (err) {
      console.error('Embedding batch failed:', err);
      failed += batch.length;
    }
  }

  return NextResponse.json({
    message: 'Embeddings generated',
    processed,
    failed,
    total: sections.length,
  });
}