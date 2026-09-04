import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = getSupabase();
    const [{ count: totalProducts }, { count: activeProducts }, { count: trendingProducts }, { count: bestSellerProducts }, { count: totalClicks }, conversionsResult, commissionsResult, productsResult, marketplacesResult] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_trending', true),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_best_seller', true),
      supabase.from('clicks').select('*', { count: 'exact', head: true }),
      supabase.from('conversions').select('sale_value'),
      supabase.from('commissions').select('amount,status'),
      supabase.from('products').select('*, marketplace:marketplaces(*), metrics:product_metrics(*)').order('popularity_score', { ascending: false }).limit(10),
      supabase.from('marketplaces').select('*').order('name'),
    ]);

    if (conversionsResult.error) throw conversionsResult.error;
    if (commissionsResult.error) throw commissionsResult.error;
    if (productsResult.error) throw productsResult.error;
    if (marketplacesResult.error) throw marketplacesResult.error;

    const conversions = conversionsResult.data || [];
    const commissions = commissionsResult.data || [];
    const topProducts = productsResult.data || [];
    const marketplaces = marketplacesResult.data || [];

    const totalConversions = conversions.length;
    const clickCount = totalClicks || 0;
    const conversionRate = clickCount > 0 ? (totalConversions / clickCount) * 100 : 0;

    const pendingCommission = commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amount, 0);

    const approvedCommission = commissions
      .filter((c) => c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.amount, 0);

    const paidCommission = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalEstimatedCommission = pendingCommission + approvedCommission + paidCommission;

    const totalSaleValue = conversions.reduce((sum, c) => sum + Number(c.sale_value || 0), 0);

    return NextResponse.json({
      summary: {
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        trendingProducts: trendingProducts || 0,
        bestSellerProducts: bestSellerProducts || 0,
        totalClicks: totalClicks || 0,
        totalConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalSaleValue,
        commissions: {
          total: Math.round(totalEstimatedCommission * 100) / 100,
          pending: Math.round(pendingCommission * 100) / 100,
          approved: Math.round(approvedCommission * 100) / 100,
          paid: Math.round(paidCommission * 100) / 100,
        },
      },
      topProducts,
      marketplaces,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar métricas' }, { status: 500 });
  }
}
