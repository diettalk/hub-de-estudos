// src/components/TopicoEditor.tsx
'use client';
import { useState, useTransition, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TextEditor } from './TextEditor';
import { addTopico, updateTopico } from '@/app/actions';
import { type Topico } from '@/lib/types';

export function TopicoEditor({ disciplinaId, topico, onAction }: { disciplinaId: number, topico?: Topico, onAction: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editorContent, setEditorContent] = useState('');
  const isEditMode = !!topico;

  useEffect(() => {
    if (isEditMode) {
      setEditorContent(topico.conteudo_rico || '');
    } else {
      setEditorContent('');
    }
  }, [topico, isEditMode]);

  const handleSubmit = (formData: FormData) => {
    formData.append('conteudo_rico', editorContent);
    startTransition(async () => {
      if (isEditMode) {
        formData.append('id', String(topico.id));
        await updateTopico(formData); // Agora esta função existe
      } else {
        await addTopico(formData);
      }
      onAction();
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? 
          <span className="flex-grow cursor-pointer flex items-center gap-2"><i className="fas fa-file-alt text-blue-400"></i> {topico.nome}</span> : 
          <Button size="sm" variant="ghost"><i className="fas fa-plus mr-2"></i>Novo Tópico</Button>
        }
      </DialogTrigger>
      <DialogContent className="max-w-[80vw] w-[80vw] h-[90vh] flex flex-col bg-gray-800 border-gray-700 text-white">
        <DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Novo'} Tópico</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="flex flex-col flex-grow min-h-0">
          <input type="hidden" name="disciplina_id" value={disciplinaId} />
          <div className="py-2"><Label>Título</Label><Input name="nome" defaultValue={topico?.nome} className="bg-gray-700 mt-1" required/></div>
          <div className="flex-grow min-h-0"><TextEditor value={editorContent} onChange={setEditorContent} /></div>
          <DialogFooter className="pt-4 mt-4 border-t border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}