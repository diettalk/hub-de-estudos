// src/components/LembreteEditor.tsx
'use client';
import { useState, useTransition } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { addLembrete, updateLembrete } from '@/app/actions';

export function LembreteEditor({ lembrete, data, onActionSuccess }: { lembrete?: any; data?: string; onActionSuccess: () => void; }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!lembrete;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEditMode) {
        await updateLembrete(formData);
      } else {
        await addLembrete(formData);
      }
      onActionSuccess();
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="ghost" size="icon" className="h-6 w-6"><i className="fas fa-pencil-alt text-xs text-gray-400 hover:text-white"></i></Button>
        ) : (
          <Button type="submit" form="add-lembrete-form" disabled={isPending}>{isPending ? '...' : 'Adicionar'}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-gray-800 text-white border-gray-700">
        <DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Novo'} Lembrete</DialogTitle></DialogHeader>
        <form action={handleSubmit}>
          {isEditMode && <input type="hidden" name="id" value={lembrete.id} />}
          <input type="hidden" name="data" value={isEditMode ? lembrete.data : data} />
          <div className="py-4">
            <Label>Título do Lembrete</Label>
            <Input name="titulo" defaultValue={lembrete?.titulo} className="bg-gray-700 mt-1" required />
          </div>
          <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}