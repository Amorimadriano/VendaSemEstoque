import PartnerPurchaseStatus from '@/components/PartnerPurchaseStatus';
export const runtime = 'edge';
export const metadata = { title: 'Acompanhamento da compra', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default function PartnerPurchasePage() { return <PartnerPurchaseStatus />; }
