// src/components/CicloTable.tsx
'use client';
import { useTransition } from 'react';
import { addSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from './ui/button';
import { CicloTableRow } from './CicloTableRow';

export function CicloTable({ sessoes, disciplinas }: { sessoes: SessaoEstudo[], disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
            <tr>
              <th className="p-3">Finalizada</th>
              <th className="p-3">Hora</th>
              <th className="p-3">Matéria</th>
              <th className="p-3 min-w-[350px]">Foco Sugerido</th>
              <th className="p-3 min-w-[250px]">Diário de Bordo</th>
              <th className="p-3 min-w-[200px]">Questões</th>
              <th className="p-3 min-w-[150px]">Concluído em</th>
              <th className="text-center p-3">R1 (24h)</th>
              <th className="text-center p-3">R7 (7d)</th>
              <th className="text-center p-3">R30 (30d)</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-center border-t border-gray-700">
        <form action={() => startTransition(() => addSessaoCiclo())}>
          <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
            {isPending ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
          </Button>
        </form>
      </div>
    </div>
  );
}