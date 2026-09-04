import prisma from '@/lib/prisma';
import { AffiliateClickData } from '@/types';

export async function registerClickAndGetAffiliateUrl(data: AffiliateClickData): Promise<string> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        marketplace: true,
        affiliateLinks: true,
      },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    const click = await prisma.click.create({
      data: {
        productId: data.productId,
        affiliateLinkId: data.affiliateLinkId || product.affiliateLinks[0]?.id,
        sessionId: data.sessionId || `sess_${Math.random().toString(36).substring(2, 11)}`,
        userId: data.userId,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        device: data.device || 'desktop',
        ipHash: data.ipHash,
      },
    });

    await prisma.productMetric.upsert({
      where: { productId: data.productId },
      update: {
        totalClicks: { increment: 1 },
      },
      create: {
        productId: data.productId,
        totalClicks: 1,
        totalConversions: 0,
      },
    });

    const affiliateUrl = new URL(product.affiliateUrl);
    affiliateUrl.searchParams.set('subid_click', click.id);

    return affiliateUrl.toString();
  } catch (error) {
    console.warn('Prisma tracking failed, returning fallback affiliate link:', error);
    throw error;
  }
}

export async function registerConversion(
  clickId: string | null,
  productId: string,
  marketplaceId: string,
  orderExternalId: string,
  saleValue: number,
  commissionValue: number
) {
  const conversion = await prisma.conversion.create({
    data: {
      clickId: clickId || undefined,
      productId,
      marketplaceId,
      orderExternalId,
      saleValue,
      commissionValue,
      status: 'PENDING',
    },
  });

  await prisma.commission.create({
    data: {
      conversionId: conversion.id,
      amount: commissionValue,
      status: 'PENDING',
    },
  });

  // Atualizar métricas do produto
  const metric = await prisma.productMetric.findUnique({ where: { productId } });
  const totalClicks = metric?.totalClicks || 1;
  const newConversions = (metric?.totalConversions || 0) + 1;
  const newRate = totalClicks > 0 ? newConversions / totalClicks : 0;

  await prisma.productMetric.upsert({
    where: { productId },
    update: {
      totalConversions: newConversions,
      conversionRate: newRate,
      totalCommission: { increment: commissionValue },
    },
    create: {
      productId,
      totalClicks: 1,
      totalConversions: 1,
      conversionRate: 1.0,
      totalCommission: commissionValue,
    },
  });

  return conversion;
}
