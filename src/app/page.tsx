// src/app/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import RevisoesPainel from '@/components/RevisoesPainel';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { addAnotacao, deleteAnotacao } from '@/app/actions'; // Importa as novas ações
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Busca os dados em paralelo para mais performance
  const [
    { count: tarefasPendentes },
    { count: sessoesHoje },
    { data: anotacoes }
  ] = await Promise.all([
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('concluida', false),
    supabase.from('sessoes_estudo').select('*', { count: 'exact', head: true }).eq('data_estudo', new Date().toISOString().split('T')[0]),
    supabase.from('anotacoes').select('*').order('created_at', { ascending: false })
  ]);

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
        {/* NOVO CARD DE ANOTAÇÕES RÁPIDAS */}
        <div className="card bg-gray-800 p-6 rounded-lg flex flex-col">
          <h3 className="font-bold text-lg mb-4">Anotações Rápidas</h3>
          
          <form action={addAnotacao} className="flex gap-2 mb-4">
            <Input
              name="content"
              className="bg-gray-900 border-gray-700"
              placeholder="Digite uma nova nota..."
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>

          <div className="space-y-2 overflow-y-auto flex-grow max-h-[25vh]">
            {anotacoes && anotacoes.length > 0 ? (
              anotacoes.map((nota) => (
                <div key={nota.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-md">
                  <p className="text-sm">{nota.content}</p>
                  <form action={deleteAnotacao}>
                    <input type="hidden" name="id" value={nota.id} />
                    <Button type="submit" variant="ghost" size="icon" className="h-6 w-6">
                      <i className="fas fa-times text-xs text-red-500 hover:text-red-400"></i>
                    </Button>
                  </form>
                </div>
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