import Link from 'next/link';
import { Store, ShieldCheck, Wallet, Megaphone } from 'lucide-react';
import { partnerPaymentConfig } from '@/lib/partner';

export const runtime = 'edge';
export const metadata = { title: 'Venda no nosso site | Programa de parceiros', description: 'Cadastre sua loja, envie produtos para aprovação e venda com comissão transparente por venda confirmada.' };

export default function PartnersPage() {
  const config = partnerPaymentConfig();
  return <div className="space-y-12">
    <section className="rounded-3xl bg-gradient-to-br from-blue-950 to-indigo-800 p-8 md:p-16 text-white">
      <p className="font-semibold text-blue-200 mb-4">PROGRAMA DE VENDEDORES PARCEIROS</p>
      <h1 className="text-4xl md:text-5xl font-bold max-w-3xl">Sua loja vende. Nós ajudamos seus produtos a serem encontrados.</h1>
      <p className="text-lg text-blue-100 my-6 max-w-2xl">Cadastre-se gratuitamente, envie seus produtos e acompanhe os pedidos. Sem mensalidade de cadastro: a plataforma recebe uma comissão sobre vendas confirmadas.</p>
      <div className="flex flex-wrap gap-4">
        <Link href="/parceiros/cadastro" className="rounded-xl bg-white text-blue-900 px-6 py-3 font-bold">Quero ser parceiro</Link>
        <Link href="/parceiros/entrar" className="rounded-xl border border-blue-300 px-6 py-3 font-semibold">Já sou parceiro</Link>
      </div>
      <p className="mt-6 text-sm text-blue-100">{config.commissionBps ? `Comissão da plataforma: ${config.commissionBps / 100}% por venda, apresentada para aceite antes da ativação.` : 'O percentual será informado para seu aceite antes da ativação das vendas.'} Tarifas do Mercado Pago são cobradas separadamente pelo provedor.</p>
      {(!config.enabled || !config.configured) && <p className="mt-4 rounded-lg bg-white/10 p-3 text-sm">Estamos recebendo cadastros para o lançamento. Os pagamentos ainda não estão habilitados.</p>}
    </section>
    <section className="grid md:grid-cols-4 gap-5">
      {[
        { icon: Store, title: 'Seu próprio painel', body: 'Cadastre fotos, descrição, preço com frete incluído e estoque disponível.' },
        { icon: ShieldCheck, title: 'Curadoria de produtos', body: 'Analisamos lojas e anúncios antes da publicação. Alterações passam por nova revisão.' },
        { icon: Wallet, title: 'Comissão transparente', body: 'Checkout Mercado Pago e divisão automática quando o serviço estiver habilitado e sua conta conectada.' },
        { icon: Megaphone, title: 'Mais visibilidade', body: 'Vitrine própria e links para compartilhar. Divulgação nos nossos canais depende de seleção editorial, sem garantia de alcance ou vendas.' },
      ].map(({ icon: Icon, title, body }) => <article key={title} className="bg-white border rounded-2xl p-6"><Icon className="text-blue-600 mb-4" /><h2 className="font-bold mb-2">{title}</h2><p className="text-sm text-gray-600">{body}</p></article>)}
    </section>
    <section className="grid md:grid-cols-2 gap-8">
      <div className="rounded-2xl bg-white border p-8"><h2 className="text-2xl font-bold mb-4">Comece com poucos produtos, bem apresentados</h2><ol className="list-decimal pl-5 space-y-3 text-gray-700"><li>Cadastre seus dados comerciais e aceite as regras.</li><li>Envie produtos próprios, com fotos autorizadas e informações verdadeiras.</li><li>Aguarde nossa análise e aceite o percentual de comissão.</li><li>Conecte seu Mercado Pago quando os pagamentos forem habilitados.</li><li>Receba pedidos confirmados, faça a entrega e informe o rastreamento.</li></ol></div>
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-8"><h2 className="text-2xl font-bold mb-4">Quem cuida de cada etapa?</h2><p className="mb-4">O vendedor é responsável por estoque, emissão fiscal quando aplicável, entrega, atendimento e devoluções. A plataforma oferece a vitrine, moderação e integração de pagamento.</p><p className="mb-5">Começamos com produtos físicos, entrega no Brasil com frete incluído no preço e um produto por pedido. Produtos ilegais, falsificados e sem autorização de venda não são aceitos.</p><Link href="/parceiros/termos" className="text-blue-700 underline">Leia as condições do programa</Link></div>
    </section>
    <div className="text-center"><Link href="/loja-parceiros" className="text-blue-700 font-semibold underline">Conheça os produtos dos parceiros</Link></div>
  </div>;
}
