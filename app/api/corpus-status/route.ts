import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_TYPES = [
  { type: 'declaration', label: 'Declaration / CC&Rs', weight: 'core' },
  { type: 'bylaws', label: 'Bylaws', weight: 'core' },
  { type: 'rules', label: 'Rules & Regulations', weight: 'supplemental' },
  { type: 'articles', label: 'Articles of Incorporation', weight: 'supplemental' },
  { type: 'policy', label: 'Policies & Resolutions', weight: 'supplemental' },
];

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(request.url);
  const associationId = searchParams.get('association_id');

  if (!associationId) {
    return NextResponse.json({ error: 'association_id required' }, { status: 400 });
  }

  const { data: docs, error } = await supabase
    .from('documents')
    .select('document_type')
    .eq('association_id', associationId)
    .eq('document_status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const presentTypes = new Set((docs || []).map((d: any) => d.document_type));

  const breakdown = EXPECTED_TYPES.map(({ type, label, weight }) => ({
    type,
    label,
    weight,
    present: presentTypes.has(type),
  }));

  const corePresent = breakdown
    .filter(b => b.weight === 'core')
    .every(b => b.present);

  const anyPresent = breakdown.some(b => b.present);

  let status: 'core_complete' | 'critical_gap' | 'empty';
  let statusLabel: string;

  if (!anyPresent) {
    status = 'empty';
    statusLabel = 'No documents uploaded';
  } else if (!corePresent) {
    status = 'critical_gap';
    statusLabel = 'Critical documents missing';
  } else {
    status = 'core_complete';
    statusLabel = 'Core documents present';
  }

  return NextResponse.json({ status, statusLabel, breakdown });
}