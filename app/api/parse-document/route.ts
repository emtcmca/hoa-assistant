// app/api/parse-document/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '../../../utils/supabase/server'

interface ParsedSection {
  section_path: string
  section_number: string
  heading: string
  body_text: string
  sequence_index: number
  hierarchy_depth: number
  citation_label: string
  parser_confidence: number
  token_count: number
  page_start: number | null
  page_end: number | null
}

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY
const LLAMA_BASE_URL = 'https://api.cloud.llamaindex.ai/api/parsing'
// ─── OCR quality gate ─────────────────────────────────────────────────────────
function scoreExtractedText(text: string): { score: number; passed: boolean; reasons: string[] } {
  const reasons: string[] = []
  let score = 1.0

  if (text.length < 500) {
    score -= 0.5
    reasons.push('Very short extraction — possible blank or failed OCR')
  }

  const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / Math.max(text.length, 1)
  if (alphaRatio < 0.55) {
    score -= 0.3
    reasons.push(`Low alpha ratio: ${alphaRatio.toFixed(2)} — possible OCR noise`)
  }

  const legalTerms = ['shall', 'association', 'owner', 'property', 'board', 'section', 'article', 'declaration', 'covenant']
  const textLower = text.toLowerCase()
  const termsFound = legalTerms.filter(t => textLower.includes(t)).length
  if (termsFound < 3) {
    score -= 0.3
    reasons.push(`Only ${termsFound} legal terms found — content may not be extracted`)
  }

  const refusalSignals = ["i'm sorry", "i cannot provide", "i can't assist", "i can't provide"]
  if (refusalSignals.some(s => textLower.substring(0, 500).includes(s))) {
    score = 0
    reasons.push('Model refusal detected')
  }

  const words = text.split(/\s+/).slice(0, 200)
  const uniqueWords = new Set(words).size
  const repetitionRatio = uniqueWords / Math.max(words.length, 1)
  if (repetitionRatio < 0.3) {
    score -= 0.2
    reasons.push(`High repetition ratio: ${repetitionRatio.toFixed(2)}`)
  }

  return { score: Math.max(0, score), passed: score >= 0.6, reasons }
}

// ─── Roman numeral → Arabic ───────────────────────────────────────────────────
function romanToArabic(roman: string): number {
  const map: Record<string, number> = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 }
  const s = roman.toUpperCase()
  let result = 0
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] ?? 0
    const nxt = map[s[i+1]] ?? 0
    result += cur < nxt ? -cur : cur
  }
  return result
}

function normalizeArticleNum(raw: string): string {
  const t = raw.trim().toUpperCase()
  if (/^\d+$/.test(t)) return t
  if (/^[IVXLCDM]+$/.test(t)) return String(romanToArabic(t))
  return t
}

