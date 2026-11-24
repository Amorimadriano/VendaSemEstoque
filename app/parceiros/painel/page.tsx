import PartnerDashboard from '@/components/PartnerDashboard';
export const runtime = 'edge';
export const metadata = { title: 'Painel do parceiro', robots: { index: false, follow: false } };
export default function PartnerDashboardPage() { return <PartnerDashboard />; }
