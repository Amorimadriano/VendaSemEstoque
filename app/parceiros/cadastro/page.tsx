import PartnerAuthForm from '@/components/PartnerAuthForm';
export const runtime = 'edge';
export const metadata = { title: 'Cadastre sua loja', robots: { index: false, follow: true } };
export default function RegisterPartnerPage() { return <PartnerAuthForm register />; }
