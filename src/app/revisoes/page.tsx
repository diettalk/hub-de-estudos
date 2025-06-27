'use client'; // CORREÇÃO: Adicionado para permitir interatividade e hooks

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useCallback, useTransition } from 'react'; // CORREÇÃO: Adicionado useTransition
import 'react-day-picker/dist/style.css';
import { updateRevisaoStatus } from '@/app/actions';

type Revisao = {
  id: number;
  foco: string;
  data_revisao_1: string | null;
  r1_concluida: boolean;
  data_revisao_2: string | null;
  r2_concluida: boolean;
  data_revisao_3: string | null;
  r3_concluida: boolean;
};

type EventoRevisao = {
  id: number;
  title: string;
  type: 'R1' | 'R7' | 'R30';
  completed: boolean;
  color: string;
};

export default function RevisoesPage() {
  const [revisoesHoje, setRevisoesHoje] = useState<EventoRevisao[]>([]);
  const [revisoesAtrasadas, setRevisoesAtrasadas] = useState<EventoRevisao[]>([]);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  const fetchRevisoes = useCallback(async () => {
    const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // CORREÇÃO AQUI: A sintaxe do .or() foi completamente ajustada
    // para usar and() em cada condição, que é o formato correto do Supabase.
    const { data, error } = await supabase
      .from('sessoes_estudo')
      .select('id, foco, data_revisao_1, r1_concluida, data_revisao_2, r2_concluida, data_revisao_3, r3_concluida')
      .or(
        `and(data_revisao_1.lte.${hoje},r1_concluida.is.false),and(data_revisao_2.lte.${hoje},r2_concluida.is.false),and(data_revisao_3.lte.${hoje},r3_concluida.is.false)`
      );

    if (error) {
      console.error('Erro ao buscar revisões:', error);
      return;
    }

    const eventosHoje: EventoRevisao[] = [];
    const eventosAtrasados: EventoRevisao[] = [];

    data?.forEach((r: Revisao) => {
      // Revisão 1
      if (r.data_revisao_1 && !r.r1_concluida) {
        if (r.data_revisao_1 === hoje) {
          eventosHoje.push({ id: r.id, title: r.foco, type: 'R1', completed: false, color: '#EF4444' });
        } else if (r.data_revisao_1 < hoje) {
          eventosAtrasados.push({ id: r.id, title: r.foco, type: 'R1', completed: false, color: '#EF4444' });
        }
      }
      // Revisão 2 (R7)
      if (r.data_revisao_2 && !r.r2_concluida) {
        if (r.data_revisao_2 === hoje) {
          eventosHoje.push({ id: r.id, title: r.foco, type: 'R7', completed: false, color: '#F59E0B' });
        } else if (r.data_revisao_2 < hoje) {
          eventosAtrasados.push({ id: r.id, title: r.foco, type: 'R7', completed: false, color: '#F59E0B' });
        }
      }
      // Revisão 3 (R30)
      if (r.data_revisao_3 && !r.r3_concluida) {
        if (r.data_revisao_3 === hoje) {
          eventosHoje.push({ id: r.id, title: r.foco, type: 'R30', completed: false, color: '#10B981' });
        } else if (r.data_revisao_3 < hoje) {
          eventosAtrasados.push({ id: r.id, title: r.foco, type: 'R30', completed: false, color: '#10B981' });
        }
      }
    });

    setRevisoesHoje(eventosHoje);
    setRevisoesAtrasadas(eventosAtrasados);
  }, [supabase]);

  useEffect(() => {
    fetchRevisoes();
    const channel = supabase.channel('realtime-revisoes').on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes_estudo' }, fetchRevisoes).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRevisoes, supabase]);

  const handleToggle = (id: number, type: 'R1' | 'R7' | 'R30', completed: boolean) => {
    startTransition(async () => {
      await updateRevisaoStatus(id, type, completed);
    });
  };

  const renderRevisaoList = (revisoes: EventoRevisao[]) => {
    if (revisoes.length === 0) {
      return <p className="text-gray-500">Nenhuma revisão nesta categoria.</p>;
    }
    return (
      <div className="space-y-3">
        {revisoes.map((revisao, index) => (
          <div key={`${revisao.id}-${revisao.type}-${index}`} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0"
              checked={revisao.completed}
              onChange={() => handleToggle(revisao.id, revisao.type, !revisao.completed)}
              disabled={isPending}
            />
            <div className="flex-grow">
              <p className={revisao.completed ? 'line-through text-gray-500' : ''}>{revisao.title}</p>
            </div>
            <span
              className="text-xs font-bold px-2 py-1 rounded-full"
              style={{ backgroundColor: revisao.color, color: 'white' }}
            >
              {revisao.type}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Painel de Revisões</h1>
        <p className="text-gray-400">Suas revisões espaçadas que precisam de atenção.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Para Hoje</h2>
          {renderRevisaoList(revisoesHoje)}
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-yellow-400">Atrasadas</h2>
          {renderRevisaoList(revisoesAtrasadas)}
        </div>
      </div>
    </div>
  );
}