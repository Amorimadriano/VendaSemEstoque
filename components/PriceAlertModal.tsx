'use client';

import { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';

interface PriceAlertModalProps {
  productId: string;
  productName: string;
  currentPrice: number;
}

export default function PriceAlertModal({ productId, productName, currentPrice }: PriceAlertModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(Math.round(currentPrice * 0.9));
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && targetPrice) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 2500);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm border border-gray-300 transition-colors"
      >
        <Bell className="w-4 h-4 text-blue-600" />
        <span>Avise-me quando o preço baixar</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-blue-600">
              <Bell className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Criar Alerta de Preço</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Receba um e-mail imediatamente assim que o valor de <strong>{productName}</strong> atingir o seu preço desejado.
            </p>

            {isSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-800">Alerta configurado com sucesso!</p>
                <p className="text-xs text-emerald-600">Nós avisaremos você assim que o preço cair.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preço Atual: R$ {currentPrice.toFixed(2)}
                  </label>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preço Desejado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(Number(e.target.value))}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Seu E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md transition-colors"
                >
                  Confirmar Alerta
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
