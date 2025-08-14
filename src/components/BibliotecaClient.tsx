// src/components/BibliotecaClient.tsx

'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import BibliotecaSidebar, { buildTree } from './BibliotecaSidebar';
import { FolderModal } from './FolderModal'; // Importa o novo modal
import { ResourceModal } from './ResourceModal'; // Supondo que você extraiu o ResourceModal para seu próprio ficheiro

// Se não extraiu o ResourceModal, mantenha-o aqui. Para organização, é melhor extrair.
// Vamos assumir que você criou o ResourceModal.tsx similar ao FolderModal.tsx

export default function BibliotecaClient({ initialData }: { initialData: Awaited<ReturnType<typeof import('../app/actions').getBibliotecaData>> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFolderId = useMemo(() => Number(searchParams.get('folderId')) || null, [searchParams]);

    const [resources, setResources] = useState(initialData.activeResources);
    const [archivedItems] = useState(initialData.archivedItems);
    
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [activeDragItem, setActiveDragItem] = useState<Resource | null>(null);
    
    const [resourceModalOpen, setResourceModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [preselectedParentId, setPreselectedParentId] = useState<number | null>(null);
    const [, startTransition] = useTransition();
    
    const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    
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
                    router.refresh();
                    return success;
                },
                error: (err) => `Erro: ${err.message}`
            });
        });
    };

    const handleAddNew = (type: 'folder' | 'link' | 'pdf', parentId: number | null) => {
        setEditingResource(null);
        setPreselectedParentId(parentId);
        if (type === 'folder') {
            setFolderModalOpen(true);
        } else {
            setResourceModalOpen(true);
        }
    };
    
    const handleEdit = (resource: Resource) => {
        setEditingResource(resource);
        setPreselectedParentId(resource.parent_id);
        if (resource.type === 'folder') {
            setFolderModalOpen(true);
        } else {
            setResourceModalOpen(true);
        }
    };

    const handleDelete = (resource: Resource, isPermanent: boolean) => {
        setConfirmationDialog({
            isOpen: true,
            title: `Apagar "${resource.title}"?`,
            description: isPermanent ? "Ação irreversível. O item e todos os seus conteúdos serão apagados permanentemente." : "O item será movido para o arquivo.",
            onConfirm: () => handleAction(deleteResource(resource.id, isPermanent), 'A apagar...', `Recurso ${isPermanent ? 'apagado' : 'arquivado'}.`)
        });
    };
    
    const handleArchive = (id: number) => handleAction(updateResourceStatus(id, 'arquivado'), 'A arquivar...', 'Recurso arquivado.');
    const handleUnarchive = (id: number) => handleAction(updateResourceStatus(id, 'ativo'), 'A restaurar...', 'Recurso restaurado.');
    const handleMoveItem = (itemId: number, newParentId: number | null) => handleAction(updateItemParent('resources', itemId, newParentId), 'A mover...', 'Item movido.');

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragItem(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = Number(active.id);
        const overId = Number(over.id);
        const activeItem = resources.find(r => r.id === activeId);
        const overItem = resources.find(r => r.id === overId);
        if (!activeItem || !overItem) return;

        if (overItem.type === 'folder' && activeItem.parent_id !== overId) {
            handleMoveItem(activeId, overId);
            return;
        }

        if (activeItem.parent_id === overItem.parent_id) {
            const activeIndex = resources.findIndex(r => r.id === activeId);
            const overIndex = resources.findIndex(r => r.id === overId);
            const newItems = arrayMove(resources, activeIndex, overIndex);
            setResources(newItems);

            const parentId = activeItem.parent_id;
            const itemsInLevel = newItems.filter(item => item.parent_id === parentId);
            const updates = itemsInLevel.map((item, index) => ({ id: item.id, ordem: index, parent_id: item.parent_id }));
            startTransition(() => updateResourcesOrder(updates));
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveDragItem(resources.find(r => r.id === e.active.id) || null)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragItem(null)}>
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-120px)]">
                <SortableContext items={flattenedIds} strategy={verticalListSortingStrategy}>
                    <BibliotecaSidebar tree={tree} onAddNew={(type, parentId) => handleAddNew('folder', parentId)} onEdit={handleEdit} onArchive={handleArchive} onDelete={handleDelete} onMove={handleMoveItem} selectedFolderId={currentFolderId} allResources={resources} />
                </SortableContext>

                <div className="bg-card p-4 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h1 className="text-2xl font-bold tracking-tight">{currentFolder ? currentFolder.title : "Recursos Gerais"}</h1>
                        <div className="flex gap-2">
                            <Button onClick={() => setView(view === 'active' ? 'archived' : 'active')} variant="outline"><Archive className="mr-2 h-4 w-4" /> {view === 'active' ? `Arquivados (${archivedItems.length})` : 'Ativos'}</Button>
                            <Button onClick={() => handleAddNew('link', currentFolderId)}><Plus className="mr-2 h-4 w-4" /> Adicionar Recurso</Button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-1">
                        {/* ... (código da vista de conteúdo permanece o mesmo) ... */}
                    </div>
                </div>
                
                <ResourceModal open={resourceModalOpen} setOpen={setResourceModalOpen} allFolders={allFolders} disciplinas={initialData.disciplinas} editingResource={editingResource} preselectedParentId={preselectedParentId} />
                <FolderModal open={folderModalOpen} setOpen={setFolderModalOpen} allFolders={allFolders} editingResource={editingResource} preselectedParentId={preselectedParentId} />

                <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(isOpen) => setConfirmationDialog(prev => ({...prev, isOpen}))}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle><AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmationDialog.onConfirm}>Confirmar</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {createPortal(<DragOverlay>{activeDragItem ? <div className="bg-primary text-primary-foreground p-2 rounded-md shadow-lg">{activeDragItem.title}</div> : null}</DragOverlay>, document.body)}
            </div>
        </DndContext>
    );
}
