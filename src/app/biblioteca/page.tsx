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
import { updateResourceContent } from '@/app/actions';
import { type Resource, type Disciplina } from '@/lib/types';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

// Formulário para editar o conteúdo de um recurso existente
function ResourceContentForm({ resource, disciplinas }: { resource: Resource, disciplinas: Disciplina[] }) {
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        formData.append('id', String(resource.id));
        formData.append('type', resource.type!);

        startTransition(async () => {
            const result = await updateResourceContent(formData);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Recurso atualizado com sucesso!");
            }
        });
    };

    return (
        <form ref={formRef} action={handleSubmit} className="bg-card p-6 rounded-lg border space-y-4 h-full flex flex-col">
            <h3 className="text-lg font-semibold">Editar Recurso</h3>
            <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" defaultValue={resource.title} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea id="description" name="description" defaultValue={resource.description || ''} rows={3} />
            </div>
            {resource.type === 'link' && (
                <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input id="url" name="url" type="url" defaultValue={resource.url || ''} placeholder="https://..." />
                </div>
            )}
            {resource.type === 'pdf' && (
                <div className="space-y-2">
                    <Label htmlFor="file">Substituir PDF (Opcional)</Label>
                    <Input id="file" name="file" type="file" accept=".pdf" />
                    {resource.file_name && <p className="text-xs text-muted-foreground mt-1">Ficheiro atual: {resource.file_name}</p>}
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="disciplina_id">Vincular à Disciplina (Opcional)</Label>
                <Select name="disciplina_id" defaultValue={String(resource.disciplina_id || 'null')}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma disciplina..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {disciplinas.map(d => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="mt-auto pt-4">
                <Button type="submit" disabled={isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {isPending ? 'A salvar...' : 'Salvar Alterações'}
                </Button>
            </div>
        </form>
    );
}

// Componente principal da Biblioteca
export function BibliotecaClient({ disciplinas, selectedResource }: { disciplinas: Disciplina[], selectedResource: Resource | null }) {
  if (selectedResource && selectedResource.type !== 'folder') {
    return <ResourceContentForm resource={selectedResource} disciplinas={disciplinas} />;
  }

  return (
    <div className="bg-card p-6 rounded-lg border h-full flex items-center justify-center">
        <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Biblioteca de Recursos</h2>
            <p className="text-muted-foreground">Selecione um item na barra lateral para ver os detalhes ou adicione uma nova pasta ou recurso.</p>
        </div>
    </div>
  );
}
