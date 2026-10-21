// src/components/ResourceModal.tsx

'use client';

import { useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type Resource, type Disciplina } from '@/lib/types';
import { createResource, updateResource } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

export function ResourceModal({ 
    open, 
    setOpen, 
    allFolders, 
    disciplinas, 
    editingResource, 
    preselectedParentId 
}: { 
    open: boolean; 
    setOpen: (o: boolean) => void; 
    allFolders: Resource[]; 
    disciplinas: Disciplina[]; 
    editingResource: Resource | null; 
    preselectedParentId: number | null; 
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const formAction = editingResource ? updateResource : createResource;

    const handleSubmit = (formData: FormData) => {
        if (editingResource) formData.append('id', String(editingResource.id));
        formData.append('type', 'link'); // Sempre será do tipo 'link'
        
        startTransition(() => {
            toast.promise(formAction(formData), {
                loading: editingResource ? 'A atualizar link...' : 'A criar link...',
                success: (res) => {
                    if (res?.error) throw new Error(res.error);
                    setOpen(false);
                    router.refresh();
                    return `Link ${editingResource ? 'atualizado' : 'criado'} com sucesso!`;
                },
                error: (err) => `Erro: ${err.message}`
            });
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingResource ? 'Editar Link' : 'Adicionar Novo Link'}</DialogTitle></DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                     <div className="space-y-2"><Label>Guardar Em</Label>
                        <Select name="parent_id" defaultValue={String(editingResource?.parent_id || preselectedParentId || 'null')}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Biblioteca Raiz</SelectItem>
                                {allFolders.map(f => (<SelectItem key={f.id} value={String(f.id)}>{f.title}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Título</Label><Input name="title" defaultValue={editingResource?.title || ''} required /></div>
                    <div className="space-y-2"><Label>Descrição (Opcional)</Label><Textarea name="description" defaultValue={editingResource?.description || ''} rows={2} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="url">URL do Link</Label>
                        <Input id="url" name="url" type="url" defaultValue={editingResource?.url || ''} required />
                    </div>
                    <div className="space-y-2"><Label>Vincular à Disciplina (Cria/move para pasta)</Label>
                        <Select name="disciplina_id" defaultValue={String(editingResource?.disciplina_id || 'null')}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Nenhuma</SelectItem>
                                {disciplinas.map(d => (<SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose><Button type="submit" disabled={isPending}>{isPending ? 'Guardar' : 'Criar'}</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
