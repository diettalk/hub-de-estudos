'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
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
import { addStudyGoal, updateStudyGoal, updateStudyGoalValue, deleteStudyGoal } from '@/app/actions';
import { type StudyGoal } from '@/lib/types';
import { toast } from 'sonner';
// 1. CORREÇÃO: Importar os ícones que vamos usar
import { Target, Trash2, Plus, Edit, Minus, Check } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

// Sub-componente para o formulário, reutilizável para criar e editar
function GoalFormModal({ goal, onActionComplete }: { goal?: StudyGoal | null, onActionComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!goal;

  const handleSubmit = (formData: FormData) => {
    if (isEditMode) {
      formData.append('id', String(goal.id));
    }
    
    const type = formData.get('type') as string;
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    let endDate = '';

    if (type === 'weekly_hours') {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - (today.getDay() === 0 ? 7 : today.getDay())));
      endDate = endOfWeek.toISOString().split('T')[0];
    } else if (type === 'monthly_questions') {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate = endOfMonth.toISOString().split('T')[0];
    }
    
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);

    const action = isEditMode ? updateStudyGoal : addStudyGoal;

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditMode ? "Meta atualizada!" : "Nova meta adicionada!");
        onActionComplete();
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" title="Editar Meta">
            <Edit className="h-3 w-3" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Adicionar Nova Meta">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditMode ? 'Editar Meta' : 'Criar Nova Meta'}</DialogTitle></DialogHeader>
        <form action={handleSubmit}>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="title">Título da Meta</Label>
              <Input id="title" name="title" defaultValue={goal?.title || ''} placeholder="Ex: Questões de Direito Constitucional" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={goal?.type} required>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_hours">Horas Semanais</SelectItem>
                    <SelectItem value="monthly_questions">Questões no Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_value">Valor Alvo</Label>
                <Input id="target_value" name="target_value" type="number" defaultValue={goal?.target_value} placeholder="Ex: 20" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? 'A salvar...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Sub-componente para cada meta individual, agora com mais interatividade
function GoalItem({ goal }: { goal: StudyGoal }) {
    const [, startTransition] = useTransition();

    const handleDelete = () => {
        if (confirm("Tem a certeza de que deseja apagar esta meta?")) {
            startTransition(() => { deleteStudyGoal(goal.id).then(() => toast.success("Meta apagada.")); });
        }
    };

    const handleIncrement = () => {
        const newValue = goal.current_value + 1;
        startTransition(() => { updateStudyGoalValue(goal.id, newValue); });
    };

    const handleDecrement = () => {
        const newValue = Math.max(0, goal.current_value - 1); // Garante que não fica negativo
        startTransition(() => { updateStudyGoalValue(goal.id, newValue); });
    };

    const handleComplete = () => {
        startTransition(() => { 
            updateStudyGoalValue(goal.id, goal.target_value).then(() => toast.success("Meta concluída!"));
        });
    };

    const percentage = goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0;

    return (
        <div className="group">
            <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium truncate">{goal.title}</p>
                <div className="flex items-center">
                    <p className="text-sm text-muted-foreground mr-2">
                        {goal.current_value} / {goal.target_value}
                    </p>
                    {/* 2. CORREÇÃO: Botões de ação visíveis no hover */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Decrementar (-1)" onClick={handleDecrement}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Incrementar (+1)" onClick={handleIncrement}>
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Concluir Meta" onClick={handleComplete}>
                            <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <GoalFormModal goal={goal} onActionComplete={() => {}} />
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Apagar Meta" onClick={handleDelete}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                    </div>
                </div>
            </div>
            <Progress value={percentage} />
        </div>
    );
}

// Componente principal do Card de Metas
export function MetasCard({ goals }: { goals: StudyGoal[] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Metas de Estudo</h2>
        </div>
        <GoalFormModal onActionComplete={() => {}} />
      </div>
      <div className="flex-grow space-y-4 overflow-y-auto">
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-4">Nenhuma meta definida. Clique em '+' para criar uma.</p>
        )}
        {goals.map(goal => <GoalItem key={goal.id} goal={goal} />)}
      </div>
    </>
  );
}
