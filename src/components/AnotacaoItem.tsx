// src/components/AnotacaoItem.tsx

'use client';

import { useState, useTransition } from 'react';
import { deleteAnotacao, updateAnotacao } from '@/app/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit, Save } from 'lucide-react';

type Anotacao = {
  id: number;
  content: string;
};

export function AnotacaoItem({ nota }: { nota: Anotacao }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (formData: FormData) => {
    startTransition(() => deleteAnotacao(formData));
  };

  const handleUpdate = (formData: FormData) => {
    startTransition(() => {
      updateAnotacao(formData).then(() => {
        setIsEditing(false);
      });
    });
  };

  if (isEditing) {
    return (
      <form action={handleUpdate} className="flex justify-between items-center gap-2 bg-gray-900/50 p-3 rounded-md">
        <input type="hidden" name="id" value={nota.id} />
        <Input
          name="content"
          defaultValue={nota.content}
          className="bg-gray-700 border-gray-600 h-8"
          autoFocus
        />
        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isPending}>
          <Save className="h-4 w-4 text-green-400" />
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
        <form action={handleDelete}>
          <input type="hidden" name="id" value={nota.id} />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </form>
      </div>
    </div>
  );
}