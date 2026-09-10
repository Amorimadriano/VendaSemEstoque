import { getMarketplaceIntegration } from '../integrations';
import { getSupabase } from '../lib/supabase';

async function syncAmazonProducts() {
  console.log('🔍 Sincronizando produtos curados da Amazon...\n');
  
  const amazon = getMarketplaceIntegration('amazon');
  const supabase = getSupabase();
  
  try {
    // Busca todos os 4 produtos curados
    const products = await amazon.getProducts('', undefined, 10);
    console.log(`✅ Obtidos ${products.length} produtos da Amazon\n`);
    
    // Prepara marketplace Amazon no banco
    const now = new Date().toISOString();
    const { data: existingMarketplace } = await supabase
      .from('marketplaces')
      .select('id')
      .eq('slug', 'amazon')
      .maybeSingle();
    
    const { data: marketplace, error: mktErr } = await supabase
      .from('marketplaces')
      .upsert(
        {
          id: existingMarketplace?.id || crypto.randomUUID(),
          name: 'Amazon',
          slug: 'amazon',
          affiliate_status: 'ACTIVE',
          api_status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();
    
    if (mktErr) throw mktErr;
    console.log(`✅ Marketplace Amazon preparado (ID: ${marketplace.id})\n`);
    
    // Sincroniza cada produto
    let syncedCount = 0;
    for (const product of products) {
      try {
        // Infere categoria
        const categoryName = product.categoryName || 'Eletrônicos';
        const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const { data: category, error: catErr } = await supabase
          .from('categories')
          .upsert(
            {
              id: crypto.randomUUID(),
              name: categoryName,
              slug: categorySlug,
              created_at: now,
              updated_at: now,
            },
            { onConflict: 'slug' }
          )
          .select('id')
          .single();
        
        if (catErr) throw catErr;
        
        // Cria slug único do produto
        const productSlug = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100)}-${product.externalProductId}`.slice(0, 190);
        
        // Verifica se produto já existe
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('marketplace_id', marketplace.id)
          .eq('external_product_id', product.externalProductId)
          .maybeSingle();
        
        const productData = {
          id: existingProduct?.id || crypto.randomUUID(),
          name: product.name,
          description: product.description || product.name,
          category_id: category.id,
          marketplace_id: marketplace.id,
          brand: product.brand || null,
          image_url: product.imageUrl,
          images: JSON.stringify(product.images || [product.imageUrl]),
          price: product.price,
          old_price: product.oldPrice || null,
          discount_percentage: product.discountPercentage || null,
          rating: product.rating || 4.5,
          review_count: product.reviewCount || 0,
          sales_count: product.salesCount || 0,
          popularity_score: Math.round((product.rating || 4.5) * 10),
          trend_score: Math.round((product.rating || 4.5) * 8),
          commission_percentage: product.commissionPercentage || 8,
          commission_value: (product.price * (product.commissionPercentage || 8)) / 100,
          external_product_id: product.externalProductId,
          original_url: product.originalUrl,
          affiliate_url: product.affiliateUrl,
          slug: productSlug,
          status: 'ACTIVE',
          is_best_seller: (product.salesCount || 0) >= 500,
          is_trending: (product.rating || 4.5) >= 4.5,
          last_synced_at: now,
          updated_at: now,
          ...(existingProduct ? {} : { created_at: now }),
        };
        
        const { data: savedProduct, error: prodErr } = await supabase
          .from('products')
          .upsert(productData, { onConflict: 'marketplace_id,external_product_id' })
          .select('id')
          .single();
        
        if (prodErr) throw prodErr;
        
        // Log de preço
        await supabase.from('price_history').insert({
          id: crypto.randomUUID(),
          product_id: savedProduct.id,
          price: product.price,
          old_price: product.oldPrice || null,
        });
        
        // Métricas do produto
        await supabase.from('product_metrics').upsert(
          { id: crypto.randomUUID(), product_id: savedProduct.id, updated_at: now },
          { onConflict: 'product_id' }
        );
        
        console.log(`✅ Sincronizado: ${product.name}`);
        console.log(`   Preço: R$ ${product.price} | Rating: ${product.rating}★\n`);
        syncedCount++;
      } catch (err) {
        console.error(`❌ Erro ao sincronizar ${product.name}:`, err);
      }
    }
    
    console.log(`\n🎉 Sincronização concluída!`);
    console.log(`📊 Produtos importados: ${syncedCount}/${products.length}`);
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    process.exit(1);
  }
}

syncAmazonProducts();
