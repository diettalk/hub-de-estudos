// oisrc/components/AnotacoesRapidasCard.tsx
'use client';

import { updateAnotacao } from '@/app/actions'; 
import { useEffect, useState, useTransition } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ListChecks } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

type Anotacao = { id: number, content: string };

export function AnotacoesRapidasCard({ anotacoes }: { anotacoes: Anotacao[] }) {
  // Com a nova lógica na página, anotacoes[0] sempre deve existir.
  const anotacaoAtual = anotacoes[0];
  const [content, setContent] = useState(anotacaoAtual?.content || '');
  const [isPending, startTransition] = useTransition();

  // Atualiza o conteúdo se a prop mudar (ex: navegação ou primeira criação)
  useEffect(() => {
    setContent(anotacaoAtual?.content || '');
  }, [anotacaoAtual]);

  // Salva 1.5s depois de parar de digitar
  const debouncedSave = useDebouncedCallback((currentContent: string) => {
    // Se por algum motivo não houver anotação (ex: erro na criação), não faz nada.
    if (!anotacaoAtual?.id) {
      return;
    }
    
    startTransition(async () => {
      await updateAnotacao(anotacaoAtual.id, currentContent);
    });
  }, 1500);

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <ListChecks className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Anotações Rápidas</h2>
      </div>
      <Textarea
        value={content}
        onChange={(e) => {
            setContent(e.target.value);
            debouncedSave(e.target.value);
        }}
        className="w-full rounded-md h-24"
        placeholder="Anote seus insights e eles serão salvos automaticamente..."
        // Desabilita o textarea se não houver anotação para evitar qualquer erro
        disabled={!anotacaoAtual}
      />
      <div className="text-right text-xs text-muted-foreground h-4 mt-1">
        {isPending ? <span>Salvando...</span> : <span>&nbsp;</span>}
      </div>
    </>
  );
}
