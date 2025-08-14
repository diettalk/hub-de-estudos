'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createResource, deleteResource, updateResource, moveResource, updateResourcesOrder, updateResourceStatus } from '@/app/actions';
import { type Resource, type Disciplina } from '@/lib/types';
import { toast } from 'sonner';
import { Folder, Link as LinkIcon, FilePdf, Plus, MoreVertical, Edit, Trash2, Home, ChevronRight, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente para um item individual que pode ser arrastado
function SortableItem({ resource, onSelect, onArchive, onDelete }: { resource: Resource; onSelect: (res: Resource) => void; onArchive: (id: number) => void; onDelete: (res: Resource) => void; }) {
    const router = useRouter();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: resource.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const handleItemClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (resource.type === 'folder') router.push(`/biblioteca?folderId=${resource.id}`);
        else if (resource.url) window.open(resource.url, '_blank');
        else if (resource.file_path) {
            // Constrói o URL público do ficheiro
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/resources/${resource.file_path}`;
            window.open(publicUrl, '_blank');
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="bg-card p-2 rounded-lg border flex flex-col group relative touch-none">
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6" {...listeners}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onSelect(resource)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(resource.id)}><Archive className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(resource)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Apagar</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div onClick={handleItemClick} className="cursor-pointer flex-grow flex flex-col items-center justify-center text-center p-2">
                {resource.type === 'folder' && <Folder className="h-10 w-10 text-primary mb-2" />}
                {resource.type === 'link' && <LinkIcon className="h-10 w-10 text-blue-500 mb-2" />}
                {resource.type === 'pdf' && <FilePdf className="h-10 w-10 text-red-500 mb-2" />}
                <p className="font-medium text-xs break-all line-clamp-2">{resource.title}</p>
            </div>
        </div>
    );
}

// Modal para criar/editar recursos
function ResourceModal({ open, setOpen, currentFolderId, disciplinas, editingResource, defaultType }: { open: boolean; setOpen: (o: boolean) => void; currentFolderId: number | null; disciplinas: Disciplina[]; editingResource: Resource | null; defaultType?: 'folder' | 'link' | 'pdf' }) {
    const [type, setType] = useState(defaultType || 'link');
    const [isPending, startTransition] = useTransition();
    const action = editingResource ? updateResource : createResource;

    useEffect(() => {
        if (editingResource) setType(editingResource.type);
        else setType(defaultType || 'link');
    }, [editingResource, defaultType, open]);

    const handleSubmit = (formData: FormData) => {
        if (!editingResource) formData.append('parent_id', String(currentFolderId));
        else formData.append('id', String(editingResource.id));
        
        startTransition(async () => {
            const result = await action(formData);
            if (result?.error) toast.error(result.error);
            else {
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
export default function BibliotecaClient({ folders: initialFolders, items: initialItems, archivedItems, disciplinas, breadcrumbs }: { folders: Resource[], items: Resource[], archivedItems: Resource[], disciplinas: Disciplina[], breadcrumbs: Resource[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFolderId = Number(searchParams.get('folderId')) || null;
    
    const [folders, setFolders] = useState(initialFolders);
    const [items, setItems] = useState(initialItems);
    const [view, setView] = useState<'active' | 'archived'>('active');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [defaultModalType, setDefaultModalType] = useState<'folder'|'link'|'pdf'>('link');
    const [, startTransition] = useTransition();

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
        await updateResourceStatus(id, 'arquivado');
        toast.success("Recurso arquivado.");
    });
    
    const handleUnarchive = (id: number) => startTransition(async () => {
        await updateResourceStatus(id, 'ativo');
        toast.success("Recurso restaurado.");
    });

    const handleDelete = (resource: Resource) => {
        if (confirm(`Tem a certeza de que deseja apagar "${resource.title}"?`)) {
            startTransition(async () => {
                await deleteResource(resource);
                toast.success("Recurso apagado.");
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeIsFolder = folders.some(f => f.id === active.id);
        const overIsFolder = folders.some(f => f.id === over.id);

        // Mover um item para dentro de uma pasta
        if (!activeIsFolder && overIsFolder) {
            startTransition(() => { moveResource(Number(active.id), Number(over.id)); });
            setItems(prev => prev.filter(item => item.id !== active.id)); // Atualização otimista
            return;
        }

        // Reordenar
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
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Home className="h-4 w-4 mr-2 cursor-pointer hover:text-primary" onClick={() => router.push('/biblioteca')} />
                    {breadcrumbs.map(b => (
                        <div key={b.id} className="flex items-center">
                            <ChevronRight className="h-4 w-4" />
                            <span className="mx-2 cursor-pointer hover:text-primary" onClick={() => router.push(`/biblioteca?folderId=${b.id}`)}>{b.title}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setView(view === 'active' ? 'archived' : 'active')} variant="outline">
                        {view === 'active' ? <Archive className="mr-2 h-4 w-4" /> : <ArchiveRestore className="mr-2 h-4 w-4" />}
                        {view === 'active' ? 'Arquivados' : 'Ativos'}
                    </Button>
                    <Button onClick={() => handleAddNew('link')}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                </div>
            </div>
            
            <ResourceModal open={modalOpen} setOpen={setModalOpen} currentFolderId={currentFolderId} disciplinas={disciplinas} editingResource={editingResource} defaultType={defaultModalType} />
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {view === 'active' ? (
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h2 className="text-xl font-bold">Pastas</h2>
                                <Button variant="ghost" size="sm" onClick={() => handleAddNew('folder')}><Plus className="mr-2 h-4 w-4" /> Criar Pasta</Button>
                            </div>
                            {folders.length > 0 ? (
                                <SortableContext items={folders} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                        {folders.map(folder => <SortableItem key={folder.id} resource={folder} onSelect={handleEdit} onArchive={handleArchive} onDelete={handleDelete} />)}
                                    </div>
                                </SortableContext>
                            ) : (<p className="text-muted-foreground text-center py-8">Sem pastas aqui.</p>)}
                        </div>
                        
                        <div>
                            <h2 className="text-xl font-bold border-b pb-2 mb-4">Recursos</h2>
                            {items.length > 0 ? (
                                <SortableContext items={items} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                        {items.map(item => <SortableItem key={item.id} resource={item} onSelect={handleEdit} onArchive={handleArchive} onDelete={handleDelete} />)}
                                    </div>
                                </SortableContext>
                            ) : (<p className="text-muted-foreground text-center py-8">Sem recursos aqui.</p>)}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <h2 className="text-xl font-bold border-b pb-2">Arquivados</h2>
                        {archivedItems.length > 0 ? (
                            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                {archivedItems.map(item => (
                                    <div key={item.id} className="bg-card p-2 rounded-lg border flex flex-col group relative">
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnarchive(item.id)}><ArchiveRestore className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="flex-grow flex flex-col items-center justify-center text-center p-2 opacity-60">
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
