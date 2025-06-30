// src/app/revisoes/page.tsx (VERSÃO DE DEBUG FINAL)

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RevisoesClient } from '@/components/RevisoesClient';
import { type EventoRevisao } from '@/lib/types';
import { addDays, startOfDay, endOfDay, isBefore, isEqual, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function RevisoesPage() {
  const supabase = createServerComponentClient({ cookies });
  // CORREÇÃO: Usando getUser()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  console.log("--- [Revisões Page] Buscando revisões no Supabase... ---");
  
  const { data: revisoes, error } = await supabase
    .from('revisoes')
    .select('*')
    .eq('user_id', user.id) // Usando user.id diretamente
    .eq('concluida', false);

  if (error) console.error('[Revisões Page] Erro ao buscar revisões:', error.message);

  console.log(`[Revisões Page] Supabase retornou ${revisoes?.length || 0} revisões.`);
  if (revisoes && revisoes.length > 0) {
    console.log("[Revisões Page] Exemplo de revisão recebida:", JSON.stringify(revisoes[0], null, 2));
  }

  const eventos: EventoRevisao[] = (revisoes || []).map(revisao => {
    let color = '#8B5CF6';
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

  const todasAsRevisoes = eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

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
        todasAsRevisoes={todasAsRevisoes}
      />
    </div>
  );
}