// ─── Mistral OCR fallback ─────────────────────────────────────────────────────
async function extractWithMistral(fileBuffer: ArrayBuffer): Promise<string> {
  const base64 = Buffer.from(fileBuffer).toString('base64')

  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${base64}`,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Mistral OCR failed: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const pages = data.pages || []
  return pages.map((p: any) => p.markdown || p.text || '').join('\n\n')
}

// ─── Tiered extraction orchestrator ──────────────────────────────────────────
async function extractTextWithFallback(
  fileBuffer: ArrayBuffer,
  filename: string,
  documentId: string,
  supabase: any
): Promise<{ text: string; source: 'llamaparse' | 'mistral' | 'failed'; score: number }> {

  // Attempt 1: LlamaParse
  try {
    console.log('[OCR] Attempting LlamaParse...')
    const jobId = await uploadToLlamaParse(fileBuffer, filename)
    await pollForCompletion(jobId)
    const markdown = await fetchMarkdownResult(jobId)
    const quality = scoreExtractedText(markdown)

    console.log(`[OCR] LlamaParse score: ${quality.score.toFixed(2)} — ${quality.passed ? 'PASS' : 'FAIL'}`)
    if (quality.reasons.length > 0) console.log('[OCR] LlamaParse signals:', quality.reasons)

    if (quality.passed) {
      return { text: markdown, source: 'llamaparse', score: quality.score }
    }

    await supabase
      .from('documents')
      .update({ ingestion_log: { llamaparse_score: quality.score, llamaparse_reasons: quality.reasons } })
      .eq('id', documentId)

  } catch (err) {
    console.error('[OCR] LlamaParse error:', err)
  }

  // Attempt 2: Mistral OCR
  try {
    console.log('[OCR] LlamaParse did not pass quality gate — falling back to Mistral OCR...')
    const mistralText = await extractWithMistral(fileBuffer)
    const quality = scoreExtractedText(mistralText)

    console.log(`[OCR] Mistral score: ${quality.score.toFixed(2)} — ${quality.passed ? 'PASS' : 'FAIL'}`)
    if (quality.reasons.length > 0) console.log('[OCR] Mistral signals:', quality.reasons)

    if (quality.passed) {
      return { text: mistralText, source: 'mistral', score: quality.score }
    }

  } catch (err) {
    console.error('[OCR] Mistral error:', err)
  }

  // Both failed
  console.error('[OCR] Both LlamaParse and Mistral failed quality gate')
  return { text: '', source: 'failed', score: 0 }
}
async function uploadToLlamaParse(fileBuffer: ArrayBuffer, filename: string): Promise<string> {
  const formData = new FormData()
  const blob = new Blob([fileBuffer], { type: 'application/pdf' })
  formData.append('file', blob, filename)
  formData.append('parsing_instruction',
    'This is a scanned legal document — a Declaration of Covenants, Conditions, and Restrictions (CC&Rs) ' +
    'or similar HOA governing document. This document was legally recorded and is a matter of public record. ' +
    'Your task is optical character recognition and text extraction only. ' +
    'Extract and return ALL text exactly as it appears in the document, page by page. ' +
    'Preserve all article headings, section numbers, section titles, and body text exactly as written. ' +
    'Do not summarize, paraphrase, omit, or refuse any portion of the text. ' +
    'Do not add commentary. Return only the raw extracted text in markdown format.'
  )
  formData.append('language', 'en')
  formData.append('output_tables_as_HTML', 'false')
  formData.append('skip_diagonal_text', 'true')
  formData.append('result_type', 'markdown')
  formData.append('invalidate_cache', 'true')

  const response = await fetch(`${LLAMA_BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}` },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LlamaParse upload failed: ${response.status} — ${errorText}`)
  }

  const data = await response.json()
  return data.id as string
}

async function pollForCompletion(jobId: string): Promise<void> {
  const maxAttempts = 60
  const delayMs = 5000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${LLAMA_BASE_URL}/job/${jobId}`, {
      headers: { 'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}` },
    })

    if (!response.ok) {
      throw new Error(`LlamaParse status check failed: ${response.status}`)
    }

    const data = await response.json()
    const status = data.status as string
    const elapsedSeconds = (attempt + 1) * (delayMs / 1000)
    console.log(`[LlamaParse] Job ${jobId} — attempt ${attempt + 1} — ${elapsedSeconds}s elapsed — status: ${status}`)

    if (status === 'SUCCESS') return
    if (status === 'ERROR') throw new Error(`LlamaParse job failed: ${JSON.stringify(data)}`)

    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  throw new Error('LlamaParse job timed out after 5 minutes')
}

