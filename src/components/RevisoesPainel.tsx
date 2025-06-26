// src/components/RevisoesPainel.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useTransition } from 'react';
import { type RevisionTask } from '@/lib/types';
import { updateRevisaoStatus } from '@/app/actions';
import { Button } from '@/components/ui/button';

function calculateRevisions(sessoes: any[]): { today: RevisionTask[], week: RevisionTask[], month: RevisionTask[] } {
  const todayTasks: RevisionTask[] = [], weekTasks: RevisionTask[] = [], monthTasks: RevisionTask[] = [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  sessoes.forEach(sessao => {
    if (sessao.data_estudo) {
      const addRevisionTask = (type: 'R1' | 'R7' | 'R30', dateStr: string, completed: boolean) => {
        if (!dateStr || completed) return;
        const dueDate = new Date(dateStr + 'T03:00:00');
        if (dueDate >= now && dueDate <= endOfMonth) {
          const task = { sessaoId: sessao.id, foco: sessao.foco, disciplinaNome: sessao.disciplinas.nome, disciplinaEmoji: sessao.disciplinas.emoji, type, dueDate, completed };
          if (dueDate.getTime() === now.getTime()) todayTasks.push(task);
          else if (dueDate <= endOfWeek) weekTasks.push(task);
          else monthTasks.push(task);
        }
      };
      addRevisionTask('R1', sessao.data_revisao_1, sessao.r1_concluida);
      addRevisionTask('R7', sessao.data_revisao_2, sessao.r2_concluida);
      addRevisionTask('R30', sessao.data_revisao_3, sessao.r3_concluida);
    }
  });
  const sortFn = (a: RevisionTask, b: RevisionTask) => a.dueDate.getTime() - b.dueDate.getTime();
  return { today: todayTasks.sort(sortFn), week: weekTasks.sort(sortFn), month: monthTasks.sort(sortFn) };
}

export function RevisoesPainel() {
  const [tasks, setTasks] = useState<{ today: RevisionTask[], week: RevisionTask[], month: RevisionTask[] }>({ today: [], week: [], month: [] });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getRevisions = async () => {
      setLoading(true);
      const { data } = await supabase.from('sessoes_estudo').select('*, disciplinas(nome, emoji)').eq('concluido', true);
      if (data) setTasks(calculateRevisions(data));
      setLoading(false);
    };
    getRevisions();
  }, [supabase]);

  const handleRevisionToggle = (sessaoId: number, type: 'R1' | 'R7' | 'R30') => {
    startTransition(async () => {
      await updateRevisaoStatus(sessaoId, type, true);
      setTasks(currentTasks => ({
        today: currentTasks.today.filter(t => !(t.sessaoId === sessaoId && t.type === type)),
        week: currentTasks.week.filter(t => !(t.sessaoId === sessaoId && t.type === type)),
        month: currentTasks.month.filter(t => !(t.sessaoId === sessaoId && t.type === type)),
      }));
    });
  };
  
  const RevisionList = ({ title, items, colorClass }: { title: string, items: RevisionTask[], colorClass: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-2">{title} ({items.length})</h3>
        <ul className="space-y-2">
          {items.map(task => (
            <li key={`${task.sessaoId}-${task.type}`} className={`flex justify-between items-center p-3 bg-gray-800 rounded-md border-l-4 ${colorClass}`}>
              <div>
                <p className="font-semibold">{task.foco}</p>
                <p className="text-xs text-gray-400">{task.disciplinaEmoji} {task.disciplinaNome} - Vence: {task.dueDate.toLocaleDateString('pt-BR')}</p>
              </div>
              <Button onClick={() => handleRevisionToggle(task.sessaoId, task.type)} disabled={isPending} size="sm"><i className="fas fa-check"></i></Button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading) return <p>Calculando seu calendário de revisões...</p>;

  return (
    <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
      {tasks.today.length === 0 && tasks.week.length === 0 && tasks.month.length === 0 ? (
        <p className="text-gray-400">Nenhuma revisão futura encontrada. Conclua itens no seu ciclo de estudos para começar!</p>
      ) : (
        <>
          <RevisionList title="Para Hoje" items={tasks.today} colorClass="border-red-500" />
          <RevisionList title="Próximos 7 Dias" items={tasks.week} colorClass="border-yellow-500" />
          <RevisionList title="Este Mês" items={tasks.month} colorClass="border-blue-500" />
        </>
      )}
    </div>
  );
}