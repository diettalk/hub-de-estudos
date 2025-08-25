// src/components/AnotacoesRapidasCard.tsx
'use client';

import { addAnotacao, updateAnotacao } from '@/app/actions'; 
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { ListChecks } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

type Anotacao = { id: number, content: string };

export function AnotacoesRapidasCard({ anotacoes }: { anotacoes: Anotacao[] }) {
  const router = useRouter();
  const anotacaoAtual = anotacoes[0];
  
  const anotacaoId = useRef<number | null>(anotacaoAtual?.id || null);
  // O estado é inicializado apenas uma vez com os dados do servidor.
  const [content, setContent] = useState(anotacaoAtual?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  // [CORREÇÃO] O useEffect que causava o reset do texto foi removido.

  const handleSave = useDebouncedCallback((currentContent: string) => {
    // Não salva se o conteúdo não mudou desde a última vez que foi carregado.
    if (currentContent === (anotacaoAtual?.content || '')) {
        setIsSaving(false);
        return;
    }

    setIsSaving(true);
    startTransition(() => {
        let actionPromise;
        if (anotacaoId.current) {
            actionPromise = updateAnotacao(anotacaoId.current, currentContent);
        } else {
            actionPromise = addAnotacao(currentContent);
        }

        toast.promise(actionPromise, {
            loading: 'Salvando anotação...',
            success: (result) => {
                if (result.error) {
                    throw new Error(result.error);
                }
                // O refresh agora buscará os dados corretos sem causar um reset na UI.
                router.refresh(); 
                setIsSaving(false);
                return 'Anotação salva!';
            },
            error: (err) => {
                setIsSaving(false);
                return `Falha ao salvar: ${err.message}`;
            },
        });
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
            // A UI é atualizada imediatamente com o que o utilizador digita.
            setContent(e.target.value);
            // A função de salvamento é chamada em segundo plano.
            handleSave(e.target.value);
        }}
        className="w-full rounded-md h-24"
        placeholder="Anote seus insights e eles serão salvos automaticamente..."
        disabled={!anotacaoAtual}
      />
      <div className="text-right text-xs text-muted-foreground h-4 mt-1">
        {isSaving ? <span>Salvando...</span> : <span>&nbsp;</span>}
      </div>
    </>
  );
}
