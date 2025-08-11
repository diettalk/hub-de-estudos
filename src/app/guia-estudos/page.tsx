import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ConcursosClient } from '@/components/ConcursosClient';
// 1. Importar os tipos corretos do nosso arquivo central
import { type Concurso, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function GuiaDeEstudosPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Busca os concursos e faz o JOIN para buscar as disciplinas vinculadas a cada um
  const { data: concursos, error } = await supabase
    .from('concursos')
    .select('*, concurso_paginas(paginas(*))') // 'paginas' é o nome da tabela de disciplinas
    .eq('user_id', session.user.id)
    .order('data_prova', { ascending: true });
    
  // Busca todas as disciplinas disponíveis para oferecer no modal de vínculo
  const { data: paginasDisponiveis } = await supabase
    .from('paginas')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error("Erro ao buscar concursos:", error.message);
  }
  
  // A lógica de filtragem continua a mesma
  const ativos = concursos?.filter(c => c.status === 'ativo') || [];
  const previstos = concursos?.filter(c => c.status === 'previsto') || [];
  const arquivados = concursos?.filter(c => c.status === 'arquivado') || [];
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Central de Concursos</h1>
        <p className="text-muted-foreground">Gerencie todos os seus concursos, ativos e futuros.</p>
      </header>
      <ConcursosClient
        ativos={ativos as Concurso[]}
        previstos={previstos as Concurso[]}
        arquivados={arquivados as Concurso[]}
        paginasDisponiveis={paginasDisponiveis as Disciplina[] || []}
      />
    </div>
  );
}
