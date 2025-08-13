'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addStudyGoal, deleteStudyGoal } from '@/app/actions';
import { type StudyGoal } from '@/lib/types';
import { toast } from 'sonner';
import { Target, Trash2, Plus } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

// Sub-componente para o formulário de criação de metas
function GoalFormModal({ onGoalAdded }: { onGoalAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    // Adiciona as datas de início e fim com base na seleção
    const type = formData.get('type') as string;
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    let endDate = '';

    if (type === 'weekly_hours') {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      endDate = endOfWeek.toISOString().split('T')[0];
    } else if (type === 'monthly_questions') {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate = endOfMonth.toISOString().split('T')[0];
    }
    
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);

    startTransition(async () => {
      const result = await addStudyGoal(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Nova meta adicionada com sucesso!");
        onGoalAdded();
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar Nova Meta</DialogTitle></DialogHeader>
        <form action={handleSubmit}>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="title">Título da Meta</Label>
              <Input id="title" name="title" placeholder="Ex: Questões de Direito Constitucional" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" required>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_hours">Horas Semanais</SelectItem>
                    <SelectItem value="monthly_questions">Questões no Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_value">Valor Alvo</Label>
                <Input id="target_value" name="target_value" type="number" placeholder="Ex: 20" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? 'A criar...' : 'Criar Meta'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// Componente principal do Card de Metas
export function MetasCard({ goals }: { goals: StudyGoal[] }) {
  const [, startTransition] = useTransition();

  const handleDelete = (id: number) => {
    if (confirm("Tem a certeza de que deseja apagar esta meta?")) {
      startTransition(async () => {
        await deleteStudyGoal(id);
        toast.success("Meta apagada.");
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Metas de Estudo</h2>
        </div>
        <GoalFormModal onGoalAdded={() => {}} />
      </div>
      <div className="flex-grow space-y-4 overflow-y-auto">
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-4">Nenhuma meta definida. Clique em '+' para criar uma.</p>
        )}
        {goals.map(goal => {
          const percentage = goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
          return (
            <div key={goal.id} className="group">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium truncate">{goal.title}</p>
                <div className="flex items-center">
                  <p className="text-sm text-muted-foreground">{goal.current_value} / {goal.target_value}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <Progress value={percentage} />
            </div>
          )
        })}
      </div>
    </>
  );
}
