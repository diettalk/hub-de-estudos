'use client';

import { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Archive, Trash2, CheckCircle2 } from "lucide-react";
import { addTarefa, updateTarefaStatus, deleteTarefa } from '@/app/actions';
import { type Tarefa } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Componente para um item individual da lista de tarefas
const TarefaItem = ({ tarefa }: { tarefa: Tarefa }) => {
  const [, startTransition] = useTransition();

  const handleStatusChange = (newStatus: 'pendente' | 'concluida' | 'arquivada') => {
    startTransition(() => {
      updateTarefaStatus(tarefa.id, newStatus).then(result => {
        if (result?.error) toast.error(result.error);
      });
    });
  };

  const handleDelete = () => {
    if (confirm(`Tem a certeza de que deseja apagar a tarefa "${tarefa.title}"?`)) {
      startTransition(() => {
        deleteTarefa(tarefa.id).then(() => {
          toast.success("Tarefa apagada.");
        });
      });
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary rounded-md group">
      <Checkbox
        checked={tarefa.status === 'conclui­da'}
        onCheckedChange={(checked) => {
          handleStatusChange(checked ? 'concluida' : 'pendente');
        }}
      />
      <div className="flex-grow">
        <p className={`${tarefa.status === 'conclui­da' ? 'line-through text-muted-foreground' : ''}`}>
          {tarefa.title}
        </p>
        {tarefa.due_date && (
          <p className="text-xs text-muted-foreground">
            Vencimento: {new Date(tarefa.due_date + 'T03:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        {tarefa.status !== 'conclui­da' && (
          <Button variant="ghost" size="icon" title="Marcar como Concluída" onClick={() => handleStatusChange('conclui­da')}>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </Button>
        )}
        {tarefa.status !== 'arquivada' && (
          <Button variant="ghost" size="icon" title="Arquivar Tarefa" onClick={() => handleStatusChange('arquivada')}>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        <Button variant="ghost" size="icon" title="Apagar Tarefa" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};


interface TarefasClientProps {
  tarefas: Tarefa[];
}

export function TarefasClient({ tarefas: initialTarefas }: TarefasClientProps) {
  const [tarefas, setTarefas] = useState(initialTarefas);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTarefas(initialTarefas);
  }, [initialTarefas]);

  const pendentes = tarefas.filter(t => t.status === 'pendente');
  const concluidas = tarefas.filter(t => t.status === 'conclui­da');
  const arquivadas = tarefas.filter(t => t.status === 'arquivada');

  const formAction = (formData: FormData) => {
    startTransition(() => {
      addTarefa(formData).then(() => {
        (document.getElementById('task-form') as HTMLFormElement)?.reset();
      });
    });
  };

  return (
    <div className="bg-card p-6 rounded-lg border">
      <form action={formAction} id="task-form" className="flex flex-col sm:flex-row items-end gap-4 mb-6 pb-6 border-b">
        <div className="flex-grow w-full">
          <Label htmlFor="title" className="text-xs font-semibold">Nova Tarefa</Label>
          <Input name="title" id="title" required className="bg-input"/>
        </div>
        <div className='w-full sm:w-auto'>
          <Label htmlFor="due_date" className="text-xs font-semibold">Vencimento</Label>
          <Input name="due_date" id="due_date" type="date" className="bg-input"/>
        </div>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">{isPending ? 'A adicionar...' : 'Adicionar'}</Button>
      </form>
      
      <Tabs defaultValue="pendentes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
          <TabsTrigger value="arquivadas">Arquivadas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">
          <div className="space-y-2 mt-4">
            {pendentes.length > 0 ? pendentes.map(t => <TarefaItem key={t.id} tarefa={t} />) : <p className="text-muted-foreground text-center py-4">Nenhuma tarefa pendente.</p>}
          </div>
        </TabsContent>
        <TabsContent value="concluidas">
          <div className="space-y-2 mt-4">
            {concluidas.length > 0 ? concluidas.map(t => <TarefaItem key={t.id} tarefa={t} />) : <p className="text-muted-foreground text-center py-4">Nenhuma tarefa concluída.</p>}
          </div>
        </TabsContent>
        <TabsContent value="arquivadas">
          <div className="space-y-2 mt-4">
            {arquivadas.length > 0 ? arquivadas.map(t => <TarefaItem key={t.id} tarefa={t} />) : <p className="text-muted-foreground text-center py-4">Nenhuma tarefa arquivada.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
