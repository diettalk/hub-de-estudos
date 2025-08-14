// src/components/BibliotecaClient.tsx

'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Folder, Link as LinkIcon, FilePdf, Plus, MoreVertical, Edit, Trash2, Home, ChevronRight, Archive, ArchiveRestore, GripVertical } from 'lucide-react';
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

// Componente para um item individual que pode ser arrastado
function SortableItem({ resource, onSelect, onArchive, onDelete }: { resource: Resource; onSelect: (res: Resource) => void; onArchive: (id: number) => void; onDelete: (res: Resource, isPermanent: boolean) => void; }) {
    const router = useRouter();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resource.id });
    
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition: transition || 'transform 250ms ease-in-out',
        zIndex: isDragging ? 10 : 'auto',
    };

    const handleItemClick = (e: React.MouseEvent) => {
        // Impede a navegação se o clique for num botão dentro do item
        if ((e.target as HTMLElement).closest('button')) return;
        
        if (resource.type === 'folder') {
            router.push(`/biblioteca?folderId=${resource.id}`);
        } else if (resource.url) {
            window.open(resource.url, '_blank', 'noopener,noreferrer');
        } else if (resource.file_path) {
            // A lógica para obter a URL pública do Supabase Storage será adicionada aqui
            toast.info("A pré-visualização de PDFs será implementada em breve.");
        }
    };

    const getIcon = () => {
        switch (resource.type) {
            case 'folder': return <Folder className="h-10 w-10 text-amber-500 mb-2" />;
            case 'link': return <LinkIcon className="h-10 w-10 text-sky-500 mb-2" />;
            case 'pdf': return <FilePdf className="h-10 w-10 text-red-500 mb-2" />;
            default: return null;
        }
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="bg-card p-2 rounded-lg border flex flex-col group relative touch-none transition-all duration-200 hover:shadow-lg hover:border-primary"
            onClick={handleItemClick}
        >
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-card/80 backdrop-blur-sm rounded-md">
                <div {...attributes} {...listeners} className="cursor-grab p-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onSelect(resource)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(resource.id)}><Archive className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(resource, true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Apagar Permanentemente
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="cursor-pointer flex-grow flex flex-col items-center justify-center text-center p-2">
                {getIcon()}
                <p className="font-medium text-xs break-all line-clamp-2">{resource.title}</p>
            </div>
        </div>
    );
}

