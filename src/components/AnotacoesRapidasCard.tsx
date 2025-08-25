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
  // Com a lógica na página do servidor, anotacoes[0] deve sempre existir.
  const anotacaoAtual = anotacoes[0];
  
  // Usamos uma ref para o ID para evitar problemas de re-renderização.
  const anotacaoId = useRef<number | null>(anotacaoAtual?.id || null);
  const [content, setContent] = useState(anotacaoAtual?.content || '');
  const [isPending, startTransition] = useTransition();

  // Garante que o estado local é atualizado se a prop do servidor mudar.
  useEffect(() => {
    setContent(anotacaoAtual?.content || '');
    anotacaoId.current = anotacaoAtual?.id || null;
  }, [anotacaoAtual]);

  // Salva 1.5s depois de o utilizador parar de digitar.
  const debouncedSave = useDebouncedCallback((currentContent: string) => {
    startTransition(async () => {
      // Se não houver conteúdo e não houver anotação, não faz nada.
      if (!anotacaoId.current && currentContent.trim() === '') {
        return;
      }

      if (anotacaoId.current) {
        // [CORREÇÃO] Se já temos um ID, atualizamos e VERIFICAMOS o resultado.
        const result = await updateAnotacao(anotacaoId.current, currentContent);
        if (result?.error) {
          toast.error("Falha ao salvar anotação", { description: result.error });
        }
      } else {
        // Se não temos um ID, criamos uma nova anotação.
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
        disabled={!anotacaoAtual} // Desabilita se, por algum motivo, não houver anotação
      />
      <div className="text-right text-xs text-muted-foreground h-4 mt-1">
        {isPending ? <span>Salvando...</span> : <span>&nbsp;</span>}
      </div>
    </>
  );
}
