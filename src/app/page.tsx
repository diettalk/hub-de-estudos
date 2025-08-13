import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { startOfToday, isToday, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Buscas de dados existentes
  const { data: sessoes } = await supabase.from('ciclo_sessoes').select('*').eq('user_id', session.user.id);
  const { data: tarefas } = await supabase.from('tarefas').select('*').eq('user_id', session.user.id);
  const { data: anotacoes } = await supabase.from('anotacoes').select('*').eq('user_id', session.user.id);
  const { data: revisoes } = await supabase.from('revisoes').select('*').eq('user_id', session.user.id);
  
  // --- NOVA BUSCA DE DADOS AQUI ---
  const { data: studyGoals } = await supabase.from('study_goals').select('*').eq('user_id', session.user.id);

  const hoje = startOfToday();
  const sessoesDeHoje = sessoes?.filter(s => s.data_estudo && isToday(parseISO(s.data_estudo))) || [];
  const revisoesDeHoje = revisoes?.filter(r => isToday(parseISO(r.data_revisao))) || [];
  
  const dashboardData = {
    todasSessoes: sessoes || [],
    tarefasPendentes: tarefas?.filter(t => !t.completed) || [],
    anotacoes: anotacoes || [],
    sessoesDeHoje,
    sessoesConcluidasTotal: sessoes?.filter(s => s.concluida).length || 0,
    revisoesDeHoje,
    studyGoals: studyGoals || [], // Adiciona as metas aos dados
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
