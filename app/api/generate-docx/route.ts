import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  AlignmentType, BorderStyle,
} from 'docx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { association_id, draft_type, subject, body: letterBody, signer, owner } = body

    if (!association_id || !letterBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch letterhead
    let letterheadImageBuffer: Buffer | null = null
    let imageType: 'png' | 'jpg' = 'png'

    const assocRes = await supabase
      .from('associations')
      .select('letterhead_storage_key')
      .eq('id', association_id)
    const storageKey = assocRes.data?.[0]?.letterhead_storage_key

    if (storageKey) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('letterheads')
        .download(storageKey)
      if (!fileError && fileData) {
        const arrayBuffer = await fileData.arrayBuffer()
        letterheadImageBuffer = Buffer.from(arrayBuffer)
        const ext = storageKey.split('.').pop()?.toLowerCase() ?? 'png'
        imageType = (ext === 'jpg' || ext === 'jpeg') ? 'jpg' : 'png'
      }
    }

    const docChildren: Paragraph[] = []

    // Letterhead image
    if (letterheadImageBuffer) {
      docChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: letterheadImageBuffer,
              transformation: { width: 600, height: 120 },
              type: imageType,
            }),
          ],
          spacing: { after: 200 },
        })
      )
    } else if (signer?.associationName) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: signer.associationName, bold: true, size: 28, color: '1A2535' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      )
      if (signer?.associationAddress) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: signer.associationAddress.replace('\n', ' | '), size: 18, color: '666666' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        )
      }
    }

    // Divider
    docChildren.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C4A054' } },
        spacing: { after: 280 },
        children: [],
      })
    )

    // Date
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: today, size: 20, color: '444444' })],
        spacing: { after: 240 },
      })
    )

    // Owner address block (structured — not from GPT)
    if (owner?.full_name) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: owner.full_name, size: 20, bold: true })],
          spacing: { after: 40 },
        })
      )
      if (owner.unit) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `Unit ${owner.unit}`, size: 20 })],
            spacing: { after: 40 },
          })
        )
      }
      if (owner.mailing_address) {
        const addressLine = [owner.mailing_address, owner.city, owner.state, owner.zip]
          .filter(Boolean).join(', ')
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: addressLine, size: 20 })],
            spacing: { after: 40 },
          })
        )
      }
      if (owner.email) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: owner.email, size: 20, color: '444444' })],
            spacing: { after: 40 },
          })
        )
      }
      docChildren.push(new Paragraph({ children: [], spacing: { after: 200 } }))
    }

    // Subject line
    if (subject) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'RE: ', bold: true, size: 20 }),
            new TextRun({ text: subject.replace(/^RE:\s*/i, ''), bold: true, size: 20 }),
          ],
          spacing: { after: 240 },
        })
      )
    }

    // GPT body — salutation + body paragraphs + "Sincerely,"
    const bodyParagraphs = letterBody.split(/\n\n+/)
    bodyParagraphs.forEach((para: string) => {
      const trimmed = para.trim()
      if (!trimmed) return

      const isHeading = /^(NOTICE OF VIOLATION|NOTICE FROM|MOTION:|AUTHORITY:|WHEREAS|RESOLVED)/.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && trimmed.length > 3)

      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 20, bold: isHeading })],
          spacing: { after: isHeading ? 160 : 200 },
          alignment: isHeading ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        })
      )
    })

    // Signer block (structured — not from GPT)
    // Space after "Sincerely,"
    docChildren.push(new Paragraph({ children: [], spacing: { after: 480 } }))

    if (signer?.signerName) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: signer.signerName, bold: true, size: 20 })],
          spacing: { after: 40 },
        })
      )
    }
    if (signer?.signerTitle) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: signer.signerTitle, size: 20, color: '444444' })],
          spacing: { after: 40 },
        })
      )
    }
    if (signer?.associationName) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: signer.associationName, size: 20, color: '444444' })],
          spacing: { after: 40 },
        })
      )
    }
    if (signer?.associationPhone || signer?.associationEmail) {
      const contact = [signer.associationPhone, signer.associationEmail].filter(Boolean).join('  |  ')
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: contact, size: 18, color: '666666' })],
          spacing: { after: 0 },
        })
      )
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } },
        },
        children: docChildren,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const safeSubject = (subject ?? draft_type ?? 'letter')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    const filename = `boardpath-${safeSubject}.docx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('generate-docx error:', err)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
