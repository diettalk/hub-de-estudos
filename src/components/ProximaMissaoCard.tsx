// src/components/ProximaMissaoCard.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Button } from './ui/button';

export async function ProximaMissaoCard() {
  const supabase = createServerComponentClient({ cookies });

  // Busca a primeira sessão não concluída, ordenada pela hora do ciclo
  const { data: proximaSessao } = await supabase
    .from('sessoes_estudo')
    .select('hora_no_ciclo, foco')
    .eq('concluido', false)
    .order('hora_no_ciclo')
    .limit(1)
    .single();

  return (
    <div className="card bg-blue-900/50 border border-blue-800 p-6 h-full">
      <h3 className="font-bold text-xl text-blue-300 mb-2">
        <i className="fas fa-bullseye mr-2"></i>Sua Próxima Missão
      </h3>
      {proximaSessao ? (
        <>
          <p className="text-lg text-white"><strong>Hora {proximaSessao.hora_no_ciclo}:</strong> {proximaSessao.foco}</p>
          <Link href="/ciclo">
            <Button className="mt-4">Ir para o Ciclo</Button>
          </Link>
        </>
      ) : (
        <p className="text-lg text-green-400">Parabéns, ciclo concluído!</p>
      )}
    </div>
  );
}