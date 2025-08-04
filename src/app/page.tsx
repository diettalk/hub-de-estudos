// src/app/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AnotacoesRapidasCard } from '@/components/AnotacoesRapidasCard';
import { RevisoesHojeCard } from '@/components/RevisoesHojeCard';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { Activity, ListChecks, CalendarCheck, CheckCircle } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

// Um componente simples para os cards, para evitar repetição
function DashboardCard({ title, icon: Icon, children, className }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border rounded-lg p-6 flex flex-col ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // --- LÓGICA DE DADOS CORRIGIDA ---
  const hojeISO = new Date().toISOString().split('T')[0];

  // Busca todos os dados necessários em paralelo
  const [
    sessoesResult,
    tarefasResult,
    revisoesResult,
    anotacoesResult
  ] = await Promise.all([
    supabase.from('ciclo_sessoes').select('*').eq('user_id', user.id).eq('concluida', true),
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', false),
    supabase.from('revisoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('data_revisao', hojeISO).eq('concluida', false),
    supabase.from('anotacoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);

  const sessoesConcluidas = sessoesResult.data || [];
  const tarefasPendentes = tarefasResult.count ?? 0;
  const revisoesHoje = revisoesResult.count ?? 0;
  const anotacoes = anotacoesResult.data || [];

  // Filtra as sessões concluídas que foram estudadas HOJE
  const sessoesDeHoje = sessoesConcluidas.filter(sessao => sessao.data_estudo && isToday(parseISO(sessao.data_estudo)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo(a) de volta! Aqui está um resumo do seu progresso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card Corrigido: Sessões de Hoje */}
        <DashboardCard title="Sessões de Hoje" icon={Activity}>
            <p className="text-5xl font-bold text-primary">{sessoesDeHoje.length}</p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1 max-h-20 overflow-y-auto">
              {sessoesDeHoje.map(s => <li key={s.id} className="truncate">✓ {s.materia_nome}</li>)}
            </ul>
        </DashboardCard>
        
        {/* Novo Card: Sessões Concluídas (Total) */}
        <DashboardCard title="Sessões Concluídas (Total)" icon={CheckCircle}>
            <p className="text-5xl font-bold">{sessoesConcluidas.length}</p>
        </DashboardCard>

        <DashboardCard title="Tarefas Pendentes" icon={ListChecks}>
            <p className="text-5xl font-bold">{tarefasPendentes}</p>
        </DashboardCard>

        <RevisoesHojeCard count={revisoesHoje} />
        
        <div className="md:col-span-2 lg:col-span-2">
            <AnotacoesRapidasCard anotacoes={anotacoes} />
        </div>

        <div className="md:col-span-2 lg:col-span-2">
            <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
