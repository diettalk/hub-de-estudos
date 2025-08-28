'use client';

import { useState, useTransition } from 'react';
import { type StudyGoal } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addStudyGoal, updateStudyGoal, deleteStudyGoal, updateStudyGoalValue } from '@/app/actions';
import { toast } from 'sonner';
import { Target, PlusCircle, Trash2, Edit, Plus, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MetasCard({ goals }: { goals: StudyGoal[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openGoal, setOpenGoal] = useState<StudyGoal | null>(null);
  const [isNewGoalDialogOpen, setIsNewGoalDialogOpen] = useState(false);

  // Função para lidar com o envio do formulário de criação/edição
  const handleFormSubmit = (formData: FormData) => {
    startTransition(async () => {
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const target_value = Number(formData.get('target_value'));
      const current_value = Number(formData.get('current_value'));

      const dataToSave = {
        id: openGoal?.id,
        title,
        description,
        target_value,
        current_value,
      };

      const result = await (openGoal?.id ? updateStudyGoal(dataToSave) : addStudyGoal(dataToSave));

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Meta ${openGoal?.id ? 'atualizada' : 'criada'} com sucesso!`);
        setOpenGoal(null);
        setIsNewGoalDialogOpen(false);
        router.refresh();
      }
    });
  };

  // Função para apagar uma meta
  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteStudyGoal(id);
      toast.success('Meta apagada com sucesso!');
      router.refresh();
    });
  };

  // Função para incrementar/decrementar o progresso
  const handleProgressChange = (goal: StudyGoal, amount: number) => {
    startTransition(async () => {
        const newValue = goal.current_value + amount;
        if (newValue < 0 || newValue > goal.target_value) return; // Impede valores inválidos
        await updateStudyGoalValue(goal.id, newValue);
        router.refresh(); // Atualiza a UI para refletir a mudança
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* CABEÇALHO OTIMIZADO */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Minhas Metas</h2>
        </div>
        <Dialog open={isNewGoalDialogOpen} onOpenChange={setIsNewGoalDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setOpenGoal(null)}>
              <PlusCircle className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{openGoal ? 'Editar Meta' : 'Nova Meta de Estudo'}</DialogTitle>
            </DialogHeader>
            <form action={handleFormSubmit} className="space-y-4">
              <input type="hidden" name="id" value={openGoal?.id} />
              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={openGoal?.title} />
              </div>
              <div>
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea id="description" name="description" defaultValue={openGoal?.description || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_value">Progresso Atual</Label>
                  <Input id="current_value" name="current_value" type="number" defaultValue={openGoal?.current_value || 0} required />
                </div>
                <div>
                  <Label htmlFor="target_value">Meta Final</Label>
                  <Input id="target_value" name="target_value" type="number" defaultValue={openGoal?.target_value || 100} required />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Salvar Meta'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* LISTA DE METAS */}
      <div className="flex-grow space-y-4 overflow-y-auto pr-2">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const percentage = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium truncate pr-2">{goal.title}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    {goal.current_value} / {goal.target_value}
                  </span>
                </div>
                <Progress value={percentage} />
                {/* BOTÕES DE AÇÃO SEMPRE VISÍVEIS */}
                <div className="flex justify-end items-center gap-2">
                   <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleProgressChange(goal, -1)} disabled={isPending}>
                      <Minus className="h-4 w-4" />
                   </Button>
                   <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleProgressChange(goal, 1)} disabled={isPending}>
                      <Plus className="h-4 w-4" />
                   </Button>
                   <DialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpenGoal(goal); setIsNewGoalDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                     </Button>
                   </DialogTrigger>
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(goal.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-8">
            Nenhuma meta definida. Clique em '+' para adicionar uma.
          </p>
        )}
      </div>
    </div>
  );
}
