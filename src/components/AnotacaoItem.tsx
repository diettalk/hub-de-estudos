// src/components/AnotacaoItem.tsx

'use client';

import { useState, useTransition } from 'react';
import { deleteAnotacao, updateAnotacao } from '@/app/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit, Save } from 'lucide-react';

type Anotacao = {
  id: number;
  content: string | null; // Permite que o conteúdo seja nulo
};

export function AnotacaoItem({ nota }: { nota: Anotacao }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ação que será chamada pelo formulário de edição
  const handleUpdateAction = async (formData: FormData) => {
    // Envolve a chamada da Server Action em uma transição para mostrar o feedback
    startTransition(async () => {
      await updateAnotacao(formData);
      // Desativa o modo de edição APÓS a conclusão
      setIsEditing(false);
    });
  };

  if (isEditing) {
    return (
      <form action={handleUpdateAction} className="flex justify-between items-center gap-2 bg-gray-900/50 p-3 rounded-md">
        <input type="hidden" name="id" value={nota.id} />
        <Input
          name="content"
          defaultValue={nota.content || ''}
          className="bg-gray-700 border-gray-600 h-8"
          autoFocus
        />
        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isPending}>
          <Save className={`h-4 w-4 text-green-400 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-md group">
      <p className="text-sm">{nota.content}</p>
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
        <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4 text-gray-400" />
        </Button>
        <form action={(formData) => startTransition(() => deleteAnotacao(formData))}>
          <input type="hidden" name="id" value={nota.id} />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
            <Trash2 className={`h-4 w-4 text-red-500 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </form>
      </div>
    </div>
  );
}