// src/components/BibliotecaClient.tsx

'use client';

import React, { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    createResource, 
    deleteResource, 
    updateResource, 
    updateItemParent, 
    updateResourceStatus,
    updateResourcesOrder
} from '@/app/actions';
import { type Resource, type Disciplina, type ConfirmationDialogState } from '@/lib/types';
import { toast } from 'sonner';
import { Folder, Link as LinkIcon, FilePdf, Plus, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import BibliotecaSidebar, { buildTree, HierarchicalResource } from './BibliotecaSidebar';

// Modal para criar/editar recursos
function ResourceModal({ open, setOpen, allFolders, disciplinas, editingResource, preselectedParentId }: { open: boolean; setOpen: (o: boolean) => void; allFolders: Resource[]; disciplinas: Disciplina[]; editingResource: Resource | null; preselectedParentId: number | null; }) {
    const router = useRouter();
    const [type, setType] = useState('link');
    const [isPending, startTransition] = useTransition();
    const formAction = editingResource ? updateResource : createResource;

    useEffect(() => {
        if (open) {
            if (editingResource) setType(editingResource.type);
            else setType('link');
        }
    }, [editingResource, open]);

    const handleSubmit = (formData: FormData) => {
        if (editingResource) formData.append('id', String(editingResource.id));
        
        startTransition(() => {
            toast.promise(formAction(formData), {
                loading: editingResource ? 'A atualizar recurso...' : 'A criar recurso...',
                success: (res) => {
                    if (res?.error) throw new Error(res.error);
                    setOpen(false);
                    router.refresh(); // Atualiza os dados da página
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
                        <div className="space-y-2"><Label>Tipo</Label>
                            <Select name="type" value={type} onValueChange={(value: any) => setType(value)}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="folder">Pasta</SelectItem><SelectItem value="link">Link</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="space-y-2"><Label>Guardar Em</Label>
                        <Select name="parent_id" defaultValue={String(editingResource?.parent_id || preselectedParentId || 'null')}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent><SelectItem value="null">Biblioteca Raiz</SelectItem>{allFolders.map(f => (<SelectItem key={f.id} value={String(f.id)}>{f.title}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Título</Label><Input name="title" defaultValue={editingResource?.title || ''} required /></div>
                    {type !== 'folder' && (
                        <>
                            <div className="space-y-2"><Label>Descrição</Label><Textarea name="description" defaultValue={editingResource?.description || ''} rows={2} /></div>
                            {type === 'link' && (<div className="space-y-2"><Label>URL</Label><Input name="url" type="url" defaultValue={editingResource?.url || ''} /></div>)}
                            {type === 'pdf' && (<div className="space-y-2"><Label>Ficheiro PDF</Label><Input name="file" type="file" accept=".pdf" />{editingResource?.file_name && <p className="text-xs text-muted-foreground mt-1">Atual: {editingResource.file_name}</p>}</div>)}
                            <div className="space-y-2"><Label>Vincular à Disciplina</Label>
                                <Select name="disciplina_id" defaultValue={String(editingResource?.disciplina_id || 'null')}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="null">Nenhuma</SelectItem>{disciplinas.map(d => (<SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                    <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose><Button type="submit" disabled={isPending}>{isPending ? 'A guardar...' : 'Guardar'}</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function BibliotecaClient({ initialData }: { initialData: Awaited<ReturnType<typeof import('../app/actions').getBibliotecaData>> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFolderId = useMemo(() => Number(searchParams.get('folderId')) || null, [searchParams]);

    // O estado agora serve apenas para a renderização inicial e para o drag-and-drop
    const [resources, setResources] = useState(initialData.activeResources);
    const [archivedItems] = useState(initialData.archivedItems);
    
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [activeDragItem, setActiveDragItem] = useState<Resource | null>(null);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [preselectedParentId, setPreselectedParentId] = useState<number | null>(null);
    const [, startTransition] = useTransition();
    
    const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    
    // Sincroniza o estado local se os dados do servidor mudarem
    useEffect(() => {
        setResources(initialData.activeResources);
    }, [initialData.activeResources]);

    const tree = useMemo(() => buildTree(resources), [resources]);
    const flattenedIds = useMemo(() => resources.map(r => r.id), [resources]);
    const currentFolder = useMemo(() => resources.find(r => r.id === currentFolderId), [resources, currentFolderId]);
    const itemsInCurrentFolder = useMemo(() => resources.filter(r => r.parent_id === currentFolderId), [resources, currentFolderId]);
    const allFolders = useMemo(() => resources.filter(r => r.type === 'folder'), [resources]);

    const handleAction = (actionPromise: Promise<any>, loading: string, success: string) => {
        startTransition(() => {
            toast.promise(actionPromise, {
                loading,
                success: (res) => {
                    if (res?.error) throw new Error(res.error);
                    router.refresh(); // A MÁGICA ACONTECE AQUI
                    return success;
                },
                error: (err) => `Erro: ${err.message}`
            });
        });
    };

    const handleDelete = (resource: Resource, isPermanent: boolean) => {
        setConfirmationDialog({
            isOpen: true,
            title: `Apagar "${resource.title}"?`,
            description: isPermanent ? "Ação irreversível. O item e todos os seus conteúdos serão apagados permanentemente." : "O item será movido para o arquivo.",
            onConfirm: () => handleAction(
                deleteResource(resource.id, isPermanent),
                'A apagar recurso...',
                `Recurso ${isPermanent ? 'apagado' : 'arquivado'}.`
            )
        });
    };
    
    const handleArchive = (id: number) => {
        handleAction(updateResourceStatus(id, 'arquivado'), 'A arquivar...', 'Recurso arquivado.');
    };
    
    const handleUnarchive = (id: number) => {
        handleAction(updateResourceStatus(id, 'ativo'), 'A restaurar...', 'Recurso restaurado.');
    };

    const handleMoveItem = (itemId: number, newParentId: number | null) => {
        handleAction(updateItemParent('resources', itemId, newParentId), 'A mover item...', 'Item movido com sucesso.');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragItem(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = Number(active.id);
        const overId = Number(over.id);

        const activeItem = resources.find(r => r.id === activeId);
        const overItem = resources.find(r => r.id === overId);
        if (!activeItem || !overItem) return;

        const isOverFolder = overItem.type === 'folder';
        
        if (isOverFolder && activeItem.parent_id !== overId) {
            handleMoveItem(activeId, overId);
            return;
        }

        if (activeItem.parent_id === overItem.parent_id) {
            const activeIndex = resources.findIndex(r => r.id === activeId);
            const overIndex = resources.findIndex(r => r.id === overId);
            const newItems = arrayMove(resources, activeIndex, overIndex);
            setResources(newItems); // Atualização otimista apenas para a ordem visual

            const parentId = activeItem.parent_id;
            const itemsInLevel = newItems.filter(item => item.parent_id === parentId);
            const updates = itemsInLevel.map((item, index) => ({
                id: item.id,
                ordem: index,
                parent_id: item.parent_id
            }));

            handleAction(updateResourcesOrder(updates), 'A guardar nova ordem...', 'Ordem guardada.');
        }
    };

    return (
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveDragItem(resources.find(r => r.id === e.active.id) || null)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragItem(null)}
        >
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-120px)]">
                <SortableContext items={flattenedIds} strategy={verticalListSortingStrategy}>
                    <BibliotecaSidebar 
                        tree={tree}
                        onAddNew={(type, parentId) => { setEditingResource(null); setPreselectedParentId(parentId); setModalOpen(true); }}
                        onEdit={(resource) => { setEditingResource(resource); setPreselectedParentId(resource.parent_id); setModalOpen(true); }}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onMove={handleMoveItem}
                        selectedFolderId={currentFolderId}
                    />
                </SortableContext>

                <div className="bg-card p-4 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h1 className="text-2xl font-bold tracking-tight">{currentFolder ? currentFolder.title : "Recursos Gerais"}</h1>
                        <div className="flex gap-2">
                            <Button onClick={() => setView(view === 'active' ? 'archived' : 'active')} variant="outline">
                                {view === 'active' ? <Archive className="mr-2 h-4 w-4" /> : <ArchiveRestore className="mr-2 h-4 w-4" />}
                                {view === 'active' ? `Arquivados (${archivedItems.length})` : 'Ativos'}
                            </Button>
                            <Button onClick={() => { setEditingResource(null); setPreselectedParentId(currentFolderId); setModalOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Adicionar Recurso</Button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-1">
                        {view === 'active' ? (
                            itemsInCurrentFolder.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {itemsInCurrentFolder.map(item => (
                                        <div key={item.id} className="bg-background p-3 rounded-lg flex items-center gap-3 border">
                                            {item.type === 'folder' && <Folder className="h-6 w-6 text-amber-500 flex-shrink-0" />}
                                            {item.type === 'link' && <LinkIcon className="h-6 w-6 text-sky-500 flex-shrink-0" />}
                                            {item.type === 'pdf' && <FilePdf className="h-6 w-6 text-red-500 flex-shrink-0" />}
                                            <span className="flex-grow truncate text-sm">{item.title}</span>
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
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" onClick={() => handleUnarchive(item.id)}><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(item, true)}><Trash2 className="mr-2 h-4 w-4" />Apagar</Button>
                                            </div>
                                            <div className="flex-grow flex items-center gap-3">
                                                {item.type === 'folder' && <Folder className="h-6 w-6 text-muted-foreground" />}
                                                {item.type === 'link' && <LinkIcon className="h-6 w-6 text-muted-foreground" />}
                                                {item.type === 'pdf' && <FilePdf className="h-6 w-6 text-muted-foreground" />}
                                                <span className="flex-grow truncate text-sm">{item.title}</span>
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
                {createPortal(
                    <DragOverlay>
                        {activeDragItem ? <div className="bg-primary text-primary-foreground p-2 rounded-md shadow-lg">{activeDragItem.title}</div> : null}
                    </DragOverlay>,
                    document.body
                )}
            </div>
        </DndContext>
    );
}
