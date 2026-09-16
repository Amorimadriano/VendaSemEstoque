import { MetadataRoute } from 'next';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';
export const revalidate = 3600; // 1 hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');
  const now = new Date();

  // Rotas estáticas fundamentais
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/em-alta`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mais-vendidos`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ofertas`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/produtos`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/links`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    const supabase = getSupabase();

    // Produtos ativos
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('status', 'ACTIVE')
      .limit(1000);

    const productRoutes: MetadataRoute.Sitemap = (products || []).map((p) => ({
      url: `${baseUrl}/produto/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    // Categorias
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .limit(100);

    const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((c) => ({
      url: `${baseUrl}/produtos?category=${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    console.error('[Sitemap] Erro ao carregar rotas dinâmicas:', error);
    return staticRoutes;
  }
}
