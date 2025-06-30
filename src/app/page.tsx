// src/app/page.tsx (VERSÃO CORRIGIDA)

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { addAnotacao } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { AnotacaoItem } from '@/components/AnotacaoItem';
import { format } from 'date-fns'; // Usaremos para formatar a data de hoje

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Obtém a data de hoje no formato YYYY-MM-DD, que é como o Supabase armazena o tipo 'date'
  const hoje = format(new Date(), 'yyyy-MM-dd');

  // CORREÇÃO: Buscamos os 3 dados corretamente em paralelo.
  const [
    { count: tarefasPendentes },
    { count: sessoesHoje },
    { count: revisoesHoje },
    { data: anotacoes }
  ] = await Promise.all([
    // 1. Busca tarefas onde 'completed' é false
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('completed', false).eq('user_id', user.id),
    // 2. Busca na tabela 'ciclo_sessoes' onde a data do estudo é hoje
    supabase.from('ciclo_sessoes').select('*', { count: 'exact', head: true }).like('data_estudo', `${hoje}%`).eq('user_id', user.id),
    // 3. Busca na tabela 'revisoes' onde a data da revisão é hoje
    supabase.from('revisoes').select('*', { count: 'exact', head: true }).eq('data_revisao', hoje).eq('concluida', false).eq('user_id', user.id),
    // 4. Busca as anotações como antes
    supabase.from('anotacoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);

  return (
    <div>
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400">Bem-vindo(a) de volta! Aqui está um resumo do seu progresso.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CORREÇÃO: Os cards agora exibem os dados corretos */}
        <div className="card bg-gray-800 p-6 rounded-lg"><h3 className="font-bold text-lg mb-2">Sessões de Hoje</h3><p className="text-4xl font-bold text-blue-400">{sessoesHoje ?? 0}</p></div>
        <div className="card bg-gray-800 p-6 rounded-lg"><h3 className="font-bold text-lg mb-2">Tarefas Pendentes</h3><p className="text-4xl font-bold text-yellow-400">{tarefasPendentes ?? 0}</p></div>
        <div className="card bg-gray-800 p-6 rounded-lg"><h3 className="font-bold text-lg mb-2">Revisões para Hoje</h3><p className="text-4xl font-bold text-green-400">{revisoesHoje ?? 0}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-gray-800 p-6 rounded-lg flex flex-col">
          <h3 className="font-bold text-lg mb-4">Anotações Rápidas</h3>
          <form action={addAnotacao} className="flex gap-2 mb-4">
            <Input name="content" className="bg-gray-900 border-gray-700" placeholder="Digite uma nova nota..." required autoComplete="off" />
            <Button type="submit">Adicionar</Button>
          </form>
          <div className="space-y-2 overflow-y-auto flex-grow max-h-[25vh]">
            {anotacoes && anotacoes.length > 0 ? (
              anotacoes.map((nota) => (
                <AnotacaoItem key={nota.id} nota={nota} />
              ))
            ) : (
              <p className="text-gray-500 text-center pt-8">Nenhuma anotação ainda.</p>
            )}
          </div>
        </div>
        <PomodoroTimer />
      </div>
    </div>
  );
}