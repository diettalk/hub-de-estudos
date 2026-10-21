// src/app/page.tsx

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { startOfToday, isToday, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // CORREÇÃO 2: Uso do getUser() recomendado pelo Supabase
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // CORREÇÃO 3: Trocamos session.user.id por user.id
  const sessoesPromise = supabase.from('ciclo_sessoes').select('*').eq('user_id', user.id);
  const tarefasPromise = supabase.from('tarefas').select('*').eq('user_id', user.id);
  const revisoesPromise = supabase.from('revisoes').select('*').eq('user_id', user.id);
  const studyGoalsPromise = supabase.from('study_goals').select('*').eq('user_id', user.id);
  const lembretesPromise = supabase.from('lembretes').select('*').eq('user_id', user.id);

  let [
    { data: sessoes },
    { data: tarefas },
    { data: revisoes },
    { data: studyGoals },
    { data: lembretes },
  ] = await Promise.all([
    sessoesPromise, 
    tarefasPromise, 
    revisoesPromise, 
    studyGoalsPromise, 
    lembretesPromise
  ]);

  const hoje = startOfToday();
  const sessoesDeHoje = sessoes?.filter(s => s.data_estudo && isToday(parseISO(s.data_estudo))) || [];
  const revisoesDeHoje = revisoes?.filter(r => r.data_revisao && isToday(parseISO(r.data_revisao))) || [];
  
  const dashboardData = {
    todasSessoes: sessoes || [],
    tarefasPendentes: tarefas?.filter(t => !t.completed) || [],
    revisoes: revisoes || [], // Passa TODAS as revisões
    lembretes: lembretes || [], // Passa TODOS os lembretes
    sessoesDeHoje,
    sessoesConcluidasTotal: sessoes?.filter(s => s.concluida).length || 0,
    revisoesDeHoje,
    studyGoals: studyGoals || [],
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo(a) de volta! Aqui está um resumo do seu progresso.</p>
      </header>
      <DashboardClient data={dashboardData} />
    </div>
  );
}