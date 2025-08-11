// src/app/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isToday, parseISO } from 'date-fns';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    sessoesResult,
    tarefasResult,
    revisoesResult,
    anotacoesResult
  ] = await Promise.all([
    supabase.from('ciclo_sessoes').select('*').eq('user_id', user.id),
    supabase.from('tarefas').select('*').eq('user_id', user.id).eq('completed', false),
    supabase.from('revisoes').select('*').eq('user_id', user.id).eq('concluida', false),
    supabase.from('anotacoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);

  const todasSessoes = sessoesResult.data || [];
  const tarefasPendentes = tarefasResult.data || [];
  const revisoesPendentes = revisoesResult.data || [];
  const anotacoes = anotacoesResult.data || [];

  const sessoesDeHoje = todasSessoes.filter(s => s.data_estudo && isToday(parseISO(s.data_estudo)));
  const sessoesConcluidasTotal = todasSessoes.filter(s => s.concluida).length;
  const revisoesDeHoje = revisoesPendentes.filter(r => r.data_revisao && isToday(parseISO(r.data_revisao)));

  const dashboardData = {
    todasSessoes,
    tarefasPendentes,
    revisoesPendentes,
    anotacoes,
    sessoesDeHoje,
    sessoesConcluidasTotal,
    revisoesDeHoje
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo(a) de volta! Aqui está um resumo do seu progresso.</p>
      </div>
      
      <DashboardClient data={dashboardData} />
    </div>
  );
}
