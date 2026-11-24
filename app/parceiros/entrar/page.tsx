import PartnerAuthForm from '@/components/PartnerAuthForm';
export const runtime = 'edge';
export const metadata = { title: 'Entrar como parceiro', robots: { index: false, follow: true } };
export default function PartnerLoginPage() { return <PartnerAuthForm />; }
