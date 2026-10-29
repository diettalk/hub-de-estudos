import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ConcursosClient } from '@/components/ConcursosClient';
import { type Concurso, type Disciplina, type SessaoEstudo } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function GuiaDeEstudosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca os planos (concursos) e as disciplinas vinculadas
  const { data: concursos, error } = await supabase
    .from('concursos')
    .select('*, concurso_paginas(paginas(*))')
    .eq('user_id', user.id)
    .eq('concurso_paginas.paginas.user_id', user.id)
    .order('ordem', { ascending: true, nullsFirst: false })
    .order('data_prova', { ascending: true });

  // Busca todas as páginas (disciplinas raiz e sub-tópicos) para cálculo de tópicos e vínculos
  const { data: paginasDisponiveis } = await supabase
    .from('paginas')
    .select('*')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  // Busca todas as sessões de estudo para calcular Horas, Questões, Desempenho e Histórico por Disciplina
  const { data: sessoes } = await supabase
    .from('ciclo_sessoes')
    .select('*')
    .eq('user_id', user.id)
    .order('data_estudo', { ascending: false });

  if (error) {
    console.error('Erro ao buscar planos:', error.message);
  }

  const ativos = concursos?.filter((c) => c.status === 'ativo') || [];
  const previstos = concursos?.filter((c) => c.status === 'previsto') || [];
  const arquivados = concursos?.filter((c) => c.status === 'arquivado') || [];

  return (
    <div className="space-y-6">
      <ConcursosClient
        ativos={ativos as Concurso[]}
        previstos={previstos as Concurso[]}
        arquivados={arquivados as Concurso[]}
        paginasDisponiveis={(paginasDisponiveis as Disciplina[]) || []}
        sessoes={(sessoes as SessaoEstudo[]) || []}
      />
    </div>
  );
}