// src/app/tarefas/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addTarefa, toggleTarefa, deleteTarefa } from '@/app/actions';

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  // Função para buscar e atualizar as tarefas
  const fetchTarefas = async () => {
    const { data } = await supabase.from('tarefas').select('*').order('due_date');
    setTarefas(data ?? []);
  };

  useEffect(() => {
    fetchTarefas();
    // Realtime: Ouve por qualquer mudança na tabela de tarefas e recarrega a lista
    const channel = supabase.channel('realtime-tarefas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, 
        () => fetchTarefas()
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const pendingTasks = tarefas.filter(t => !t.completed);
  const completedTasks = tarefas.filter(t => t.completed);

  // Componente para renderizar a lista de tarefas (evita repetição)
  const TaskList = ({ tasks }: { tasks: any[] }) => (
    <ul className="space-y-2">
        {tasks.map(task => (
            <li key={task.id} className={`flex items-center gap-3 p-3 bg-gray-800 rounded-md ${task.completed ? 'text-gray-500 line-through' : ''}`}>
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-blue-400" 
                       defaultChecked={task.completed} 
                       onChange={() => startTransition(() => toggleTarefa(task.id, task.completed))}/>
                <span className="flex-grow">{task.title}</span>
                <span className="text-xs text-gray-400">{new Date(task.due_date + 'T03:00:00').toLocaleDateString('pt-BR')}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startTransition(() => deleteTarefa(task.id))}>
                    <i className="fas fa-times text-xs text-red-500"></i>
                </Button>
            </li>
        ))}
    </ul>
  );

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">Gerenciador de Tarefas</h1>
      </header>
      <div className="card bg-gray-800/50 p-6 rounded-lg border border-gray-700">
        <form action={(formData) => {
          startTransition(() => { addTarefa(formData) });
          (document.getElementById('task-form') as HTMLFormElement)?.reset();
        }} id="task-form" className="flex items-end gap-4 mb-6 pb-6 border-b border-gray-700">
          <div className="flex-grow">
            <Label htmlFor="title" className="text-xs font-semibold">Nova Tarefa</Label>
            <Input name="title" id="title" required className="bg-gray-700"/>
          </div>
          <div>
            <Label htmlFor="due_date" className="text-xs font-semibold">Vencimento</Label>
            <Input name="due_date" id="due_date" type="date" required className="bg-gray-700"/>
          </div>
          <Button type="submit" disabled={isPending}>{isPending ? '...' : 'Adicionar'}</Button>
        </form>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-bold mb-4">Pendentes ({pendingTasks.length})</h3>
                {pendingTasks.length > 0 ? <TaskList tasks={pendingTasks} /> : <p className="text-gray-500">Nenhuma tarefa pendente!</p>}
            </div>
            <div>
                <h3 className="text-xl font-bold mb-4">Concluídas ({completedTasks.length})</h3>
                {completedTasks.length > 0 ? <TaskList tasks={completedTasks} /> : <p className="text-gray-500">Nenhuma tarefa concluída ainda.</p>}
            </div>
        </div>
      </div>
    </div>
  );
}