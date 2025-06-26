// src/components/LembreteEditor.tsx
'use client';
import { useState, useTransition } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { addLembrete, updateLembrete } from '@/app/actions';

type Lembrete = { // TIPO ESPECÍFICO
  id: number;
  titulo: string;
  cor: string;
  data: string;
};

export function LembreteEditor({ lembrete, data, onActionSuccess }: { lembrete?: Lembrete, data?: string, onActionSuccess: () => void; }) {  const [isPending, startTransition] = useTransition();
  const isEditMode = !!lembrete;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? 
          <Button variant="ghost" size="icon" className="h-6 w-6"><i className="fas fa-pencil-alt text-xs text-gray-400 hover:text-white"></i></Button> : 
          <Button type="submit" form="add-lembrete-form" disabled={isPending}>{isPending ? '...' : 'Adicionar'}</Button>
        }
      </DialogTrigger>
      <DialogContent className="bg-gray-800 text-white border-gray-700">
        <DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Novo'} Lembrete</DialogTitle></DialogHeader>
        <form action={async (formData) => {
          startTransition(async () => {
            if (isEditMode) await updateLembrete(formData); else await addLembrete(formData);
            onActionSuccess(); setOpen(false);
          });
        }}>
          {isEditMode && <input type="hidden" name="id" value={lembrete.id}/>}
          <input type="hidden" name="data" value={isEditMode ? lembrete.data : (data ? format(data, 'yyyy-MM-dd') : '')} />
          <div className="py-4 space-y-4">
            <div><Label>Título</Label><Input name="titulo" defaultValue={lembrete?.titulo} className="bg-gray-700" /></div>
            <div><Label>Cor</Label><Input name="cor" type="color" defaultValue={lembrete?.cor || '#8b5cf6'} className="w-full h-10 p-1 bg-gray-700"/></div>
          </div>
          <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}