async function fetchMarkdownResult(jobId: string): Promise<string> {
  const response = await fetch(`${LLAMA_BASE_URL}/job/${jobId}/result/markdown`, {
    headers: { 'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}` },
  })

  if (!response.ok) {
    throw new Error(`LlamaParse result fetch failed: ${response.status}`)
  }

  const data = await response.json()
  console.log('[LlamaParse] Raw result keys:', Object.keys(data))
  console.log('[LlamaParse] Pages count:', data.pages?.length ?? 'NO PAGES KEY')
  if (data.pages?.length > 0) {
    console.log('[LlamaParse] First page keys:', Object.keys(data.pages[0]))
    console.log('[LlamaParse] First page sample:', JSON.stringify(data.pages[0]).substring(0, 300))
  } else {
    console.log('[LlamaParse] Full raw response:', JSON.stringify(data).substring(0, 500))
  }

  return data.markdown || ''
}

function splitIntoArticleChunks(markdown: string): { label: string; text: string }[] {
  // Strip code fences
  const cleaned = markdown.replace(/^```[^\n]*\n/gm, '').replace(/^```\s*$/gm, '').replace(/---/g, '')
  if (cleaned.length !== markdown.length) {
    console.log('[Parser] Stripped code fences from markdown')
  }

  // Strip cover page and recording stamp
  const coverPageEndRe = /^(WITNESSETH|THIS DECLARATION|DECLARATION OF|MASTER DECLARATION|IN WITNESS|ARTICLE\s+[IVXLCDM\d]|SECTION\s+1\b)/im
  const allLines = cleaned.split('\n')
  let contentStartLine = 0
  for (let i = 0; i < allLines.length; i++) {
    if (coverPageEndRe.test(allLines[i].trim())) {
      contentStartLine = i
      break
    }
  }
  const contentLines = allLines.slice(contentStartLine)
  console.log(`[Parser] Cover page stripped — starting at line ${contentStartLine}: "${allLines[contentStartLine]?.trim().substring(0, 60)}"`)

  // Try ARTICLE-based chunking first
  const articleRe = /^(?:#{1,4}\s+)?ARTICLE\s+([IVXLCDM\d]+)\b/i
  const chunks: { label: string; text: string }[] = []
  let currentLabel = ''
  let buffer: string[] = []
  let foundFirst = false

  for (const line of contentLines) {
    const match = line.match(articleRe)
    if (match) {
      if (foundFirst && buffer.length > 0) {
        chunks.push({ label: currentLabel, text: buffer.join('\n') })
      }
      foundFirst = true
      currentLabel = `ARTICLE ${normalizeArticleNum(match[1])}`
      buffer = [line]
    } else {
      if (foundFirst) buffer.push(line)
    }
  }
  if (buffer.length > 0 && foundFirst) {
    chunks.push({ label: currentLabel, text: buffer.join('\n') })
  }

  if (chunks.length > 0) {
    console.log(`[Parser] Split into ${chunks.length} article chunks`)
    return chunks
  }

  // No ARTICLE headings found — send the entire document as one chunk
  // GPT-4o-mini has a 128k context window so a typical governing document fits in one call
  // Fixed-size chunking breaks context and causes GPT to miss sections
  console.log('[Parser] No ARTICLE headings — sending full document as single GPT call')
  const fullText = contentLines.join('\n')
  return [{ label: 'FULL DOCUMENT', text: fullText.substring(0, 60000) }]
}

// ─── GPT-4o-mini structured extraction ───────────────────────────────────────
async function extractSectionsFromChunk(
  chunk: { label: string; text: string },
  articleNum: string,
  openaiApiKey: string
): Promise<ParsedSection[]> {
  const prompt = `You are a legal document parser for HOA and condominium governing documents.

I will give you a portion of a legal governing document for an HOA or condominium association. This document may use ARTICLE headings, numbered sections, or plain paragraph numbering — any structure the original drafters chose. Your job is to extract each section as structured JSON.

Rules:
- Extract ONLY substantive sections with real legal content
- SKIP table of contents entries (lines that are just a heading + dots + page number)
- SKIP recording stamps, county recorder headers, deed dates, developer addresses, attorney names, notary blocks, signature lines, exhibit markers, and compliance certificate forms
- SKIP any line that is just a page number or section reference without body text
- Each section must have meaningful body text (at least 1 sentence of legal content), EXCEPT definitions sections which must always be extracted regardless of length
- Definitions sections include any section with a heading containing the words: Definitions, Defined Terms, Glossary, or any section whose content consists primarily of defined terms and their meanings
'- If the document uses numbered paragraphs instead of named sections, treat each numbered paragraph as a section\n' +
- Preserve the full body text of each section exactly as written — do not summarize
- Section numbers should be in the format "X.Y" (e.g., "3.1", "7.13")
- Article number should always be Arabic (e.g., 1, 2, 3 — not I, II, III)

Return ONLY a JSON array. No explanation, no markdown, no code fences. Example format:
[
  {
    "article_num": "3",
    "section_num": "3.1",
    "heading": "Section 3.1 - Utility Easements",
    "body_text": "There is hereby reserved in favor of Developer..."
  }
]

If there are no valid sections in this chunk, return an empty array: []

ARTICLE CHUNK (${chunk.label}):
${chunk.text.substring(0, 12000)}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI extraction failed for ${chunk.label}: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content ?? ''

  let parsed: { article_num: string; section_num: string; heading: string; body_text: string }[]
  try {
    // Strip any accidental markdown fences GPT adds despite instructions
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) throw new Error('Not an array')
  } catch (e) {
    console.warn(`[Parser] Failed to parse GPT JSON for ${chunk.label}:`, raw.substring(0, 200))
    return []
  }

  return parsed
    .filter(s => s.section_num && s.heading && s.body_text && s.body_text.length > 50)
    .map((s, idx): ParsedSection => {
      const artNum = normalizeArticleNum(s.article_num || articleNum)
      const secNum = s.section_num.trim()
      const alphaRatio = (s.body_text.match(/[a-zA-Z]/g) || []).length / s.body_text.length
      let confidence = 1.0
      if (alphaRatio < 0.6) confidence -= 0.2
      if (s.body_text.length < 80) confidence -= 0.2

      return {
        section_path: `art${artNum}-sec${secNum}`,
        section_number: secNum,
        heading: s.heading.trim(),
        body_text: s.body_text.trim(),
        sequence_index: 0, // will be assigned after all chunks merge
        hierarchy_depth: 2,
        citation_label: `Art. ${artNum}, § ${secNum}`,
        parser_confidence: Math.max(0.5, confidence),
        token_count: Math.ceil(s.body_text.length / 4),
        page_start: null,
        page_end: null,
      }
    })
}

// ─── Main entry point (replaces old parseSectionsFromMarkdown) ────────────────
async function parseSectionsFromMarkdown(
  markdown: string,
  documentTitle: string
): Promise<ParsedSection[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY not set')

  const chunks = splitIntoArticleChunks(markdown)
  console.log(`[Parser] Split into ${chunks.length} article chunks`)

  if (chunks.length === 0) {
    console.warn('[Parser] No article chunks found — falling back to full-document section')
    return [{
      section_path: 'full-document',
      section_number: '1',
      heading: documentTitle || 'Full Document',
      body_text: markdown.substring(0, 8000),
      sequence_index: 0,
      hierarchy_depth: 1,
      citation_label: 'Full Document',
      parser_confidence: 0.2,
      token_count: Math.ceil(markdown.length / 4),
      page_start: null,
      page_end: null,
    }]
  }

  // Process chunks sequentially to avoid rate limits
  const allSections: ParsedSection[] = []
  for (const chunk of chunks) {
    const artNumMatch = chunk.label.match(/ARTICLE\s+(\d+)/i)
    const artNum = artNumMatch ? artNumMatch[1] : '0'
    console.log(`[Parser] Extracting ${chunk.label} (${chunk.text.length} chars)...`)
    const sections = await extractSectionsFromChunk(chunk, artNum, openaiApiKey)
    console.log(`[Parser] ${chunk.label}: ${sections.length} sections extracted`)
    allSections.push(...sections)
  }

  // Deduplicate: keep only the first occurrence of each section_number per article
const seen = new Set<string>()
const dedupedSections = allSections.filter(s => {
  const key = s.citation_label
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
dedupedSections.forEach((s, i) => { s.sequence_index = i })

  // Assign final sequential indexes
  allSections.forEach((s, i) => { s.sequence_index = i })

  console.log(`[Parser] Total: ${dedupedSections.length} sections (${allSections.length - dedupedSections.length} duplicates removed) across ${chunks.length} articles`)
return dedupedSections
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log(`[parse-document] Starting parse for: ${document.title} (${documentId})`)

    await supabase
      .from('documents')
      .update({ parse_status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', documentId)

    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.file_storage_key)

    if (fileError || !fileData) {
      await supabase.from('documents').update({ parse_status: 'failed' }).eq('id', documentId)
      return NextResponse.json({ error: 'Could not retrieve PDF from storage' }, { status: 500 })
    }

    const fileBuffer = await fileData.arrayBuffer()
    const filename = document.original_filename || 'document.pdf'

const extraction = await extractTextWithFallback(fileBuffer, filename, documentId, supabase)

    if (extraction.source === 'failed') {
      await supabase
        .from('documents')
        .update({
          parse_status: 'failed',
          ingestion_log: { ocr_failed: true, attempted: ['llamaparse', 'mistral'] },
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
      return NextResponse.json({
        error: 'OCR extraction failed on both LlamaParse and Mistral. Document flagged for review.',
      }, { status: 422 })
    }

    console.log(`[OCR] Extraction complete via ${extraction.source} (score: ${extraction.score.toFixed(2)})`)
    const markdown = extraction.text

    // Store OCR output as separate artifact — never overwrite original
    const ocrPath = `${document.association_id}/ocr_text/${documentId}.md`
    await supabase.storage
      .from('documents')
      .upload(ocrPath, new Blob([markdown], { type: 'text/markdown' }), { upsert: true })

    await supabase.from('documents').update({
      ocr_text_key: ocrPath,
      ocr_source: extraction.source,
      ocr_score: extraction.score,
    }).eq('id', documentId)

    const parsedSections = await parseSectionsFromMarkdown(markdown, document.title)
    const warningCount = parsedSections.filter(s => s.parser_confidence < 0.7).length

    const { error: deleteError } = await supabase
      .from('document_sections')
      .delete()
      .eq('document_id', documentId)

    if (deleteError) {
      console.error('[parse-document] Failed to delete old sections:', deleteError)
      await supabase.from('documents').update({ parse_status: 'failed' }).eq('id', documentId)
      return NextResponse.json({ error: 'Failed to clear old sections' }, { status: 500 })
    }

    const sectionRows = parsedSections.map(s => ({
      association_id: document.association_id,
      document_id: documentId,
      section_path: s.section_path,
      section_number: s.section_number,
      heading: s.heading,
      body_text: s.body_text,
      sequence_index: s.sequence_index,
      hierarchy_depth: s.hierarchy_depth,
      citation_label: s.citation_label,
      parser_confidence: s.parser_confidence,
      token_count: s.token_count,
      page_start: s.page_start,
      page_end: s.page_end,
    }))

    const batchSize = 50
    for (let i = 0; i < sectionRows.length; i += batchSize) {
      const batch = sectionRows.slice(i, i + batchSize)
      const { error: insertError } = await supabase.from('document_sections').insert(batch)
      if (insertError) {
        console.error('[parse-document] Batch insert error:', insertError)
        await supabase.from('documents').update({ parse_status: 'failed' }).eq('id', documentId)
        return NextResponse.json({ error: 'Section insert failed' }, { status: 500 })
      }
      // --- AUTO-EMBEDDINGS: generate and store embeddings for all inserted sections ---
    const { data: insertedSections, error: fetchError } = await supabase
      .from('document_sections')
      .select('id, body_text')
      .eq('document_id', documentId)
      .is('embedding', null)

    if (fetchError) {
      console.error('[parse-document] Failed to fetch sections for embedding:', fetchError)
      // Non-fatal — sections are stored, embeddings can be backfilled later
    } else if (insertedSections && insertedSections.length > 0) {
      const embeddingBatchSize = 20
      const embeddingDelay = 300

      for (let i = 0; i < insertedSections.length; i += embeddingBatchSize) {
        const batch = insertedSections.slice(i, i + embeddingBatchSize)

        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: batch.map(s => s.body_text ?? ''),
          }),
        })

        if (!embeddingResponse.ok) {
          console.error('[parse-document] OpenAI embedding API error:', await embeddingResponse.text())
          // Non-fatal — continue, backfill route handles any misses
          continue
        }

        const embeddingData = await embeddingResponse.json()

        for (let j = 0; j < batch.length; j++) {
          const section = batch[j]
          const vector = embeddingData.data[j]?.embedding

          if (!vector) continue

          const { error: updateError } = await supabase
            .from('document_sections')
            .update({ embedding: vector })
            .eq('id', section.id)

          if (updateError) {
            console.error('[parse-document] Embedding update failed for section:', section.id, updateError)
          }
        }

        if (i + embeddingBatchSize < insertedSections.length) {
          await new Promise(resolve => setTimeout(resolve, embeddingDelay))
        }
      }

      console.log(`[parse-document] Embeddings generated: ${insertedSections.length} sections`)
    }
    // --- END AUTO-EMBEDDINGS ---
    }

    const finalStatus = warningCount > 0 ? 'warning' : 'indexed'
    await supabase
      .from('documents')
      .update({
        parse_status: finalStatus,
        document_status: 'active',
        parser_warning_count: warningCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    console.log(`[parse-document] Complete. ${parsedSections.length} sections, ${warningCount} warnings. Status: ${finalStatus}`)

    return NextResponse.json({
      success: true,
      documentId,
      sectionCount: parsedSections.length,
      warningCount,
      parseStatus: finalStatus,
    })

  } catch (error) {
    console.error('[parse-document] Unhandled error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}