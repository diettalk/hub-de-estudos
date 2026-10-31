import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { isToday, parseISO } from 'date-fns';
import {
  type SessaoEstudo,
  type Tarefa,
  type Revisao,
  type StudyGoal,
  type Lembrete,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    sessoesRes,
    tarefasRes,
    revisoesRes,
    lembretesRes,
    goalsRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from('ciclo_sessoes')
      .select('*')
      .eq('user_id', user.id)
      .order('ordem', { ascending: true }),
    supabase
      .from('tarefas')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('revisoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data_revisao', { ascending: true }),
    supabase
      .from('lembretes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: true }),
    supabase
      .from('study_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const todasSessoes = (sessoesRes.data as SessaoEstudo[]) || [];
  const tarefasPendentes = (tarefasRes.data as Tarefa[]) || [];
  const revisoes = (revisoesRes.data as Revisao[]) || [];
  const lembretes = (lembretesRes.data as Lembrete[]) || [];
  const studyGoals = (goalsRes.data as StudyGoal[]) || [];

  const sessoesDeHoje = todasSessoes.filter((s) => {
    if (!s.data_estudo || s.concluida) return false;
    try {
      return isToday(parseISO(s.data_estudo));
    } catch {
      return false;
    }
  });

  const sessoesConcluidasTotal = todasSessoes.filter((s) => s.concluida).length;

  const revisoesDeHoje = revisoes.filter((r) => {
    if (!r.data_revisao || r.concluida) return false;
    try {
      return isToday(parseISO(r.data_revisao));
    } catch {
      return false;
    }
  });

  const primeiroNome =
    profileRes.data?.full_name?.trim().split(' ')[0] ||
    user.email?.split('@')[0] ||
    'Hélio';

  const dashboardData = {
    todasSessoes,
    tarefasPendentes,
    revisoes,
    lembretes,
    sessoesDeHoje,
    sessoesConcluidasTotal,
    revisoesDeHoje,
    studyGoals,
    userName: primeiroNome,
  };

  return <DashboardClient data={dashboardData} />;
}