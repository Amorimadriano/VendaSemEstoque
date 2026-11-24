# Programa de vendedores parceiros

## Escopo

- `/`: chamada em destaque antes das ofertas, com acesso ao programa e à vitrine.
- Menu principal e menu mobile: acesso ao programa de parceiros.
- `/parceiros`: página de aquisição, condições e cadastro gratuito.
- `/parceiros/cadastro` e `/parceiros/entrar`: conta própria de vendedor.
- `/parceiros/painel`: produtos, aceite de comissão, conexão Mercado Pago,
  pedidos confirmados, dados para entrega e rastreamento.
  Cada produto aceita até 10 fotos enviadas do computador/celular, inclusive
  selecionadas em lote, ou adicionadas por URL HTTPS. É possível remover fotos
  da galeria e escolher a capa antes de salvar.
- `/admin/parceiros`: análise cadastral, curadoria, suspensão e conciliação.
- `/loja-parceiros`: catálogo exclusivo de produtos aprovados de contas ativas.
- `/parceiros/compra`: acompanhamento por link privado, sem expor endereço.

O catálogo existente de afiliados continua independente. A sincronização de
AliExpress e Shopee não modifica anúncios dos vendedores.

Esta versão vende uma unidade de um produto físico por pedido, com entrega
no Brasil e frete incluído no preço anunciado. Não possui carrinho multivendedor,
cálculo de frete, carteira, saque manual ou disparo automático de publicidade.
A divulgação editorial pode usar os links de compartilhamento dos anúncios
aprovados; não há promessa de alcance, renda ou vendas.

## Banco

Aplicar **uma única vez**, antes de publicar o aplicativo:

```powershell
npx prisma db execute --file prisma\migrations\0019_partner_marketplace\migration.sql --schema prisma\schema.prisma
```

A migração é transacional e cria apenas tabelas/funções do programa. Ela não
altera nem exclui produtos, usuários ou comissões do catálogo de afiliados.
O comando `db execute` não registra o histórico de `prisma migrate`.
Não execute `db push` como substituto desta migração: as funções, permissões
e restrições SQL fazem parte da implementação.

Para habilitar as fotos enviadas pelo painel, aplique também:

```powershell
npx prisma db execute --file prisma\migrations\0020_partner_product_photos\migration.sql --schema prisma\schema.prisma
npx prisma db execute --file prisma\migrations\0021_partner_product_gallery\migration.sql --schema prisma\schema.prisma
```

Essa migração configura o bucket público `partner-products` no Supabase Storage.
Fotos aceitas: JPEG, PNG e WebP, até 5 MB por arquivo. O servidor verifica tamanho,
tipo e assinatura do arquivo; SVG e outros formatos não são aceitos.
O upload exige sessão do parceiro, mesma origem e conta não suspensa, com limite
de 30 envios por 15 minutos por IP/conta. As gravações usam somente a service role,
com pasta do parceiro e nome aleatório, sem permitir sobrescrever fotos.
Não é necessário liberar escrita anônima no bucket. Os links das fotos são
públicos desde o envio; não envie documentos ou imagens particulares.
Trocar ou cancelar uma foto não remove o arquivo antigo automaticamente;
considere esse armazenamento na política de retenção e na operação do programa.
A migração da galeria preserva a foto antiga, mantém `image_url` como capa
compatível e adiciona `image_urls` com as fotos ordenadas. O formulário envia
arquivos individualmente para manter o limite de memória; se um envio falhar,
as fotos já enviadas permanecem no formulário e as restantes podem ser
selecionadas novamente. A página pública oferece miniaturas selecionáveis,
e todas as fotos ficam disponíveis para a curadoria administrativa.

Todas as tabelas novas têm RLS. `anon` e `authenticated` não têm acesso direto;
somente as rotas do servidor, usando service role, acessam esses registros.
Pedidos e pagamentos têm relacionamentos que impedem exclusão do histórico.

## Configuração de pagamento

