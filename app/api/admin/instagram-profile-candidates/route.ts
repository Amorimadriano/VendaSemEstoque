import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { getSupabase } from '@/lib/supabase';
import { isInstagramProfileStatus, normalizeInstagramProfile } from '@/lib/instagramProfileCandidate';

export const runtime = 'edge';

const CANDIDATE_FIELDS = 'id,username,profile_url,notes,status,created_at,updated_at';

async function isAdmin(request: NextRequest) {
  try {
    return Boolean(await verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value));
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return unauthorized();

  try {
    const { data, error } = await getSupabase()
      .from('instagram_profile_candidates')
      .select(CANDIDATE_FIELDS)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ candidates: data || [] });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os perfis.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) return unauthorized();

  const body = await request.json().catch(() => null) as { profile?: unknown; notes?: unknown } | null;
  if (typeof body?.profile !== 'string') {
    return NextResponse.json({ error: 'Informe um usuário ou URL de perfil do Instagram.' }, { status: 400 });
  }

  const profile = normalizeInstagramProfile(body.profile);
  if (!profile) {
    return NextResponse.json({ error: 'Informe um @ válido ou uma URL direta de perfil do Instagram.' }, { status: 400 });
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 500) return NextResponse.json({ error: 'As notas podem ter no máximo 500 caracteres.' }, { status: 400 });

  const { data, error } = await getSupabase()
    .from('instagram_profile_candidates')
    .insert({ id: crypto.randomUUID(), username: profile.username, profile_url: profile.profileUrl, notes: notes || null })
    .select(CANDIDATE_FIELDS)
    .single();

  if (error?.code === '23505') return NextResponse.json({ error: 'Esse perfil já está na lista.' }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível salvar o perfil.' }, { status: 500 });
  return NextResponse.json({ candidate: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) return unauthorized();

  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null;
  if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || !isInstagramProfileStatus(body.status)) {
    return NextResponse.json({ error: 'Atualização inválida.' }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from('instagram_profile_candidates')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .select(CANDIDATE_FIELDS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Não foi possível atualizar o perfil.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
  return NextResponse.json({ candidate: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) return unauthorized();

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from('instagram_profile_candidates')
    .delete()
    .eq('id', body.id);

  if (error) return NextResponse.json({ error: 'Não foi possível remover o perfil.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}