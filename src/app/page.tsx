// src/app/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AnotacoesRapidasCard } from '@/components/AnotacoesRapidasCard';
import { RevisoesHojeCard } from '@/components/RevisoesHojeCard';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { Activity, ListChecks, CalendarCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Um componente simples para os cards, para evitar repetição
function DashboardCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-lg p-6 flex flex-col">
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

  const hoje = new Date().toISOString().split('T')[0];
  const { count: sessoesHoje } = await supabase.from('ciclo_sessoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('data_estudo', hoje);
  const { count: tarefasPendentes } = await supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', false);
  const { count: revisoesHoje } = await supabase.from('revisoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('data_revisao', hoje).eq('concluida', false);
  const { data: anotacoes } = await supabase.from('anotacoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo(a) de volta! Aqui está um resumo do seu progresso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard title="Sessões de Hoje" icon={Activity}>
            <p className="text-5xl font-bold text-primary">{sessoesHoje ?? 0}</p>
        </DashboardCard>
        
        <DashboardCard title="Tarefas Pendentes" icon={ListChecks}>
            <p className="text-5xl font-bold text-primary">{tarefasPendentes ?? 0}</p>
        </DashboardCard>

        <RevisoesHojeCard count={revisoesHoje ?? 0} />
        
        <div className="lg:col-span-2">
            <AnotacoesRapidasCard anotacoes={anotacoes || []} />
        </div>

        <PomodoroTimer />
      </div>
    </div>
  );
}
