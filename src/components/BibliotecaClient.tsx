'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createResource, deleteResource, updateResource, moveResource, updateResourcesOrder, updateResourceStatus } from '@/app/actions';
import { type Resource, type Disciplina } from '@/lib/types';
import { toast } from 'sonner';
import { Folder, Link as LinkIcon, FilePdf, Plus, MoreVertical, Edit, Trash2, Home, ChevronRight, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableResourceItem({ resource, onSelect }: { resource: Resource; onSelect: (resource: Resource) => void; }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: resource.id });

    const style = { transform: CSS.Transform.toString(transform), transition };

    const handleDelete = () => {
        if (confirm(`Tem a certeza de que deseja apagar "${resource.title}"?`)) {
            startTransition(async () => {
                await deleteResource(resource);
                toast.success("Recurso apagado.");
            });
        }
    };

    const handleArchive = () => {
        startTransition(async () => {
            await updateResourceStatus(resource.id, 'arquivado');
            toast.success("Recurso arquivado.");
        });
    };

    const handleItemClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        
        if (resource.type === 'folder') {
            router.push(`/biblioteca?folderId=${resource.id}`);
        } else if (resource.url) {
            window.open(resource.url, '_blank');
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="bg-card p-2 rounded-lg border flex flex-col group relative touch-none">
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" {...listeners}>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onSelect(resource)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleArchive}><Archive className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Apagar</DropdownMenuItem>
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

function ResourceModal({ open, setOpen, currentFolderId, disciplinas, editingResource }: { open: boolean, setOpen: (open: boolean) => void, currentFolderId: number | null, disciplinas: Disciplina[], editingResource: Resource | null }) {
    const [type, setType] = useState<'link' | 'pdf' | 'folder'>('link');
    const [isPending, startTransition] = useTransition();

    const action = editingResource ? updateResource : createResource;

    const handleSubmit = (formData: FormData) => {
        if (!editingResource) {
            formData.append('parent_id', String(currentFolderId));
        } else {
            formData.append('id', String(editingResource.id));
        }
        
        startTransition(async () => {
            const result = await action(formData);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`Recurso ${editingResource ? 'atualizado' : 'criado'} com sucesso!`);
                setOpen(false);
            }
        });
    };
    
    useState(() => {
        if (editingResource) setType(editingResource.type);
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingResource ? 'Editar Recurso' : 'Adicionar Novo Recurso'}</DialogTitle>
                </DialogHeader>
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
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição (Opcional)</Label>
                            <Textarea id="description" name="description" defaultValue={editingResource?.description || ''} rows={2} />
                        </div>
                    )}
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
                    {type !== 'folder' && (
                        <div className="space-y-2">
                            <Label htmlFor="disciplina_id">Vincular à Disciplina (Opcional)</Label>
                            <Select name="disciplina_id" defaultValue={String(editingResource?.disciplina_id || 'null')}>
                                <SelectTrigger><SelectValue placeholder="Selecione uma disciplina..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Nenhuma</SelectItem>
                                    {disciplinas.map(d => (
                                        <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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

// CORREÇÃO: Usamos 'export default' para garantir que o componente seja encontrado corretamente.
export default function BibliotecaClient({ folders, items, disciplinas, breadcrumbs }: { folders: Resource[], items: Resource[], disciplinas: Disciplina[], breadcrumbs: Resource[] }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentFolderId = Number(searchParams.get('folderId')) || null;
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);

    const handleEdit = (resource: Resource) => {
        setEditingResource(resource);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingResource(null);
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* Breadcrumbs */}
                <div className="flex items-center text-sm text-muted-foreground">
                    <Home className="h-4 w-4 mr-2 cursor-pointer" onClick={() => router.push('/biblioteca')} />
                    {breadcrumbs.map(b => (
                        <div key={b.id} className="flex items-center">
                            <ChevronRight className="h-4 w-4" />
                            <span className="mx-2 cursor-pointer hover:text-primary" onClick={() => router.push(`/biblioteca?folderId=${b.id}`)}>{b.title}</span>
                        </div>
                    ))}
                </div>
                <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
            </div>
            
            <ResourceModal open={modalOpen} setOpen={setModalOpen} currentFolderId={currentFolderId} disciplinas={disciplinas} editingResource={editingResource} />
            
            {/* Grelha de Recursos */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {folders.map(folder => (
                    <SortableResourceItem key={folder.id} resource={folder} onSelect={handleEdit} />
                ))}
                {items.map(item => (
                    <SortableResourceItem key={item.id} resource={item} onSelect={handleEdit} />
                ))}
            </div>
             {(folders.length === 0 && items.length === 0) && (
                <p className="text-muted-foreground col-span-full text-center py-12">Esta pasta está vazia.</p>
            )}
        </div>
    );
}
