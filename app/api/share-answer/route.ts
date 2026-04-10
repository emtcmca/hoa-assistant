import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://erufxxxmabwllqqndbkc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answerId } = body;

    if (!answerId) {
      return NextResponse.json({ error: 'answerId required' }, { status: 400 });
    }

    // Check if share already exists for this answer
    const { data: existing, error: existingError } = await supabase
      .from('shared_answers')
      .select('token')
      .eq('answer_id', answerId);

    if (existingError) {
      console.error('Existing share lookup error:', existingError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ token: existing[0].token });
    }

    // Create new share
    const { data: inserted, error: insertError } = await supabase
      .from('shared_answers')
      .insert({ answer_id: answerId })
      .select('token');

    if (insertError) {
      console.error('Share insert error:', insertError);
      return NextResponse.json({ error: 'Could not create share' }, { status: 500 });
    }

    if (!inserted || inserted.length === 0) {
      return NextResponse.json({ error: 'No token returned' }, { status: 500 });
    }

    return NextResponse.json({ token: inserted[0].token });

  } catch (err) {
    console.error('Share route error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}