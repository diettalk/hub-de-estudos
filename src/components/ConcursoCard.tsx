// src/components/ConcursoCard.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function ConcursoCard() {
  const supabase = createServerComponentClient({ cookies });

  const { data: concurso } = await supabase
    .from('concursos')
    .select('*')
    .limit(1)
    .single();

  if (!concurso) {
    return <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">Nenhum concurso ativo. Adicione um no Supabase para começar.</div>;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-white">Concurso Ativo</h3>
      <ul className="space-y-3 text-sm text-white">
        <li className="flex justify-between items-start">
          <strong className="whitespace-nowrap mr-2">Nome:</strong>
          <span className="text-gray-300 text-right">{concurso.nome}</span>
        </li>
        <li className="flex justify-between items-center">
          <strong>Banca:</strong>
          <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-semibold">{concurso.banca}</span>
        </li>
        <li className="flex justify-between items-center">
          <strong>Prova:</strong>
          <span className="text-gray-300">{new Date(concurso.data_prova).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
        </li>

        {/* Seção de Prioridades */}
        {concurso.prioridades && concurso.prioridades.length > 0 && (
          <li className="pt-2 border-t border-gray-700">
            <strong className="mb-2 block">Prioridades:</strong>
            <div className="space-y-2 text-xs">
              {concurso.prioridades.map((prioridade, index) => (
                <p key={index} className="bg-gray-700 p-2 rounded-md text-gray-300">
                  {index + 1}. {prioridade}
                </p>
              ))}
            </div>
          </li>
        )}
      </ul>
    </div>
  );
} // <--- O erro provavelmente era este '}' que estava faltando.