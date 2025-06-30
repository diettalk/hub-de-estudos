// src/components/DocumentoEditor.tsx (VERSÃO CORRIGIDA)
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TextEditor } from './TextEditor';
import { addDocumento, updateDocumento, deleteDocumento } from '@/app/actions';
import { toast } from 'sonner';

type Documento = {
  id: number;
  title: string;
  content: string; 
};

export function DocumentoEditor({ documento }: { documento?: Documento }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!documento?.id;
  const [editorContent, setEditorContent] = useState('');

  useEffect(() => {
    if (open) {
      if (isEditMode && documento) {
        setEditorContent(documento.content || '');
      } else {
        setEditorContent('');
      }
    }
  }, [documento, isEditMode, open]);

  const handleSubmit = async (formData: FormData) => {
    formData.append('content', editorContent);
    startTransition(async () => {
      if (isEditMode) {
        formData.append('id', String(documento.id));
        await updateDocumento(formData);
        toast.success("Documento atualizado com sucesso!");
      } else {
        await addDocumento(formData);
        toast.success("Documento criado com sucesso!");
      }
      setOpen(false);
    });
  };

  const handleDelete = async () => {
    if (isEditMode && window.confirm(`Tem certeza que deseja excluir o documento "${documento.title}"?`)) {
      startTransition(async () => {
        await deleteDocumento(documento.id);
        toast.info("Documento excluído.");
        setOpen(false);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? (
          // CORREÇÃO: Adicionamos classes de cor ao ícone
          <Button variant="ghost" size="icon" title="Editar Documento">
            <i className="fas fa-pencil-alt text-gray-400 hover:text-white transition-colors"></i>
          </Button>
        ) : (
          <Button>+ Adicionar Documento</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[80vw] w-[80vw] h-[90vh] flex flex-col bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Documento' : 'Novo Documento Estratégico'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="flex flex-col flex-grow min-h-0">
          <div className="py-4">
            <Label htmlFor="title" className="text-sm font-semibold">Título do Documento</Label>
            <Input id="title" name="title" required defaultValue={documento?.title} className="bg-gray-700 mt-1"/>
          </div>
          <div className="flex-grow min-h-0">
            <TextEditor value={editorContent} onChange={setEditorContent} />
          </div>
          <DialogFooter className="pt-4 mt-4 border-t border-gray-700">
            {isEditMode && <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>Excluir</Button>}
            <div className="flex-grow"></div>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}