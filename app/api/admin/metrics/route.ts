import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMockMetrics } from '@/services/mockData';

export const runtime = 'edge';

export async function GET() {
  try {
    const [
      totalProducts,
      activeProducts,
      trendingProducts,
      bestSellerProducts,
      totalClicks,
      conversions,
      commissions,
      topProducts,
      marketplaces,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { isTrending: true } }),
      prisma.product.count({ where: { isBestSeller: true } }),
      prisma.click.count(),
      prisma.conversion.findMany(),
      prisma.commission.findMany(),
      prisma.product.findMany({
        take: 10,
        orderBy: { popularityScore: 'desc' },
        include: { marketplace: true, metrics: true },
      }),
      prisma.marketplace.findMany({
        include: {
          _count: { select: { products: true, conversions: true } },
        },
      }),
    ]);

    const totalConversions = conversions.length;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

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

    const totalSaleValue = conversions.reduce((sum, c) => sum + c.saleValue, 0);

    return NextResponse.json({
      summary: {
        totalProducts,
        activeProducts,
        trendingProducts,
        bestSellerProducts,
        totalClicks,
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
    console.warn('Prisma query failed in metrics route, returning mock metrics:', error);
    return NextResponse.json(getMockMetrics());
  }
}
