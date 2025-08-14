// src/components/BibliotecaClient.tsx

'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    createResource, 
    deleteResource, 
    updateResource, 
    moveResource, 
    updateResourcesOrder, 
    updateResourceStatus 
} from '@/app/actions';
import { type Resource, type Disciplina, type ConfirmationDialogState } from '@/lib/types';
import { toast } from 'sonner';
import { Folder, Link as LinkIcon, FilePdf, Plus, MoreVertical, Edit, Trash2, Archive, ArchiveRestore, GripVertical, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BibliotecaSidebar from './BibliotecaSidebar';

// Componente para um item individual na área de conteúdo (agora mais simples)
function ContentItem({ resource, onSelect, onArchive, onDelete }: { resource: Resource; onSelect: (res: Resource) => void; onArchive: (id: number) => void; onDelete: (res: Resource, isPermanent: boolean) => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resource.id });
    
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition: transition || 'transform 250ms ease-in-out',
        zIndex: isDragging ? 10 : 'auto',
    };

    const getIcon = () => {
        switch (resource.type) {
            case 'folder': return <Folder className="h-12 w-12 text-amber-500 mb-2" />;
            case 'link': return <LinkIcon className="h-12 w-12 text-sky-500 mb-2" />;
            case 'pdf': return <FilePdf className="h-12 w-12 text-red-500 mb-2" />;
            default: return null;
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-card p-2 rounded-lg border flex flex-col group relative touch-none transition-all duration-200 hover:shadow-lg hover:border-primary">
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-card/80 backdrop-blur-sm rounded-md">
                <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onSelect(resource)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(resource.id)}><Archive className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(resource, true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Apagar</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="cursor-pointer flex-grow flex flex-col items-center justify-center text-center p-2">
                {getIcon()}
                <p className="font-medium text-sm break-all line-clamp-2">{resource.title}</p>
            </div>
        </div>
    );
}

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
                            <div className="space-y-2"><Label>Vincular à Disciplina (Opcional)</Label>
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
    const [isPending, startTransition] = useTransition();
    
    const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

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
                if (result.error) toast.error(result.error);
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-120px)]">
            {/* --- BARRA LATERAL --- */}
            <BibliotecaSidebar resources={activeResources} onAddNew={handleAddNew} />

            {/* --- ÁREA DE CONTEÚDO --- */}
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

                {view === 'active' ? (
                    itemsInCurrentFolder.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-y-auto flex-grow">
                            {itemsInCurrentFolder.map(item => (
                                <ContentItem key={item.id} resource={item} onSelect={handleEdit} onArchive={handleArchive} onDelete={handleDelete} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-center text-muted-foreground">
                            <p>Esta pasta está vazia.</p>
                        </div>
                    )
                ) : (
                     archivedItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-y-auto flex-grow">
                            {archivedItems.map(item => (
                                <div key={item.id} className="bg-card/50 p-2 rounded-lg border border-dashed flex flex-col group relative opacity-70">
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" onClick={() => handleUnarchive(item.id)} className="mr-1"><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item, true)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />Apagar</Button>
                                    </div>
                                    <div className="flex-grow flex flex-col items-center justify-center text-center p-2">
                                        {item.type === 'folder' && <Folder className="h-10 w-10 text-muted-foreground mb-2" />}
                                        {item.type === 'link' && <LinkIcon className="h-10 w-10 text-muted-foreground mb-2" />}
                                        {item.type === 'pdf' && <FilePdf className="h-10 w-10 text-muted-foreground mb-2" />}
                                        <p className="font-medium text-xs break-all line-clamp-2">{item.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex-grow flex items-center justify-center text-center text-muted-foreground">
                            <p>Não há itens arquivados.</p>
                        </div>
                    )
                )}
            </div>
            
            <ResourceModal open={modalOpen} setOpen={setModalOpen} allFolders={allFolders} disciplinas={initialData.disciplinas} editingResource={editingResource} preselectedParentId={preselectedParentId} />
            
            <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(isOpen) => setConfirmationDialog(prev => ({...prev, isOpen}))}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle><AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmationDialog.onConfirm}>Confirmar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
