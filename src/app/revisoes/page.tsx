// src/app/revisoes/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RevisoesClient } from '@/components/RevisoesClient';
// ***** CORREÇÃO: Importamos o tipo do arquivo central *****
import { type EventoRevisao } from '@/lib/types';
import { addDays, startOfDay, endOfDay, isBefore, isEqual, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function RevisoesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: revisoes, error } = await supabase
    .from('revisoes')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('concluida', false);

  if (error) {
    console.error('Erro ao buscar revisões:', error.message);
  }

  const eventos: EventoRevisao[] = (revisoes || []).map(revisao => {
    let color = '#8B5CF6'; // Roxo padrão
    if (revisao.tipo_revisao === '24h') color = '#EF4444';
    if (revisao.tipo_revisao === '7 dias') color = '#F59E0B';
    if (revisao.tipo_revisao === '30 dias') color = '#10B981';

    return {
      id: revisao.id,
      title: `${revisao.materia_nome || 'Revisão'}: ${revisao.foco_sugerido || 'Tópico não definido'}`,
      type: revisao.tipo_revisao,
      completed: revisao.concluida,
      color: color,
      data: revisao.data_revisao,
      sessao_id: revisao.ciclo_sessao_id
    };
  });

  const hoje = startOfDay(new Date());
  const limiteProximosDias = endOfDay(addDays(hoje, 7));

  const atrasadas = eventos
    .filter(e => isBefore(startOfDay(new Date(e.data)), hoje))
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const paraHoje = eventos
    .filter(e => isEqual(startOfDay(new Date(e.data)), hoje));

  const proximos7Dias = eventos
    .filter(e => {
      const dataEvento = startOfDay(new Date(e.data));
      return isAfter(dataEvento, hoje) && isBefore(dataEvento, limiteProximosDias);
    })
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

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