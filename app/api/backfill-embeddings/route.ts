import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 20;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  console.log('Backfill started...');

  const { data: sections, error } = await supabase
    .from('document_sections')
    .select('id, heading, body_text, citation_label')
    .is('embedding', null)
    .order('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sections || sections.length === 0) {
    return NextResponse.json({ message: 'No sections need embeddings.' });
  }

  console.log(`Found ${sections.length} sections to embed...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE);

    const inputs = batch.map(s => {
      const label = s.citation_label ? `${s.citation_label}: ` : '';
      const heading = s.heading ? `${s.heading}. ` : '';
      return `${label}${heading}${s.body_text ?? ''}`.slice(0, 8000);
    });

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: inputs,
      });

      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('document_sections')
          .update({ embedding: response.data[j].embedding })
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`Failed section ${batch[j].id}:`, updateError.message);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} done — ${successCount} succeeded so far`);

    } catch (err) {
      console.error(`Batch error:`, err);
      errorCount += batch.length;
    }

    await sleep(300);
  }

  return NextResponse.json({
    message: 'Backfill complete',
    successCount,
    errorCount,
    total: sections.length,
  });
}