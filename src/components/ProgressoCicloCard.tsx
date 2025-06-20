// src/components/ProgressoCicloCard.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function ProgressoCicloCard() {
  const supabase = createServerComponentClient({ cookies });

  // 1. Busca todas as sessões de estudo
  const { data: sessoes, error } = await supabase
    .from('sessoes_estudo')
    .select('concluido');

  if (error || !sessoes) {
    return <div className="bg-gray-800 p-6 rounded-lg shadow-lg">Erro ao buscar progresso.</div>;
  }

  // 2. Calcula a porcentagem
  const totalTasks = sessoes.length;
  const completedTasks = sessoes.filter(s => s.concluido).length;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-white">Progresso do Ciclo</h3>
      <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-8 text-sm font-medium text-white text-center p-1 leading-none rounded-full"
          style={{ width: `${percentage}%` }}
        >
          {percentage}%
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        {completedTasks} de {totalTasks} tarefas concluídas
      </p>
    </div>
  );
}