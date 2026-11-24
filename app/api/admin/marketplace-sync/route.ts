import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { runProductDiscovery } from '@/services/productDiscovery';

export const runtime = 'edge';

export async function GET() {
  const { data, error } = await getSupabase().from('marketplace_sync_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST() {
  try {
    return NextResponse.json(await runProductDiscovery());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha na sincronização.' }, { status: 500 });
  }
}
