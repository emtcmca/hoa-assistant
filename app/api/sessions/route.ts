import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/sessions?association_id=xxx
// Returns all sessions for an association, newest first
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const association_id = searchParams.get('association_id');

  if (!association_id) {
    return NextResponse.json({ error: 'association_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('meeting_sessions')
    .select('id, title, session_date, status, created_at')
    .eq('association_id', association_id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}

// POST /api/sessions
// Body: { association_id, title, user_id? }
// Creates a new active session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { association_id, title, user_id } = body;

  if (!association_id || !title) {
    return NextResponse.json({ error: 'association_id and title required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('meeting_sessions')
    .insert({
      association_id,
      title: title.trim(),
      session_date: new Date().toISOString().split('T')[0],
      status: 'active',
      created_by_user_id: user_id || null,
    })
    .select('id, title, session_date, status, created_at')
    .single();

  if (error) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}

// PATCH /api/sessions
// Body: { session_id }
// Closes an active session
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('meeting_sessions')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', session_id)
    .select('id, title, status')
    .single();

  if (error) {
    console.error('PATCH /api/sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}