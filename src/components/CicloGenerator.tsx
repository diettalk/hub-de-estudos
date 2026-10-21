// src/components/CicloGenerator.tsx
'use client';

import { useTransition } from 'react';
import { Button } from './ui/button';
import { generateCicloParaConcurso } from '@/app/actions';

export function CicloGenerator({ concursoId }: { concursoId: number | null }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!concursoId) {
      alert("Não foi possível identificar um concurso ativo para gerar o ciclo.");
      return;
    }

    if (window.confirm('Isso irá apagar qualquer ciclo existente para as disciplinas deste concurso e gerar um novo. Deseja continuar?')) {
      startTransition(async () => {
        const result = await generateCicloParaConcurso(concursoId);
        if (result?.error) {
          alert(`Erro: ${result.error}`);
        } else {
          alert('Ciclo de estudos gerado com sucesso!');
        }
      });
    }
  };

  if (!concursoId) {
    return <Button disabled>Nenhum concurso ativo</Button>;
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Gerando...' : 'Gerar Ciclo Padrão'}
    </Button>
  );
}