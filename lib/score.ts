import { ScoreWeights } from '@/types';

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  salesWeight: 0.25,
  ratingWeight: 0.15,
  reviewWeight: 0.10,
  popularityWeight: 0.15,
  conversionWeight: 0.15,
  recentTrendWeight: 0.10,
  commissionWeight: 0.10,
};

export interface ProductScoreInput {
  salesCount?: number;
  rating: number;
  reviewCount: number;
  popularityScore: number;
  conversionRate?: number;
  trendScore: number;
  commissionPercentage: number;
}

/**
 * Algoritmo modular para calcular o score unificado do produto (0 a 100).
 * Utilizado para ordenar produtos "Mais Vendidos", "Em Alta" e "Populares".
 */
export function calculateProductScore(
  input: ProductScoreInput,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): number {
  const normalizedSales = Math.min(100, (input.salesCount || 0) / 10);
  const normalizedRating = (input.rating / 5) * 100;
  const normalizedReviews = Math.min(100, Math.log10(input.reviewCount + 1) * 25);
  const normalizedPopularity = Math.min(100, input.popularityScore);
  const normalizedConversion = Math.min(100, (input.conversionRate || 0) * 100);
  const normalizedTrend = Math.min(100, input.trendScore);
  const normalizedCommission = Math.min(100, input.commissionPercentage * 5);

  const score =
    normalizedSales * weights.salesWeight +
    normalizedRating * weights.ratingWeight +
    normalizedReviews * weights.reviewWeight +
    normalizedPopularity * weights.popularityWeight +
    normalizedConversion * weights.conversionWeight +
    normalizedTrend * weights.recentTrendWeight +
    normalizedCommission * weights.commissionWeight;

  return Math.round(score * 100) / 100;
}