Cadastros, submissão, curadoria e vitrine funcionam sem credenciais financeiras.
Checkout e conexão OAuth recusam operação enquanto desabilitados/incompletos.
Nunca coloque secrets em variáveis `NEXT_PUBLIC_*`.
No painel administrativo, abra **Diagnóstico das variáveis desta implantação**
para conferir somente os nomes e a presença das configurações, sem revelar
valores. O diagnóstico compara a leitura do aplicativo com os bindings do
Cloudflare. Cadastre os secrets no projeto **Pages `venda-sem-estoque`**, no
ambiente **Production**; variáveis locais, do Worker de automação ou de Preview
não configuram a URL pública de produção. Reimplante depois de salvar.
O job **Check Cloudflare configuration** do workflow de implantação também
lista somente nomes e tipos das variáveis de Production/Preview, sem valores,
para comparar a configuração do projeto com os bindings recebidos pelo site.

Defina os valores no ambiente local e nos secrets/variáveis do Cloudflare Pages:

| Variável | Finalidade |
| --- | --- |
| `SITE_URL` | Origem HTTPS pública exata, sem caminho |
| `NEXTAUTH_SECRET` | Segredo de sessão, com no mínimo 32 caracteres |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Banco, somente no servidor |
| `PARTNER_COMMISSION_BPS` | Percentual em basis points: `1000` significa 10%. Sem padrão automático |
| `PARTNER_PAYMENTS_ENABLED` | Manter `false` até concluir os testes e a configuração |
| `MERCADOPAGO_MODE` | `sandbox` ou `production`; padrão seguro é sandbox |
| `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET` | Aplicação do operador da plataforma, habilitada para marketplace/split 1:1 |
| `MERCADOPAGO_WEBHOOK_SECRET` | Chave de assinatura gerada no painel do Mercado Pago |
| `PARTNER_TOKEN_ENCRYPTION_KEY` | Chave estável de 32 bytes aleatórios codificada em base64 |

Gere a chave de criptografia localmente; trate a saída como segredo e não a
publique nem a registre em commits:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Alterar essa chave sem migrar as credenciais criptografadas exige reconectar
as contas dos vendedores. Não apague credenciais necessárias a estornos de
pedidos antigos.

### Mercado Pago

1. Crie/habilite a aplicação para OAuth e split 1:1 no Mercado Pago. Verifique a
   elegibilidade da conta e os requisitos comerciais diretamente com o provedor.
2. Ative PKCE S256. Cadastre a redirect URI exata:
   `https://SEU-DOMINIO/api/parceiros/mercadopago`.
3. Configure notificações de **Payments/payment** para
   `https://SEU-DOMINIO/api/webhooks/mercadopago` e o segredo do webhook.
   As preferências também enviam essa URL com o identificador do vendedor.
4. Configure sandbox, percentual e credenciais. Habilite
   `PARTNER_PAYMENTS_ENABLED=true` **no ambiente de teste**, conecte uma conta
   de vendedor do ambiente correspondente e realize um pagamento de teste.
5. Valide aprovação, comissão `marketplace_fee`, pagamento recusado, repetição
   de webhook, estorno parcial/total e expiração sem pagamento.
6. Somente depois configure produção e reconecte contas de produção.
   A tela e os tokens distinguem o ambiente. Não use dados reais em sandbox.

O checkout usa o token OAuth do vendedor, não um token genérico da plataforma.
Tokens e refresh tokens são criptografados com AES-GCM e renovados no servidor.
As chamadas ao Mercado Pago usam o cabeçalho `Cache-Control: no-store`, sem a
opção `cache` de `fetch`, incompatível com o runtime Cloudflare desta implantação.
Reconexões devem usar a mesma conta Mercado Pago: trocar o recebedor é bloqueado
para preservar o acesso a pagamentos e estornos de pedidos anteriores.
As taxas do Mercado Pago são adicionais à comissão da plataforma e afetam o
líquido do vendedor. O provedor é responsável pela divisão e disponibilidade.
Cadastro e login usam bcrypt com custo 12 por uma API compatível com Edge.
Dimensione o orçamento de CPU/plano do Cloudflare para essa operação e teste
as rotas de autenticação no ambiente publicado; não reduza o custo para
contornar limites de um plano de hospedagem.

