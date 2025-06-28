// src/app/guia-estudos/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ConcursosClient } from '@/components/ConcursosClient';

export const dynamic = 'force-dynamic';

export default async function GuiaDeEstudosPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: concursos, error } = await supabase
    .from('concursos')
    .select('*')
    .eq('user_id', session.user.id)
    .order('data_prova', { ascending: true });
    
  if (error) {
    console.error("Erro ao buscar concursos:", error);
  }
  
  // Separa os concursos por status
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
      />
    </div>
  );
}