import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

function getWeekStart() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start.toISOString();
}

export async function GET() {
  const { data, error } = await getSupabase()
    .from('marketing_content')
    .select('content_type')
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED')
    .gte('published_at', getWeekStart());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const published = data || [];
  return NextResponse.json({
    weekStart: getWeekStart(),
    tasks: {
      posts: { completed: published.filter((item) => item.content_type === 'POST' || item.content_type === 'CAROUSEL').length, target: 3, mode: 'automatic' },
      reels: { completed: published.filter((item) => item.content_type === 'REEL').length, target: 3, mode: 'manual' },
      stories: { completed: published.filter((item) => item.content_type === 'STORY').length, target: 7, mode: 'manual' },
      comments: { completed: 0, target: 1, mode: 'manual' },
    },
  });
}