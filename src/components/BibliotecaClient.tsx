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
// 1. CORREÇÃO: Importar as novas actions
import { addResourceContent, deleteResource } from '@/app/actions';
import { type Resource, type Disciplina, type Node } from '@/lib/types';
import { toast } from 'sonner';
import { Plus, Trash2, Link as LinkIcon, FilePdf } from 'lucide-react';
import Link from 'next/link';

// Formulário agora é para adicionar conteúdo a um recurso existente
function ResourceContentForm({ resource, disciplinas }: { resource: Resource, disciplinas: Disciplina[] }) {
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        formData.append('id', String(resource.id));
        formData.append('type', resource.type!); // Passa o tipo do recurso

        startTransition(async () => {
            const result = await addResourceContent(formData);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Recurso atualizado com sucesso!");
            }
        });
    };

    return (
        <form ref={formRef} action={handleSubmit} className="bg-card p-6 rounded-lg border space-y-4">
            <h3 className="text-lg font-semibold">Editar Recurso: {resource.title}</h3>
            {/* ... (resto do formulário como antes, mas agora para edição) ... */}
        </form>
    );
}

// Componente principal da Biblioteca
export function BibliotecaClient({ resourceTree, disciplinas, selectedResource }: { resourceTree: Node[], disciplinas: Disciplina[], selectedResource: Resource | null }) {
  // A lógica da sidebar virá aqui
  return (
    <div className="space-y-8">
      {selectedResource && selectedResource.type !== 'folder' ? (
        <ResourceContentForm resource={selectedResource} disciplinas={disciplinas} />
      ) : (
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-bold mb-4">Biblioteca de Recursos</h2>
          <p className="text-muted-foreground">Selecione um item na barra lateral para ver os detalhes ou adicione uma nova pasta ou recurso.</p>
        </div>
      )}
    </div>
  );
}
