// src/app/revisoes/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// O componente client continua o mesmo, apenas os dados que passamos para ele vão mudar
import { RevisoesClient, type EventoRevisao } from '@/components/RevisoesClient'; 
// Usaremos as mesmas funções de data, mas de forma mais robusta
import { addDays, startOfDay, endOfDay, isBefore, isEqual, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function RevisoesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // 1. BUSCAR DADOS DO LUGAR CERTO
  // Buscamos diretamente da tabela 'revisoes', apenas as que não foram concluídas.
  const { data: revisoes, error } = await supabase
    .from('revisoes')
    .select('*') // Pega todas as colunas da revisão
    .eq('user_id', session.user.id)
    .eq('concluida', false); // Apenas as revisões pendentes!

  if (error) {
    console.error('Erro ao buscar revisões:', error.message);
    // Você pode renderizar uma mensagem de erro aqui se preferir
  }

  // 2. TRANSFORMAR OS DADOS PARA O FORMATO QUE O COMPONENTE ESPERA
  // Este passo agora é muito mais simples.
  const eventos: EventoRevisao[] = (revisoes || []).map(revisao => {
    // Define uma cor baseada no tipo de revisão para ficar mais visual
    let color = '#8B5CF6'; // Roxo padrão
    if (revisao.tipo_revisao === '24h') color = '#EF4444'; // Vermelho
    if (revisao.tipo_revisao === '7 dias') color = '#F59E0B'; // Laranja
    if (revisao.tipo_revisao === '30 dias') color = '#10B981'; // Verde

    return {
      id: revisao.id, // O ID da própria revisão, para marcá-la como concluída
      // Um título mais descritivo para o card de revisão
      title: `${revisao.materia_nome || 'Revisão'}: ${revisao.foco_sugerido}`,
      type: revisao.tipo_revisao,
      completed: revisao.concluida,
      color: color,
      data: revisao.data_revisao, // A data já vem no formato correto
      sessao_id: revisao.ciclo_sessao_id // Passamos o ID da sessão original, pode ser útil
    };
  });

  // 3. SEPARAR OS EVENTOS EM CATEGORIAS (LÓGICA DE DATA CORRIGIDA)
  // Esta lógica agora é mais segura e não depende de truques com fuso horário.
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
      {/* O componente client não muda, ele apenas receberá os dados corretos agora */}
      <RevisoesClient
        atrasadas={atrasadas}
        hoje={paraHoje}
        proximos7Dias={proximos7Dias}
      />
    </div>
  );
}