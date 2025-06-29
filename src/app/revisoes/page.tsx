// src/app/revisoes/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RevisoesClient, EventoRevisao } from '@/components/RevisoesClient';
import { subDays, addDays, startOfDay, endOfDay, isBefore, isEqual, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function RevisoesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: sessoes, error } = await supabase
    .from('sessoes_estudo')
    .select('id, foco, data_revisao_1, r1_concluida, data_revisao_2, r2_concluida, data_revisao_3, r3_concluida')
    .or('r1_concluida.is.false,r2_concluida.is.false,r3_concluida.is.false');

  if (error) {
    console.error('Erro ao buscar revisões:', error);
  }

  const hoje = startOfDay(new Date());
  const seteDiasAtras = subDays(hoje, 7); // Aumentado para pegar mais atrasadas se necessário
  const proximosSeteDias = endOfDay(addDays(hoje, 7));
  
  const eventos: EventoRevisao[] = [];

  sessoes?.forEach(r => {
    if (r.data_revisao_1 && !r.r1_concluida) {
      eventos.push({ id: r.id, title: r.foco, type: 'R1', completed: r.r1_concluida, color: '#EF4444', data: r.data_revisao_1 });
    }
    if (r.data_revisao_2 && !r.r2_concluida) {
      eventos.push({ id: r.id, title: r.foco, type: 'R7', completed: r.r2_concluida, color: '#F59E0B', data: r.data_revisao_2 });
    }
    if (r.data_revisao_3 && !r.r3_concluida) {
      eventos.push({ id: r.id, title: r.foco, type: 'R30', completed: r.r3_concluida, color: '#10B981', data: r.data_revisao_3 });
    }
  });
  
  // Categoriza os eventos
  const atrasadas = eventos.filter(e => isBefore(startOfDay(new Date(e.data + 'T03:00:00')), hoje)).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const paraHoje = eventos.filter(e => isEqual(startOfDay(new Date(e.data + 'T03:00:00')), hoje));
  const proximos7Dias = eventos.filter(e => {
    const dataEvento = startOfDay(new Date(e.data + 'T03:00:00'));
    return isAfter(dataEvento, hoje) && isBefore(dataEvento, proximosSeteDias);
  }).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  
  return (
    <div>
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Painel de Controle de Revisões</h1>
        <p className="text-gray-400">Sua visão completa das revisões passadas, presentes e futuras.</p>
      </header>
      <RevisoesClient
        atrasadas={atrasadas}
        hoje={paraHoje}
        proximos7Dias={proximos7Dias}
      />
    </div>
  );
}