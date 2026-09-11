export type ProductQualityInput = {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  affiliate_url?: string | null;
  price?: number | string | null;
  status?: string | null;
};

export function validateProductQuality(product: ProductQualityInput) {
  const errors: string[] = [];
  if (!product.name || product.name.trim().length < 8) errors.push('nome muito curto');
  if (!product.description || product.description.trim().length < 30) errors.push('descrição insuficiente');
  if (!product.image_url || !/^https:\/\//i.test(product.image_url)) errors.push('imagem pública inválida');
  if (!product.affiliate_url || !/^https:\/\//i.test(product.affiliate_url)) errors.push('link afiliado inválido');
  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) errors.push('preço inválido');
  if (product.status && product.status !== 'ACTIVE') errors.push('produto inativo');
  return { valid: errors.length === 0, errors };
}
