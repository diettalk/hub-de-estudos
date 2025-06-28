// src/components/ConcursoFormModal.tsx

'use client';

import { useTransition, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea'; // Importamos a Textarea
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

type Concurso = {
  id: number;
  nome: string;
  banca: string;
  data_prova: string;
  status: 'ativo' | 'previsto' | 'arquivado';
  edital_url: string | null;
  prioridades: string[] | null; // Adicionado
};

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
    if (!isOpen) {
      formRef.current?.reset();
    }
  }, [isOpen]);
  
  const formAction = (formData: FormData) => {
    const action = isEditMode ? updateConcurso : addConcurso;
    startTransition(() => {
      action(formData).then(() => {
        onClose();
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Concurso' : 'Adicionar Novo Concurso'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          {isEditMode && <input type="hidden" name="id" value={concurso.id} />}
          <div className="grid gap-4 py-4">
            {/* ... outros campos do formulário (Nome, Banca, etc.) ... */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">Nome</Label>
              <Input id="nome" name="nome" defaultValue={concurso?.nome || ''} className="col-span-3 bg-gray-900" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banca" className="text-right">Banca</Label>
              <Input id="banca" name="banca" defaultValue={concurso?.banca || ''} className="col-span-3 bg-gray-900" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="data_prova" className="text-right">Data da Prova</Label>
              <Input id="data_prova" name="data_prova" type="date" defaultValue={concurso?.data_prova || ''} className="col-span-3 bg-gray-900" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edital_url" className="text-right">Link do Edital</Label>
              <Input id="edital_url" name="edital_url" type="url" placeholder="https://..." defaultValue={concurso?.edital_url || ''} className="col-span-3 bg-gray-900" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select name="status" defaultValue={concurso?.status || 'ativo'}>
                <SelectTrigger className="col-span-3 bg-gray-900"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="previsto">Previsto</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* CAMPO DE PRIORIDADES ADICIONADO AQUI */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="prioridades" className="text-right pt-2">Prioridades</Label>
              <Textarea 
                id="prioridades" 
                name="prioridades" 
                placeholder="Uma prioridade por linha..." 
                className="col-span-3 bg-gray-900 resize-y" 
                defaultValue={concurso?.prioridades?.join('\n') || ''}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Concurso')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}