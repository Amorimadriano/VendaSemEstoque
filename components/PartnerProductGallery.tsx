'use client';
import { useState } from 'react';

export default function PartnerProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] || images[0];
  return <div className="min-w-0 bg-white rounded-2xl border p-6 space-y-4">
    <img src={current} alt={name} referrerPolicy="no-referrer" className="w-full h-72 sm:h-96 object-contain" />
    {images.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Fotos do produto">
      {images.map((image, index) => <button key={image} type="button" onClick={() => setSelected(index)}
        aria-label={`Ver foto ${index + 1} de ${images.length}`} aria-pressed={current === image}
        className={`h-16 w-16 shrink-0 rounded-lg border-2 p-1 ${current === image ? 'border-blue-700' : 'border-gray-200 hover:border-blue-400'}`}>
        <img src={image} alt={`Foto ${index + 1} de ${name}`} referrerPolicy="no-referrer" className="h-full w-full object-contain" />
      </button>)}
    </div>}
  </div>;
}
