// src/components/PrioridadesCard.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PrioridadesCard() {
  const supabase = createServerComponentClient({ cookies });

  const { data: concurso } = await supabase
    .from('concursos')
    .select('prioridades')
    .limit(1)
    .single();

  if (!concurso || !concurso.prioridades || concurso.prioridades.length === 0) {
    return null; // Não mostra nada se não houver prioridades
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-white">Suas Prioridades</h3>
      <ol className="list-decimal list-inside space-y-2 text-gray-300">
        {concurso.prioridades.map((prioridade, index) => (
          <li key={index}>{prioridade}</li>
        ))}
      </ol>
    </div>
  );
}