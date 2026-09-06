'use client';

import { FormEvent, useState } from 'react';
import { Bot, ChevronDown, MessageCircle, Send, UserRound, X } from 'lucide-react';

type Message = {
  content: string;
  sender: 'assistant' | 'user';
};

const whatsappUrl = 'https://wa.me/5511976923833?text=Olá!%20Preciso%20de%20ajuda%20com%20a%20VendaSemEstoque.';

function getReply(question: string) {
  const normalizedQuestion = question.toLowerCase();

  if (/(comprar|produto|oferta|link|loja)/.test(normalizedQuestion)) {
    return 'Abra o produto desejado e use o botão de compra. Você será direcionado para a loja parceira, onde conclui o pedido com segurança.';
  }
  if (/(preço|valor|desconto|barato)/.test(normalizedQuestion)) {
    return 'Os preços e descontos exibidos são atualizados periodicamente. Antes de finalizar a compra, confirme o valor na página da loja parceira.';
  }
  if (/(entrega|pedido|rastre|devolu|troca)/.test(normalizedQuestion)) {
    return 'A entrega, rastreamento, troca e devolução são tratados diretamente pela loja parceira onde o pedido foi realizado.';
  }
  if (/(admin|painel|cadastr|adicionar)/.test(normalizedQuestion)) {
    return 'No Painel Admin você pode consultar métricas e cadastrar ou excluir produtos. O painel está disponível pelo menu superior.';
  }
  if (/(afiliad|comiss)/.test(normalizedQuestion)) {
    return 'A VendaSemEstoque utiliza links de afiliados. A comissão é informada pela loja parceira e não altera o valor pago por você.';
  }

  return 'Posso ajudar com produtos, compras, preços, entregas, links de afiliados e o painel administrativo. Para uma orientação personalizada, fale conosco pelo WhatsApp.';
}

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      content: 'Olá! Sou o assistente da VendaSemEstoque. Como posso ajudar?',
    },
  ]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { sender: 'user', content: trimmedQuestion },
      { sender: 'assistant', content: getReply(trimmedQuestion) },
    ]);
    setQuestion('');
  }

  return (
    <div className="fixed bottom-5 right-4 z-50 sm:right-6">
      {isOpen && (
        <section className="mb-3 flex h-[min(32rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Assistente VendaSemEstoque</h2>
                <p className="text-xs text-blue-100">Suporte online</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="p-1 text-blue-100 hover:text-white" aria-label="Fechar atendimento">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
            {messages.map((message, index) => (
              <div key={`${message.sender}-${index}`} className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'assistant' && <Bot className="mt-1 h-4 w-4 shrink-0 text-blue-600" />}
                <p className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}>
                  {message.content}
                </p>
                {message.sender === 'user' && <UserRound className="mt-1 h-4 w-4 shrink-0 text-blue-600" />}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 bg-white p-3">
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mb-3 flex items-center justify-center gap-2 rounded-md border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
              <MessageCircle className="h-4 w-4" /> Falar pelo WhatsApp
            </a>
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Digite sua dúvida..."
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700" aria-label="Enviar mensagem">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((currentValue) => !currentValue)} className="ml-auto flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700" aria-expanded={isOpen}>
        {isOpen ? <ChevronDown className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {isOpen ? 'Minimizar' : 'Precisa de ajuda?'}
      </button>
    </div>
  );
}