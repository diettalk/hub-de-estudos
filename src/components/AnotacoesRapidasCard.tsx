// src/components/AnotacoesRapidasCard.tsx
'use client';
import { updateAnotacoesRapidas } from '@/app/actions';
import { useEffect, useState, useTransition } from 'react';
import { Textarea } from '@/components/ui/textarea'; // Usando o Textarea do Shadcn

export function AnotacoesRapidasCard({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = setTimeout(() => {
      if (content !== initialContent) {
        startTransition(() => {
          updateAnotacoesRapidas(content);
        });
      }
    }, 1500); // Salva 1.5s depois de parar de digitar

    return () => { clearTimeout(handler); };
  }, [content, initialContent]);

  return (
    <div className="card bg-gray-800 p-6">
      <h3 className="text-xl font-bold mb-4">Anotações Rápidas</h3>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-gray-700 text-white p-2 rounded-md h-24 border-gray-600"
        placeholder="Anote seus insights e eles serão salvos automaticamente..."
      />
       <div className="text-right text-xs text-gray-400 h-4 mt-1">
            {isPending && <span>Salvando...</span>}
        </div>
    </div>
  );
}