Não há boleto ou Pix nesta versão: meios assíncronos por boleto/transferência
estão excluídos para reduzir reservas prolongadas. O comprador recebe um link
privado de acompanhamento ao retornar do checkout; não há envio de e-mail
transacional sem um serviço de e-mail configurado.

## Regras e operação

- Antes de aprovar contas, confira identidade, dados comerciais, atendimento,
  origem e legalidade dos produtos e direitos de uso das imagens.
- A comissão exige aceite explícito do vendedor. Mudança de percentual bloqueia
  novos pedidos até novo aceite; pedidos existentes mantêm o snapshot original.
- Produto novo/editado fica `PENDING_REVIEW`. Apenas administrador aprova.
  Uma edição concorrente com reserva de estoque exige atualizar o painel.
- O estoque é reservado atomicamente por pedido. Preferências expiram em
  30 minutos. Liberação ocorre após conciliação autenticada com o provedor,
  nunca apenas pela passagem de tempo ou por retorno do navegador.
- Webhooks exigem HMAC e uma consulta canônica ao provedor, com conferência de
  ID, vendedor, aplicação recebedora da comissão, ambiente, moeda, valor e comissão. Repetições e notificações
  antigas não duplicam receita nem desfazem estornos já registrados.
- Estornos e disputas ajustam a comissão. Estorno integral de pedido não
  enviado devolve a unidade ao estoque apenas uma vez. Produtos já enviados
  precisam de conferência física antes da reposição manual.
- Pagamento duplicado ou aprovação tardia sem estoque leva a `REVIEW`.
  Não envie até revisar e resolver o pagamento no Mercado Pago.
- Vendedor suspenso não recebe novas vendas, mas pode acessar pedidos antigos
  para cumprir entregas e atendimento.
- O operador vê comissões confirmadas, não saldo disponível para saque.
  Estornos são solicitados no Mercado Pago e precisam ser acompanhados;
  falta de saldo e disputas podem exigir intervenção das partes.

Publique também o Worker de automação, com `APP_BASE_URL` e
`AUTOMATION_API_SECRET` consistentes com o Pages:

```powershell
npm run deploy:automation
```

O Worker mantém a automação diária existente e executa `partner-orders` a
cada 15 minutos. Cada execução concilia até 20 pedidos, priorizando os que
não foram consultados recentemente. Webhooks continuam sendo a via principal.
Falhas são registradas e retornam status de erro; use também o botão de
conciliação no painel administrativo. Monitore o lote e amplie a capacidade
de operação antes de aumentar muito o número de vendedores.

Antes do lançamento comercial, valide com assessoria jurídica/contábil os
termos publicados, identificação e canal de atendimento do operador,
documentação fiscal, responsabilidades, política de retenção e solicitações
LGPD. As telas não substituem essa análise nem a aprovação do provedor.

## Validação

```powershell
node --import tsx --test tests\partner-marketplace.test.ts tests\product-discovery-error.test.ts tests\affiliate-tracking.test.ts
npx tsc --noEmit --incremental false
npx prisma validate
npx prisma db execute --file tests\partner-marketplace.integration.sql --schema prisma\schema.prisma
```

O teste SQL usa dados fictícios dentro de uma transação que termina em
`ROLLBACK`: valida permissões, comissão aceita, última unidade, idempotência,
eventos fora de ordem, estornos e liberação de reserva.

Documentação oficial do provedor:
- [Split 1:1](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)
- [OAuth e PKCE](https://www.mercadopago.com.br/developers/en/docs/security/oauth/creation)
- [Webhooks](https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks)
