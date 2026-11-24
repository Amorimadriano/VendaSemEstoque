import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Venda Sem Estoque',
  description: 'Política de Privacidade e Termos de Uso da plataforma Venda Sem Estoque.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xs sm:p-10">
          <h1 className="text-3xl font-extrabold text-gray-900">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-gray-500">Última atualização: 24 de Novembro de 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 className="text-lg font-bold text-gray-900">1. Informações Gerais</h2>
              <p className="mt-2">
                A plataforma <strong>Venda Sem Estoque</strong> valoriza a privacidade dos seus usuários e está comprometida com a transparência e a proteção de dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">2. Coleta de Dados</h2>
              <p className="mt-2">
                Coletamos informações necessárias para aprimorar a experiência de navegação, tais como:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Dados de navegação, cookies e identificadores anônimos de sessão.</li>
                <li>Métricas agregadas de cliques em links de afiliados e produtos parceiros.</li>
                <li>Informações fornecidas voluntariamente em cadastros ou contatos de suporte.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">3. Uso das Informações e Links de Afiliados</h2>
              <p className="mt-2">
                A plataforma atua como curadora e agregadora de ofertas de e-commerce e programas de afiliados (como Shopee, AliExpress e Amazon). Ao clicar em links de compra, o usuário é redirecionado para a loja parceira oficial.
              </p>
              <p className="mt-2">
                Não coletamos nem armazenamos números de cartões. Nas ofertas de afiliados, a compra ocorre nas lojas externas. Na vitrine de vendedores independentes, o checkout é processado pelo Mercado Pago quando habilitado; armazenamos identificadores, situação e valores dos pedidos e pagamentos para acompanhamento, comissões, estornos e obrigações legais.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">4. Integrações com Redes Sociais e Meta API</h2>
              <p className="mt-2">
                Nossos aplicativos integrados à Meta (Facebook e Instagram) utilizam permissões autorizadas estritamente para publicação automatizada de conteúdos, vídeos (Reels) e métricas de desempenho de campanhas em nossas páginas oficiais autorizadas.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">5. Compartilhamento e Segurança de Dados</h2>
              <p className="mt-2">
                Não comercializamos dados pessoais de usuários com terceiros. Empregamos protocolos rígidos de segurança, criptografia HTTPS e infraestrutura em nuvem segura para proteger todas as comunicações.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">Programa de vendedores parceiros</h2>
              <p className="mt-2">Coletamos dados cadastrais e comerciais dos vendedores, identificação fiscal para análise administrativa, senha armazenada com hash e registro de aceite das condições. Nome da loja, nome comercial, e-mail, telefone e endereço comercial identificados no cadastro são públicos na vitrine. A identificação fiscal não é exibida publicamente.</p>
              <p className="mt-2">Para compras de parceiros, coletamos nome, contato e endereço de entrega. Os dados necessários são disponibilizados ao vendedor após pagamento confirmado para execução da compra, atendimento e cumprimento de obrigações legais. O Mercado Pago recebe os dados necessários ao processamento do pagamento. Credenciais de conexão dos vendedores são mantidas criptografadas no servidor, sem exposição ao navegador.</p>
              <p className="mt-2">Utilizamos cookies de sessão para autenticar vendedores e administradores e identificadores técnicos com hash para limitar tentativas abusivas. Registros financeiros e de aceite podem ser mantidos enquanto necessários às obrigações legais e à defesa de direitos. Dados não devem ser usados pelo vendedor para publicidade sem base legal apropriada. As <Link href="/parceiros/termos" className="underline text-blue-700">condições do programa</Link> detalham as responsabilidades.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">6. Contato e Encarregado de Dados</h2>
              <p className="mt-2">
                Para dúvidas sobre esta política de privacidade, exclusão de dados ou esclarecimentos sobre os termos, entre em contato através da nossa página de suporte ou e-mail institucional.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-6">
            <Link href="/" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
