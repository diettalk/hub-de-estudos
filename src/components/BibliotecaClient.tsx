'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addResource, deleteResource } from '@/app/actions';
import { type Resource, type Disciplina } from '@/lib/types';
import { toast } from 'sonner';
import { Plus, Trash2, Link as LinkIcon, FilePdf } from 'lucide-react';
import Link from 'next/link';

// Componente para o formulário de adição de recursos
function AddResourceForm({ disciplinas }: { disciplinas: Disciplina[] }) {
    const [type, setType] = useState<'link' | 'pdf'>('link');
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await addResource(formData);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Recurso adicionado com sucesso!");
                formRef.current?.reset();
                setType('link'); // Reseta o tipo do formulário
            }
        });
    };

    return (
        <form ref={formRef} action={handleSubmit} className="bg-card p-6 rounded-lg border space-y-4">
            <h3 className="text-lg font-semibold">Adicionar Novo Recurso</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select name="type" value={type} onValueChange={(value: 'link' | 'pdf') => setType(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea id="description" name="description" rows={2} />
            </div>
            {type === 'link' && (
                <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input id="url" name="url" type="url" placeholder="https://..." />
                </div>
            )}
            {type === 'pdf' && (
                <div className="space-y-2">
                    <Label htmlFor="file">Ficheiro PDF</Label>
                    <Input id="file" name="file" type="file" accept=".pdf" />
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="disciplina_id">Vincular à Disciplina (Opcional)</Label>
                    <Select name="disciplina_id">
                        <SelectTrigger><SelectValue placeholder="Selecione uma disciplina..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">Nenhuma</SelectItem>
                            {disciplinas.map(d => (
                                <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end">
                    <Button type="submit" disabled={isPending} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        {isPending ? 'A adicionar...' : 'Adicionar Recurso'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

// Componente principal da Biblioteca
export function BibliotecaClient({ resources, disciplinas }: { resources: Resource[], disciplinas: Disciplina[] }) {
  const [, startTransition] = useTransition();

  const handleDelete = (id: number, filePath: string | null) => {
    if (confirm("Tem a certeza de que deseja apagar este recurso?")) {
      startTransition(async () => {
        await deleteResource(id, filePath);
        toast.success("Recurso apagado.");
      });
    }
  };

  return (
    <div className="space-y-8">
      <AddResourceForm disciplinas={disciplinas} />

      <div>
        <h2 className="text-2xl font-bold mb-4">Seus Recursos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">A sua biblioteca está vazia.</p>
          )}
          {resources.map(resource => (
            <div key={resource.id} className="bg-card p-4 rounded-lg border flex flex-col group">
              <div className="flex-grow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 mb-2">
                    {resource.type === 'link' ? <LinkIcon className="h-5 w-5 text-primary" /> : <FilePdf className="h-5 w-5 text-destructive" />}
                    <h3 className="font-semibold truncate">{resource.title}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(resource.id, resource.file_path)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between items-center">
                <span>{resource.paginas?.title || 'Sem disciplina'}</span>
                {resource.type === 'link' && resource.url && (
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Abrir Link</a>
                )}
                {resource.type === 'pdf' && resource.file_path && (
                  <a href={`https://etifeomaorcxzsxosxlz.supabase.co/storage/v1/object/public/resources/${resource.file_path}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Abrir PDF</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}