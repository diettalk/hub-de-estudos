// src/components/AnotacoesRapidasCard.tsx
'use client';

import { addAnotacao, updateAnotacao } from '@/app/actions'; 
import { useEffect, useState, useTransition, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ListChecks } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

type Anotacao = { id: number, content: string };

export function AnotacoesRapidasCard({ anotacoes }: { anotacoes: Anotacao[] }) {
  // Usamos uma ref para guardar o ID da anotação. Isto evita problemas de re-renderização.
  const anotacaoId = useRef<number | null>(anotacoes[0]?.id || null);
  const [content, setContent] = useState(anotacoes[0]?.content || '');
  const [isPending, startTransition] = useTransition();

  // Este efeito garante que se os dados do servidor mudarem, o nosso componente atualiza.
  useEffect(() => {
    setContent(anotacoes[0]?.content || '');
    anotacaoId.current = anotacoes[0]?.id || null;
  }, [anotacoes]);

  // Função de salvamento otimizada (só salva 1.5s depois de parar de digitar)
  const debouncedSave = useDebouncedCallback((currentContent: string) => {
    startTransition(async () => {
      if (anotacaoId.current) {
        // Se já temos um ID, apenas atualizamos a anotação existente.
        await updateAnotacao(anotacaoId.current, currentContent);
      } else if (currentContent.trim() !== '') {
        // Se não temos um ID e o utilizador escreveu algo, criamos uma nova anotação.
        const result = await addAnotacao(currentContent);
        if (result.success && result.newAnotacao) {
          // Após criar, guardamos o novo ID para as próximas atualizações.
          anotacaoId.current = result.newAnotacao.id;
        } else if (result.error) {
            toast.error("Falha ao criar anotação", { description: result.error });
        }
      }
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
      />
      <div className="text-right text-xs text-muted-foreground h-4 mt-1">
        {isPending ? <span>Salvando...</span> : <span>&nbsp;</span>}
      </div>
    </>
  );
}
