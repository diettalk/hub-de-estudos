// src/app/guia-estudos/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ConcursosClient } from '@/components/ConcursosClient';
import { Pagina } from '@/app/disciplinas/page'; // Reutilizamos o tipo da página de disciplinas

export const dynamic = 'force-dynamic';

export default async function GuiaDeEstudosPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Query atualizada para buscar os concursos e suas páginas vinculadas
  const { data: concursos, error } = await supabase
    .from('concursos')
    .select('*, concurso_paginas(paginas(*))') // A mágica do Supabase para fazer o JOIN
    .eq('user_id', session.user.id)
    .order('data_prova', { ascending: true });
    
  // Busca todas as páginas raiz para oferecer no modal de vínculo
  const { data: paginasRaiz } = await supabase
    .from('paginas')
    .select('*')
    .is('parent_id', null)
    .eq('user_id', session.user.id);

  if (error) {
    console.error("Erro ao buscar concursos:", error);
  }
  
  const ativos = concursos?.filter(c => c.status === 'ativo') || [];
  const previstos = concursos?.filter(c => c.status === 'previsto') || [];
  const arquivados = concursos?.filter(c => c.status === 'arquivado') || [];
  
  return (
    <div>
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Central de Concursos</h1>
        <p className="text-gray-400">Gerencie todos os seus concursos, ativos e futuros.</p>
      </header>
      <ConcursosClient
        ativos={ativos}
        previstos={previstos}
        arquivados={arquivados}
        paginasDisponiveis={paginasRaiz as Pagina[] || []}
      />
    </div>
  );
}