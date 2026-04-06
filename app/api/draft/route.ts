import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DRAFT_PROMPTS: Record<string, string> = {
  owner_response: `You are a professional HOA/condominium association manager drafting a formal written response to an owner inquiry. 
Write a clear, professional letter that:
- Opens with a professional salutation (use "Dear Owner," if no name is provided)
- States the board's or association's position based ONLY on the governing documents cited
- References the specific document sections provided as authority
- Uses firm but respectful tone
- Closes professionally with a signature block placeholder
- Never invents authority not present in the citations
- Flags any ambiguity from the source answer with appropriate hedging language`,

  violation_notice: `You are a professional HOA/condominium association manager drafting a formal violation notice.
Write a clear, professional notice that:
- Opens with a formal heading: NOTICE OF VIOLATION
- Identifies the nature of the violation based on the governing documents cited
- References the specific document sections that establish the rule or requirement
- States what corrective action is required and implies a reasonable timeframe
- Uses firm, professional, non-threatening language
- Closes with contact information placeholder
- Never invents authority not present in the citations
- Flags any ambiguity from the source answer`,

  board_notice: `You are a professional HOA/condominium association manager drafting a formal board notice to all residents.
Write a clear, professional notice that:
- Opens with a formal heading: NOTICE FROM THE BOARD OF DIRECTORS
- States the board's position or decision based on the governing documents cited
- References the specific document sections that support the board's authority or position
- Uses clear, accessible language appropriate for a general owner audience
- Closes with a board signature block placeholder
- Never invents authority not present in the citations`,

  motion_language: `You are drafting formal motion language for an HOA/condominium board meeting.
Write motion language that:
- Opens with: "MOTION:"
- States the motion in precise, actionable terms grounded in the governing document authority cited
- Follows with: "AUTHORITY:" and lists the specific document sections that authorize this action
- Follows with: "WHEREAS" recitals if appropriate based on the context
- Uses formal parliamentary language appropriate for board minutes
- Never invents authority not present in the citations
- Flags if the cited documents suggest the board may lack clear authority for the proposed action`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { draft_type, question, answer, citations } = body

    if (!draft_type || !question || !answer || !citations) {
      return NextResponse.json(
        { error: 'Missing required fields: draft_type, question, answer, citations' },
        { status: 400 }
      )
    }

    const systemPrompt = DRAFT_PROMPTS[draft_type]
    if (!systemPrompt) {
      return NextResponse.json(
        { error: `Unknown draft_type: ${draft_type}` },
        { status: 400 }
      )
    }

    // Build a clean citation block for the prompt
    const citationBlock = citations
      .map((c: { citation_label: string; heading: string; excerpt?: string }) =>
        `${c.citation_label}${c.heading ? ` — ${c.heading}` : ''}${c.excerpt ? `\n"${c.excerpt}"` : ''}`
      )
      .join('\n\n')

    const userPrompt = `ORIGINAL QUESTION:
${question}

GOVERNING DOCUMENT ANSWER:
${answer.direct_answer}

PLAIN ENGLISH EXPLANATION:
${answer.plain_english}

CONFIDENCE LEVEL: ${answer.confidence_level || 'medium'}
${answer.has_conflict ? `\nDOCUMENT CONFLICT NOTE: ${answer.conflict_note}` : ''}
${answer.counsel_recommended ? '\nNOTE: Legal counsel review has been recommended for this matter.' : ''}

CITED GOVERNING DOCUMENT SECTIONS:
${citationBlock}

Draft the appropriate document now. Do not add any preamble or explanation — output only the letter/notice/motion itself.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    const draftBody = completion.choices[0]?.message?.content?.trim() || ''

    // Generate a subject line — useful for email context later
    const subjectMap: Record<string, string> = {
      owner_response: `RE: Your Inquiry — ${question.slice(0, 60)}${question.length > 60 ? '...' : ''}`,
      violation_notice: `Notice of Violation`,
      board_notice: `Notice from the Board of Directors`,
      motion_language: `Proposed Motion — ${question.slice(0, 50)}${question.length > 50 ? '...' : ''}`
    }

    return NextResponse.json({
      draft_type,
      subject: subjectMap[draft_type] || 'Board Communication',
      body: draftBody,
      grounded_in: citations.map((c: { citation_label: string }) => c.citation_label)
    })

  } catch (err) {
    console.error('[/api/draft] Error:', err)
    return NextResponse.json(
      { error: 'Draft generation failed' },
      { status: 500 }
    )
  }
}