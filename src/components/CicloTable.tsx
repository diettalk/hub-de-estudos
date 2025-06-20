// src/components/CicloTable.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CicloTableRow } from './CicloTableRow'; // Importamos nosso novo componente

export async function CicloTable() {
  const supabase = createServerComponentClient({ cookies });

  const { data: sessoes } = await supabase
    .from('sessoes_estudo')
    .select(`*, disciplinas ( nome, emoji )`)
    .order('hora_no_ciclo');

  if (!sessoes || sessoes.length === 0) {
    return <p className="text-gray-400">Nenhuma sessão de estudo encontrada.</p>;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700">
            <tr>
              <th className="p-4">Hora</th>
              <th className="p-4">Matéria</th>
              <th className="p-4">Tópico Específico</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {/* Agora usamos o CicloTableRow para cada sessão */}
            {sessoes.map((sessao) => (
              // @ts-ignore
              <CicloTableRow key={sessao.id} sessao={sessao} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}