// src/components/CicloTableRow.tsx
'use client'; // 1. Este é um Client Component, pois precisa de interatividade (clique).

import { toggleTask } from '@/app/actions'; // 2. Importamos nossa Server Action.
import { useTransition } from 'react';

// Definimos o tipo de dados que a linha espera receber
type Sessao = {
  id: number;
  hora_no_ciclo: number;
  foco: string;
  concluido: boolean;
  disciplinas: {
    nome: string;
    emoji: string;
  } | null;
};

export function CicloTableRow({ sessao }: { sessao: Sessao }) {
  const [isPending, startTransition] = useTransition(); // Hook para transições suaves

  const handleToggle = () => {
    startTransition(() => {
      toggleTask(sessao.id, sessao.concluido);
    });
  };

  return (
    // 3. A linha muda de cor se estiver concluída
    <tr className={sessao.concluido ? 'bg-green-900/50 text-gray-500 line-through' : 'hover:bg-gray-700'}>
      <td className="p-4 font-bold">{sessao.hora_no_ciclo}</td>
      <td className="p-4">
        <span className="bg-blue-900 text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full">
          {sessao.disciplinas?.emoji} {sessao.disciplinas?.nome}
        </span>
      </td>
      <td className="p-4">{sessao.foco}</td>
      <td className="p-4">
        {/* 4. O checkbox agora chama nossa função handleToggle ao ser clicado */}
        <input
          type="checkbox"
          defaultChecked={sessao.concluido}
          onChange={handleToggle}
          disabled={isPending} // Desabilita enquanto a ação está em andamento
          className="w-5 h-5 accent-blue-500 bg-gray-900 border-gray-600 rounded cursor-pointer"
        />
      </td>
    </tr>
  );
}