// src/components/DisciplinasList.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

export async function DisciplinasList({ concursoId }: { concursoId: number }) {
  // PONTO DE INVESTIGAÇÃO 1: O componente recebeu o ID do concurso?
  console.log(`[DisciplinasList] INVESTIGANDO... Recebi o concursoId: ${concursoId}`);

  const supabase = createServerComponentClient({ cookies });

  // Adicionamos 'error' para ver se o Supabase reclama de algo
  const { data: disciplinas, error } = await supabase
    .from('disciplinas')
    .select('*')
    .eq('concurso_id', concursoId)
    .order('nome');

  // PONTO DE INVESTIGAÇÃO 2: O que o Supabase nos retornou?
  if (error) {
    console.error('[DisciplinasList] O Supabase retornou um ERRO:', error);
  }
  console.log(`[DisciplinasList] Disciplinas encontradas no banco de dados:`, disciplinas);

  if (!disciplinas || disciplinas.length === 0) {
    return <p className="text-gray-400">Nenhuma disciplina encontrada para este concurso (verificado no código).</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {disciplinas.map((disciplina) => {
        // PONTO DE INVESTIGAÇÃO 3: Estamos criando o link corretamente para cada disciplina?
        console.log(`[DisciplinasList] Criando link para a disciplina "${disciplina.nome}" com o href: /materiais/disciplina/${disciplina.id}`);
        return (
          <Link
            key={disciplina.id}
            href={`/materiais/disciplina/${disciplina.id}`}
            className="block bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700"
          >
            <div>
              <span className="text-2xl mr-3">{disciplina.emoji}</span>
              <span className="font-bold">{disciplina.nome}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}