// Modal para criar/editar recursos
function ResourceModal({ open, setOpen, currentFolderId, disciplinas, editingResource, defaultType }: { open: boolean; setOpen: (o: boolean) => void; currentFolderId: number | null; disciplinas: Disciplina[]; editingResource: Resource | null; defaultType?: 'folder' | 'link' | 'pdf' }) {
    const [type, setType] = useState(defaultType || 'link');
    const [isPending, startTransition] = useTransition();
    const formAction = editingResource ? updateResource : createResource;

    useEffect(() => {
        if (open) {
            if (editingResource) {
                setType(editingResource.type);
            } else {
                setType(defaultType || 'link');
            }
        }
    }, [editingResource, defaultType, open]);

    const handleSubmit = (formData: FormData) => {
        if (!editingResource) {
            formData.append('parent_id', String(currentFolderId));
        } else {
            formData.append('id', String(editingResource.id));
        }
        
        startTransition(async () => {
            const result = await formAction(formData);
            if (result?.error) {
                toast.error(result.error);
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
                            <Label htmlFor="type">Tipo</Label>
                            <Select name="type" value={type} onValueChange={(value: 'link' | 'pdf' | 'folder') => setType(value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="folder">Pasta</SelectItem>
                                    <SelectItem value="link">Link</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" name="title" defaultValue={editingResource?.title || ''} required />
                    </div>
                    {type !== 'folder' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição (Opcional)</Label>
                                <Textarea id="description" name="description" defaultValue={editingResource?.description || ''} rows={2} />
                            </div>
                            {type === 'link' && (
                                <div className="space-y-2">
                                    <Label htmlFor="url">URL</Label>
                                    <Input id="url" name="url" type="url" defaultValue={editingResource?.url || ''} placeholder="https://..." />
                                </div>
                            )}
                            {type === 'pdf' && (
                                <div className="space-y-2">
                                    <Label htmlFor="file">Ficheiro PDF</Label>
                                    <Input id="file" name="file" type="file" accept=".pdf" />
                                    {editingResource?.file_name && <p className="text-xs text-muted-foreground mt-1">Ficheiro atual: {editingResource.file_name}</p>}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="disciplina_id">Vincular à Disciplina (Opcional)</Label>
                                <Select name="disciplina_id" defaultValue={String(editingResource?.disciplina_id || 'null')}>
                                    <SelectTrigger><SelectValue placeholder="Selecione uma disciplina..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">Nenhuma</SelectItem>
                                        {disciplinas.map(d => (<SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>))}
                                    </SelectContent>
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

// Componente principal da Biblioteca
export default function BibliotecaClient({ initialData, currentFolderId }: { initialData: Awaited<ReturnType<typeof import('../app/actions').getBibliotecaData>>, currentFolderId: number | null }) {
    const router = useRouter();
    
    const [folders, setFolders] = useState(initialData.folders);
    const [items, setItems] = useState(initialData.items);
    const [archivedItems, setArchivedItems] = useState(initialData.archivedItems);
    const [view, setView] = useState<'active' | 'archived'>('active');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [defaultModalType, setDefaultModalType] = useState<'folder'|'link'|'pdf'>('link');
    const [isPending, startTransition] = useTransition();
    
    const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => {},
    });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // Sincroniza o estado com os dados iniciais quando a pasta muda
    useEffect(() => {
        setFolders(initialData.folders);
        setItems(initialData.items);
        setArchivedItems(initialData.archivedItems);
    }, [initialData]);

    const handleEdit = (resource: Resource) => {
        setEditingResource(resource);
        setModalOpen(true);
    };

    const handleAddNew = (type: 'folder'|'link'|'pdf' = 'link') => {
        setEditingResource(null);
        setDefaultModalType(type);
        setModalOpen(true);
    };
    
    const handleArchive = (id: number) => startTransition(async () => {
        const result = await updateResourceStatus(id, 'arquivado');
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Recurso arquivado.");
            // Atualização otimista da UI
            const itemToArchive = [...folders, ...items].find(i => i.id === id);
            if (itemToArchive) {
                setFolders(folders.filter(f => f.id !== id));
                setItems(items.filter(i => i.id !== id));
                setArchivedItems(prev => [...prev, itemToArchive]);
            }
        }
    });
    
    const handleUnarchive = (id: number) => startTransition(async () => {
        const result = await updateResourceStatus(id, 'ativo');
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Recurso restaurado.");
            // Atualização otimista da UI
            const itemToRestore = archivedItems.find(i => i.id === id);
            if (itemToRestore) {
                setArchivedItems(prev => prev.filter(i => i.id !== id));
                // Adiciona de volta à lista correta (pasta ou item)
                if (itemToRestore.type === 'folder') {
                    setFolders(prev => [...prev, itemToRestore]);
                } else {
                    setItems(prev => [...prev, itemToRestore]);
                }
            }
        }
    });

    const handleDelete = (resource: Resource, isPermanent: boolean) => {
        setConfirmationDialog({
            isOpen: true,
            title: `Apagar ${resource.title}?`,
            description: isPermanent 
                ? "Esta ação é irreversível e apagará o item e todo o seu conteúdo permanentemente."
                : "Tem a certeza que deseja mover este item para o arquivo?",
            onConfirm: () => {
                startTransition(async () => {
                    // Usamos a nova action que agora sabe se é para arquivar ou apagar
                    const result = await deleteResource(resource.id, isPermanent);
                     if (result.error) {
                        toast.error(result.error);
                    } else {
                        toast.success(`Recurso ${isPermanent ? 'apagado' : 'arquivado'}.`);
                    }
                });
            }
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeIsFolder = folders.some(f => f.id === active.id);
        const overIsFolder = folders.some(f => f.id === over.id);
        const overIsItem = items.some(i => i.id === over.id);

        // Mover um item para dentro de uma pasta
        if (!activeIsFolder && overIsFolder) {
            toast.info(`A mover "${active.data?.current?.title}" para "${over.data?.current?.title}"...`);
            startTransition(() => { moveResource(Number(active.id), Number(over.id)); });
            setItems(prev => prev.filter(item => item.id !== active.id));
            return;
        }

        // Reordenar (apenas se os dois itens forem do mesmo tipo)
        if ((activeIsFolder && overIsFolder) || (!activeIsFolder && overIsItem)) {
            const sourceList = activeIsFolder ? folders : items;
            const setSourceList = activeIsFolder ? setFolders : setItems;
            
            const oldIndex = sourceList.findIndex(i => i.id === active.id);
            const newIndex = sourceList.findIndex(i => i.id === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                const newList = arrayMove(sourceList, oldIndex, newIndex);
                setSourceList(newList);
                const orderedItems = newList.map((item, index) => ({ id: item.id, ordem: index }));
                startTransition(() => { updateResourcesOrder(orderedItems); });
            }
        }
    };

    const displayedItems = useMemo(() => {
        return view === 'active' ? [...folders, ...items] : archivedItems;
    }, [view, folders, items, archivedItems]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center text-sm text-muted-foreground overflow-x-auto whitespace-nowrap py-1">
                    <Button variant="ghost" size="sm" className="flex items-center" onClick={() => router.push('/biblioteca')}>
                        <Home className="h-4 w-4 mr-1" />
                        Home
                    </Button>
                    {initialData.breadcrumbs.map(b => (
                        <div key={b.id} className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1 text-muted" />
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/biblioteca?folderId=${b.id}`)}>{b.title}</Button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setView(view === 'active' ? 'archived' : 'active')} variant="outline">
                        {view === 'active' ? <Archive className="mr-2 h-4 w-4" /> : <ArchiveRestore className="mr-2 h-4 w-4" />}
                        {view === 'active' ? `Arquivados (${archivedItems.length})` : 'Ativos'}
                    </Button>
                    <Button onClick={() => handleAddNew('link')}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                </div>
            </div>
            
            <ResourceModal open={modalOpen} setOpen={setModalOpen} currentFolderId={currentFolderId} disciplinas={initialData.disciplinas} editingResource={editingResource} defaultType={defaultModalType} />
            
            <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(isOpen) => setConfirmationDialog(prev => ({...prev, isOpen}))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmationDialog.onConfirm}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {view === 'active' ? (
                    <div className="space-y-8">
                        {/* Secção de Pastas */}
                        <div>
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h2 className="text-xl font-semibold tracking-tight">Pastas</h2>
                                <Button variant="ghost" size="sm" onClick={() => handleAddNew('folder')}><Plus className="mr-2 h-4 w-4" /> Criar Pasta</Button>
                            </div>
                            {folders.length > 0 ? (
                                <SortableContext items={folders} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                        {folders.map(folder => <SortableItem key={folder.id} resource={folder} onSelect={handleEdit} onArchive={handleArchive} onDelete={handleDelete} />)}
                                    </div>
                                </SortableContext>
                            ) : (<p className="text-muted-foreground text-center py-8">Nenhuma pasta aqui. Arraste um recurso para uma pasta para o mover.</p>)}
                        </div>
                        
                        {/* Secção de Recursos */}
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">Recursos Gerais</h2>
                            {items.length > 0 ? (
                                <SortableContext items={items} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                        {items.map(item => <SortableItem key={item.id} resource={item} onSelect={handleEdit} onArchive={handleArchive} onDelete={handleDelete} />)}
                                    </div>
                                </SortableContext>
                            ) : (<p className="text-muted-foreground text-center py-8">Nenhum recurso aqui. Crie um novo ou navegue para uma pasta.</p>)}
                        </div>
                    </div>
                ) : (
                    // Vista de Arquivados
                    <div className="space-y-8">
                        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Arquivados</h2>
                        {archivedItems.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
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
                        ) : (<p className="text-muted-foreground text-center py-12">Não há itens arquivados.</p>)}
                    </div>
                )}
            </DndContext>
        </div>
    );
}
