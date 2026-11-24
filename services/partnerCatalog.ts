import { getSupabase } from '@/lib/supabase';
import { PartnerProduct } from '@/lib/partner';

export type PublicPartnerProduct = Omit<PartnerProduct, 'review_note'> & {
  seller: { store_name: string; legal_name: string; email: string; phone: string; business_address: string };
};
const fields = 'id,partner_id,name,description,image_url,price_cents,stock,delivery_days,return_policy,status,created_at,updated_at,seller:partners!inner(store_name,legal_name,email,phone,business_address)';

export async function getPartnerCatalog(id?: string) {
  let query = getSupabase().from('partner_products').select(fields)
    .eq('status', 'ACTIVE').eq('seller.status', 'ACTIVE').order('created_at', { ascending: false });
  if (id) query = query.eq('id', id);
  const { data, error } = await query.limit(100).returns<PublicPartnerProduct[]>();
  if (error) throw error;
  return data || [];
}
