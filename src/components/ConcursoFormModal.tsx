'use client';

import { useTransition, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addConcurso, updateConcurso } from '@/app/actions';
import { type Concurso } from '@/lib/types';
import { toast } from 'sonner';

type ConcursoFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  concurso: Concurso | null;
};

export function ConcursoFormModal({ isOpen, onClose, concurso }: ConcursoFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditMode = concurso !== null;

  useEffect(() => {
    // Reseta o formulário sempre que o modal é fechado
    if (!isOpen) {
      formRef.current?.reset();
    }
  }, [isOpen]);
  
  const formAction = (formData: FormData) => {
    const action = isEditMode ? updateConcurso : addConcurso;
    startTransition(() => {
      // Adiciona o ID ao formData se estiver no modo de edição
      if (isEditMode && concurso) {
        formData.append('id', String(concurso.id));
      }
      
      action(formData).then((result) => {
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success(isEditMode ? "Concurso atualizado com sucesso!" : "Concurso adicionado com sucesso!");
          onClose();
        }
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Concurso' : 'Adicionar Novo Concurso'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">Nome</Label>
              <Input id="nome" name="nome" defaultValue={concurso?.nome || ''} className="col-span-3 bg-input" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banca" className="text-right">Banca</Label>
              <Input id="banca" name="banca" defaultValue={concurso?.banca || ''} className="col-span-3 bg-input" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="data_prova" className="text-right">Data da Prova</Label>
              <Input id="data_prova" name="data_prova" type="date" defaultValue={concurso?.data_prova?.split('T')[0] || ''} className="col-span-3 bg-input" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edital_url" className="text-right">Link do Edital</Label>
              <Input id="edital_url" name="edital_url" type="url" placeholder="https://..." defaultValue={concurso?.edital_url || ''} className="col-span-3 bg-input" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select name="status" defaultValue={concurso?.status || 'ativo'}>
                <SelectTrigger className="col-span-3 bg-input"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="previsto">Previsto</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="prioridades" className="text-right pt-2">Prioridades</Label>
              <Textarea 
                id="prioridades" 
                name="prioridades" 
                placeholder="Uma prioridade por linha..." 
                className="col-span-3 bg-input resize-y" 
                defaultValue={concurso?.prioridades?.join('\n') || ''}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'A salvar...' : (isEditMode ? 'Salvar Alterações' : 'Criar Concurso')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
