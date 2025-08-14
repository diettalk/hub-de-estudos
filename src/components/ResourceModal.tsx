// src/components/ResourceModal.tsx

'use client';

import { useTransition, useEffect, useState } from 'react';
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
    const [type, setType] = useState<'link' | 'video'>('link');
    const [isPending, startTransition] = useTransition();
    const formAction = editingResource ? updateResource : createResource;

    useEffect(() => {
        if (open) {
            if (editingResource && (editingResource.type === 'link' || editingResource.type === 'video')) {
                setType(editingResource.type);
            } else {
                setType('link');
            }
        }
    }, [editingResource, open]);

    const handleSubmit = (formData: FormData) => {
        if (editingResource) formData.append('id', String(editingResource.id));
        formData.append('type', type);
        
        startTransition(() => {
            toast.promise(formAction(formData), {
                loading: editingResource ? 'A atualizar recurso...' : 'A criar recurso...',
                success: (res) => {
                    if (res?.error) throw new Error(res.error);
                    setOpen(false);
                    router.refresh();
                    return `Recurso ${editingResource ? 'atualizado' : 'criado'} com sucesso!`;
                },
                error: (err) => `Erro: ${err.message}`
            });
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingResource ? 'Editar Recurso' : 'Adicionar Novo Recurso'}</DialogTitle></DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    {!editingResource && (
                        <div className="space-y-2"><Label>Tipo de Recurso</Label>
                            <Select value={type} onValueChange={(value: 'link' | 'video') => setType(value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="link">Link</SelectItem>
                                    <SelectItem value="video">Vídeo do YouTube</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
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
                        <Label htmlFor="url">{type === 'video' ? 'URL do Vídeo do YouTube' : 'URL do Link'}</Label>
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
