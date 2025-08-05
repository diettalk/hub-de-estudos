// src/components/AnotacoesRapidasCard.tsx
'use client';

// A sua action não foi enviada, então usei um nome genérico. 
// Se o nome for diferente, por favor, ajuste a importação.
import { updateAnotacao } from '@/app/actions'; 
import { useEffect, useState, useTransition } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Activity, ListChecks, CalendarCheck, CheckCircle } from 'lucide-react'; // Ícones do seu DashboardClient para consistência


// O componente recebe o array de anotações
export function AnotacoesRapidasCard({ anotacoes }: { anotacoes: { id: number, content: string }[] }) {
  // Assumimos que há apenas UMA anotação rápida por usuário por enquanto
  const anotacaoAtual = anotacoes[0];
  const [content, setContent] = useState(anotacaoAtual?.content || '');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Para evitar salvar um valor inicial vazio desnecessariamente
    if (content === (anotacaoAtual?.content || '')) {
      return;
    }

    const handler = setTimeout(() => {
      startTransition(() => {
        // A action precisa do ID para saber qual anotação atualizar
        updateAnotacao({
            id: anotacaoAtual.id,
            content: content
        } as unknown as FormData); // Adaptação para a sua action que espera FormData
      });
    }, 1500); // Salva 1.5s depois de parar de digitar

    return () => { clearTimeout(handler); };
  }, [content, anotacaoAtual]);

  return (
    // REMOVIDO: bg-gray-800 e p-6. Essas propriedades virão do DashboardCard.
    <>
      <div className="flex items-center gap-3 mb-4">
          {/* Adicionei o título e ícone aqui para manter o padrão dos outros cards */}
          <ListChecks className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Anotações Rápidas</h2>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        // REMOVIDO: bg-gray-700, text-white, border-gray-600.
        // O Textarea do shadcn já se adapta ao tema.
        className="w-full rounded-md h-24"
        placeholder="Anote seus insights e eles serão salvos automaticamente..."
      />
       <div className="text-right text-xs text-muted-foreground h-4 mt-1">
            {isPending ? <span>Salvando...</span> : <span>&nbsp;</span>}
       </div>
    </>
  );
}