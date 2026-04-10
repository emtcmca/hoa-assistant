// scripts/backfill-embeddings.ts
//
// One-time backfill script — generates embeddings for all document_sections
// that currently have no embedding.
// Run from project root: npx ts-node --skip-project scripts/backfill-embeddings.ts

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  'https://erufxxxmabwllqqndbkc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydWZ4eHhtYWJ3bGxxcW5kYmtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDg1MSwiZXhwIjoyMDkwNzkwODUxfQ.NVzWsJrK0u2g_FlA6dc062TNcKRyNGxrb8BFfCg15Jo'
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BATCH_SIZE = 20;
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching sections without embeddings...');

  const { data: sections, error } = await supabase
    .from('document_sections')
    .select('id, heading, body_text, citation_label')
    .is('embedding', null)
    .order('id');

  if (error) {
    console.error('Failed to fetch sections:', error);
    process.exit(1);
  }

  if (!sections || sections.length === 0) {
    console.log('No sections need embeddings. Done.');
    return;
  }

  console.log(`Found ${sections.length} sections to embed. Processing in batches of ${BATCH_SIZE}...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(sections.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches} — embedding ${batch.length} sections...`);

    // Generate embeddings for the batch
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

      // Write embeddings back to Supabase one at a time
      for (let j = 0; j < batch.length; j++) {
        const section = batch[j];
        const embedding = response.data[j].embedding;

        const { error: updateError } = await supabase
          .from('document_sections')
          .update({ embedding })
          .eq('id', section.id);

        if (updateError) {
          console.error(`  ✗ Failed to update section ${section.id}:`, updateError.message);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log(`  ✓ Batch ${batchNum} complete. Total: ${successCount} succeeded, ${errorCount} failed.`);

    } catch (embeddingError) {
      console.error(`  ✗ Embedding API error on batch ${batchNum}:`, embeddingError);
      errorCount += batch.length;
    }

    // Rate limit protection between batches
    if (i + BATCH_SIZE < sections.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nBackfill complete. ${successCount} sections embedded, ${errorCount} errors.`);
}

main();