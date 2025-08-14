// src/components/BibliotecaClient.tsx

'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    createResource, 
    deleteResource, 
    updateResource, 
    updateItemParent, 
    updateResourceStatus 
} from '@/app/actions';
import { type Resource, type Disciplina, type ConfirmationDialogState } from '@/lib/types';
import { toast } from 'sonner';
import { Folder, Link as LinkIcon, FilePdf, Plus, MoreVertical, Edit, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import BibliotecaSidebar from './BibliotecaSidebar';

// Modal para criar/editar recursos (com seletor de pasta)
function ResourceModal({ open, setOpen, allFolders, disciplinas, editingResource, preselectedParentId }: { open: boolean; setOpen: (o: boolean) => void; allFolders: Resource[]; disciplinas: Disciplina[]; editingResource: Resource | null; preselectedParentId: number | null; }) {
    const [type, setType] = useState('link');
    const [isPending, startTransition] = useTransition();
    const formAction = editingResource ? updateResource : createResource;

    useEffect(() => {
        if (open) {
            if (editingResource) {
                setType(editingResource.type);
            } else {
                setType('link');
            }
        }
    }, [editingResource, open]);

    const handleSubmit = (formData: FormData) => {
        if (editingResource) {
            formData.append('id', String(editingResource.id));
        }
        
        startTransition(async () => {
            const result = await formAction(formData);
            if (result?.error) {
                toast.error(result.error, { description: result.details });
            } else {
                toast.success(`Recurso ${editingResource ? 'atualizado' : 'criado'} com sucesso!`);
                setOpen(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingResource ? 'Editar Recurso' : 'Adicionar Novo Recurso'}</DialogTitle></DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    {!editingResource && (
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select name="type" value={type} onValueChange={(value: 'link' | 'pdf' | 'folder') => setType(value)}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="folder">Pasta</SelectItem><SelectItem value="link">Link</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label>Guardar Em</Label>
                        <Select name="parent_id" defaultValue={String(editingResource?.parent_id || preselectedParentId || 'null')}>
                            <SelectTrigger><SelectValue placeholder="Selecione uma pasta..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Biblioteca Raiz</SelectItem>
                                {allFolders.map(f => (<SelectItem key={f.id} value={String(f.id)}>{f.title}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Título</Label>
                        <Input name="title" defaultValue={editingResource?.title || ''} required />
                    </div>
                    {type !== 'folder' && (
                        <>
                            <div className="space-y-2"><Label>Descrição (Opcional)</Label><Textarea name="description" defaultValue={editingResource?.description || ''} rows={2} /></div>
                            {type === 'link' && (<div className="space-y-2"><Label>URL</Label><Input name="url" type="url" defaultValue={editingResource?.url || ''} placeholder="https://..." /></div>)}
                            {type === 'pdf' && (<div className="space-y-2"><Label>Ficheiro PDF</Label><Input name="file" type="file" accept=".pdf" />{editingResource?.file_name && <p className="text-xs text-muted-foreground mt-1">Ficheiro atual: {editingResource.file_name}</p>}</div>)}
                            <div className="space-y-2"><Label>Vincular à Disciplina (Cria pasta automática)</Label>
                                <Select name="disciplina_id" defaultValue={String(editingResource?.disciplina_id || 'null')}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="null">Nenhuma</SelectItem>{disciplinas.map(d => (<SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={isPending}>{isPending ? 'A guardar...' : 'Guardar'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function BibliotecaClient({ initialData }: { initialData: Awaited<ReturnType<typeof import('../app/actions').getBibliotecaData>> }) {
    const searchParams = useSearchParams();
    const currentFolderId = useMemo(() => Number(searchParams.get('folderId')) || null, [searchParams]);

    const [activeResources, setActiveResources] = useState(initialData.activeResources);
    const [archivedItems, setArchivedItems] = useState(initialData.archivedItems);
    const [view, setView] = useState<'active' | 'archived'>('active');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [preselectedParentId, setPreselectedParentId] = useState<number | null>(null);
    const [, startTransition] = useTransition();
    
    const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        setActiveResources(initialData.activeResources);
        setArchivedItems(initialData.archivedItems);
    }, [initialData]);

    const currentFolder = useMemo(() => activeResources.find(r => r.id === currentFolderId), [activeResources, currentFolderId]);
    const itemsInCurrentFolder = useMemo(() => activeResources.filter(r => r.parent_id === currentFolderId), [activeResources, currentFolderId]);
    const allFolders = useMemo(() => activeResources.filter(r => r.type === 'folder'), [activeResources]);

    const handleAddNew = (type: 'folder' | 'link' | 'pdf', parentId: number | null) => {
        setEditingResource(null);
        setPreselectedParentId(parentId);
        setModalOpen(true);
    };

    const handleEdit = (resource: Resource) => {
        setEditingResource(resource);
        setPreselectedParentId(resource.parent_id);
        setModalOpen(true);
    };

    const handleDelete = (resource: Resource, isPermanent: boolean) => {
        setConfirmationDialog({
            isOpen: true,
            title: `Apagar "${resource.title}"?`,
            description: isPermanent ? "Ação irreversível. O item e todos os seus conteúdos serão apagados permanentemente." : "O item será movido para o arquivo.",
            onConfirm: () => startTransition(async () => {
                const result = await deleteResource(resource.id, isPermanent);
                if (result.error) toast.error(result.error.message, { description: result.details });
                else toast.success(`Recurso ${isPermanent ? 'apagado' : 'arquivado'}.`);
            })
        });
    };
    
    const handleArchive = (id: number) => startTransition(async () => {
        const result = await updateResourceStatus(id, 'arquivado');
        if (result.error) toast.error(result.error); else toast.success("Recurso arquivado.");
    });
    
    const handleUnarchive = (id: number) => startTransition(async () => {
        const result = await updateResourceStatus(id, 'ativo');
        if (result.error) toast.error(result.error); else toast.success("Recurso restaurado.");
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !active) return;
        
        const activeResource = active.data.current?.resource as Resource;
        const overResource = over.data.current?.resource as Resource;

        if (activeResource && overResource && activeResource.id !== overResource.id && overResource.type === 'folder') {
            // Optimistic UI Update
            setActiveResources(prev => prev.map(r => r.id === activeResource.id ? { ...r, parent_id: overResource.id } : r));
            // Server Action
            startTransition(async () => {
                await updateItemParent('resources', activeResource.id, overResource.id);
                toast.success(`"${activeResource.title}" movido para "${overResource.title}"`);
            });
        }
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-120px)]">
                <BibliotecaSidebar 
                    resources={activeResources} 
                    onAddNew={handleAddNew}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    selectedFolderId={currentFolderId}
                />

                <div className="bg-card p-4 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h1 className="text-2xl font-bold tracking-tight">{currentFolder ? currentFolder.title : "Recursos Gerais"}</h1>
                        <div className="flex gap-2">
                            <Button onClick={() => setView(view === 'active' ? 'archived' : 'active')} variant="outline">
                                {view === 'active' ? <Archive className="mr-2 h-4 w-4" /> : <ArchiveRestore className="mr-2 h-4 w-4" />}
                                {view === 'active' ? `Arquivados (${archivedItems.length})` : 'Ativos'}
                            </Button>
                            <Button onClick={() => handleAddNew('link', currentFolderId)}><Plus className="mr-2 h-4 w-4" /> Adicionar Recurso</Button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        {view === 'active' ? (
                            itemsInCurrentFolder.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {itemsInCurrentFolder.map(item => (
                                        <div key={item.id} className="bg-background p-3 rounded-lg flex items-center gap-3">
                                            {item.type === 'folder' && <Folder className="h-6 w-6 text-amber-500" />}
                                            {item.type === 'link' && <LinkIcon className="h-6 w-6 text-sky-500" />}
                                            {item.type === 'pdf' && <FilePdf className="h-6 w-6 text-red-500" />}
                                            <span className="flex-grow truncate">{item.title}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-center text-muted-foreground"><p>Esta pasta está vazia.</p></div>
                            )
                        ) : (
                            archivedItems.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {archivedItems.map(item => (
                                        <div key={item.id} className="bg-card/50 p-3 rounded-lg border border-dashed flex items-center gap-3 group relative opacity-70">
                                            {item.type === 'folder' && <Folder className="h-6 w-6 text-muted-foreground" />}
                                            {item.type === 'link' && <LinkIcon className="h-6 w-6 text-muted-foreground" />}
                                            {item.type === 'pdf' && <FilePdf className="h-6 w-6 text-muted-foreground" />}
                                            <span className="flex-grow truncate">{item.title}</span>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" onClick={() => handleUnarchive(item.id)}><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(item, true)}><Trash2 className="mr-2 h-4 w-4" />Apagar</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-center text-muted-foreground"><p>Não há itens arquivados.</p></div>
                            )
                        )}
                    </div>
                </div>
                
                <ResourceModal open={modalOpen} setOpen={setModalOpen} allFolders={allFolders} disciplinas={initialData.disciplinas} editingResource={editingResource} preselectedParentId={preselectedParentId} />
                
                <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(isOpen) => setConfirmationDialog(prev => ({...prev, isOpen}))}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle><AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmationDialog.onConfirm}>Confirmar</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DndContext>
    );
}
