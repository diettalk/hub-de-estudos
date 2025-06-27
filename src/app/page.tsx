// src/app/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import RevisoesPainel from '@/components/RevisoesPainel';
import { updateAnotacoesRapidas } from '@/app/actions';

export const dynamic = 'force-dynamic'; // Desabilita o cache para esta página

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ADICIONADO "ESPIÃO"
  console.log(
    `--- DASHBOARD PAGE --- Sessão encontrada:`,
    session ? `UserID: ${session.user.id}` : "null"
  );

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, anotacoes_rapidas')
    .eq('id', session.user.id)
    .single();

  const { count: tarefasPendentes } = await supabase
    .from('tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('concluida', false);

  const { count: sessoesHoje } = await supabase
    .from('sessoes_estudo')
    .select('*', { count: 'exact', head: true })
    .eq('data_estudo', new Date().toISOString().split('T')[0]);

  return (
    <div>
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400">Bem-vindo(a) de volta! Aqui está um resumo do seu progresso.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gray-800 p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Sessões de Hoje</h3>
          <p className="text-4xl font-bold text-blue-400">{sessoesHoje ?? 0}</p>
        </div>
        <div className="card bg-gray-800 p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Tarefas Pendentes</h3>
          <p className="text-4xl font-bold text-yellow-400">{tarefasPendentes ?? 0}</p>
        </div>
        <div className="card bg-gray-800 p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Revisões para Hoje</h3>
          <RevisoesPainel />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-gray-800 p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-4">Anotações Rápidas</h3>
          <form action={updateAnotacoesRapidas} className="flex flex-col h-full">
            <Textarea
              name="anotacoes"
              defaultValue={profile?.anotacoes_rapidas || ''}
              className="flex-grow bg-gray-900 text-white border-gray-700 resize-none"
              placeholder="Digite suas anotações aqui..."
            />
            <Button type="submit" className="mt-4 self-end">Salvar Anotações</Button>
          </form>
        </div>

        <div className="card bg-gray-800 p-6 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Outra seção em breve...</p>
        </div>
      </div>
    </div>
  );
}