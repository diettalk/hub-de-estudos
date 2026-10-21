// src/components/FolderModal.tsx

'use client';

import { useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type Resource } from '@/lib/types';
import { createResource, updateResource } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

export function FolderModal({ 
    open, 
    setOpen, 
    allFolders, 
    editingResource, 
    preselectedParentId 
}: { 
    open: boolean; 
    setOpen: (o: boolean) => void; 
    allFolders: Resource[]; 
    editingResource: Resource | null; 
    preselectedParentId: number | null; 
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const formAction = editingResource ? updateResource : createResource;

    const handleSubmit = (formData: FormData) => {
        // Adiciona os campos que não estão no formulário
        if (editingResource) {
            formData.append('id', String(editingResource.id));
        }
        formData.append('type', 'folder');

        startTransition(() => {
            toast.promise(formAction(formData), {
                loading: editingResource ? 'A atualizar pasta...' : 'A criar pasta...',
                success: (res) => {
                    if (res?.error) throw new Error(res.error);
                    setOpen(false);
                    router.refresh();
                    return `Pasta ${editingResource ? 'atualizada' : 'criada'} com sucesso!`;
                },
                error: (err) => `Erro: ${err.message}`
            });
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingResource ? 'Editar Pasta' : 'Criar Nova Pasta'}</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Nome da Pasta</Label>
                        <Input id="title" name="title" defaultValue={editingResource?.title || ''} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="parent_id">Guardar Em</Label>
                        <Select name="parent_id" defaultValue={String(editingResource?.parent_id || preselectedParentId || 'null')}>
                            <SelectTrigger id="parent_id">
                                <SelectValue placeholder="Selecione uma pasta..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Biblioteca Raiz</SelectItem>
                                {allFolders
                                    .filter(f => f.id !== editingResource?.id) // Impede que uma pasta seja movida para dentro de si mesma
                                    .map(f => (
                                        <SelectItem key={f.id} value={String(f.id)}>{f.title}</SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={isPending}>{isPending ? 'Guardar' : 'Criar Pasta'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
