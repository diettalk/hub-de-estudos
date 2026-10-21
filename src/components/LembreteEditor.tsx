// src/components/LembreteEditor.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { addLembrete, updateLembrete } from '@/app/actions';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';

type Lembrete = {
  id: number;
  titulo: string;
  cor: string;
  data: string;
};

export function LembreteEditor({ lembrete, data, onActionSuccess }: { lembrete?: Lembrete, data?: string, onActionSuccess: () => void; }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!lembrete;

  // CORREÇÃO: Usando um manipulador onSubmit no lado do cliente
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = isEditMode 
        ? await updateLembrete(formData) 
        : await addLembrete(formData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditMode ? "Lembrete atualizado!" : "Lembrete criado!");
        onActionSuccess(); // Agora esta função está no escopo correto
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? 
          <button className="p-2 text-muted-foreground hover:text-foreground" title="Editar Lembrete">
            <Edit className="w-4 h-4" />
          </button> :
          <Button disabled={isPending}>{isPending ? 'Adicionando...' : 'Add'}</Button>
        }
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Novo'} Lembrete</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          {isEditMode && <input type="hidden" name="id" value={lembrete.id}/>}
          <input type="hidden" name="data" value={data} />
          <div className="py-4 space-y-4">
            <div><Label htmlFor="titulo">Título</Label><Input id="titulo" name="titulo" defaultValue={lembrete?.titulo} className="bg-input" required /></div>
            <div><Label htmlFor="cor">Cor</Label><Input id="cor" name="cor" type="color" defaultValue={lembrete?.cor || '#8b5cf6'} className="w-full h-10 p-1 bg-input"/></div>
          </div>
          <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
