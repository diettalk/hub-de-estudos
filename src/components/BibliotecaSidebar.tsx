// src/components/BibliotecaSidebar.tsx

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { type Resource } from '@/lib/types';
import { Plus, Folder, Link as LinkIcon, FilePdf, ChevronDown, ChevronRight, MoreVertical, Edit, Archive, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export type HierarchicalResource = Resource & { children: HierarchicalResource[] };

// Função para construir a árvore a partir de uma lista plana de recursos
export function buildTree(resources: Resource[], parentId: number | null = null): HierarchicalResource[] {
    return resources
        .filter(resource => resource.parent_id === parentId)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map(resource => ({
            ...resource,
            children: buildTree(resources, resource.id)
        }));
}

// Componente recursivo para renderizar cada item da árvore
function SortableTreeItem({ 
    item, 
    level, 
    onAddNew,
    onEdit,
    onArchive,
    onDelete,
    selectedFolderId 
}: { 
    item: HierarchicalResource; 
    level: number; 
    onAddNew: (type: 'folder' | 'link' | 'pdf', parentId: number | null) => void;
    onEdit: (resource: Resource) => void;
    onArchive: (id: number) => void;
    onDelete: (resource: Resource, isPermanent: boolean) => void;
    selectedFolderId: number | null;
}) {
    const router = useRouter();
    const isActive = selectedFolderId === item.id && item.type === 'folder';
    const [isExpanded, setIsExpanded] = React.useState(true);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getIcon = (type: Resource['type']) => {
        switch (type) {
            case 'folder': return <Folder className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0" />;
            case 'link': return <LinkIcon className="h-4 w-4 mr-2 text-sky-500 flex-shrink-0" />;
            case 'pdf': return <FilePdf className="h-4 w-4 mr-2 text-red-500 flex-shrink-0" />;
            default: return null;
        }
    };

    const handleSelect = () => {
        if (item.type === 'folder') {
            router.push(`/biblioteca?folderId=${item.id}`);
        } else {
            router.push(item.parent_id ? `/biblioteca?folderId=${item.parent_id}` : '/biblioteca');
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div
                style={{ paddingLeft: `${level * 1.25}rem` }}
                className={cn(
                    "flex items-center py-1 pr-2 rounded-md group hover:bg-accent",
                    isActive && "bg-accent text-accent-foreground"
                )}
            >
                <div {...listeners} {...attributes} className="p-1 cursor-grab" title="Mover">
                    <GripVertical className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                </div>
                
                <div className="flex-grow flex items-center cursor-pointer" onClick={handleSelect}>
                    {item.type === 'folder' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="p-0.5 rounded-sm hover:bg-muted-foreground/20 -ml-1 mr-1"
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    )}
                    {getIcon(item.type)}
                    <span className="flex-grow text-sm truncate">{item.title}</span>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 ml-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                             <DropdownMenuItem onClick={() => onEdit(item)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                             {item.type === 'folder' && <DropdownMenuItem onClick={() => onAddNew('folder', item.id)}><Plus className="mr-2 h-4 w-4" /> Nova Subpasta</DropdownMenuItem>}
                             <DropdownMenuItem onClick={() => onArchive(item.id)}><Archive className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => onDelete(item, true)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Apagar</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {isExpanded && item.children.map(child => (
                <SortableTreeItem 
                    key={child.id} 
                    item={child} 
                    level={level + 1} 
                    onAddNew={onAddNew}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    selectedFolderId={selectedFolderId}
                />
            ))}
        </div>
    );
}

export default function BibliotecaSidebar({ 
    tree,
    onAddNew,
    onEdit,
    onArchive,
    onDelete,
    selectedFolderId
}: { 
    tree: HierarchicalResource[], 
    onAddNew: (type: 'folder' | 'link' | 'pdf', parentId: number | null) => void;
    onEdit: (resource: Resource) => void;
    onArchive: (id: number) => void;
    onDelete: (resource: Resource, isPermanent: boolean) => void;
    selectedFolderId: number | null;
}) {
    const router = useRouter();

    return (
        <div className="h-full bg-muted/40 p-2 rounded-lg flex flex-col">
            <div className="p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/biblioteca')}>
                    Biblioteca Raiz
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1">
                {tree.map(item => (
                    <SortableTreeItem 
                        key={item.id} 
                        item={item} 
                        level={0} 
                        onAddNew={onAddNew}
                        onEdit={onEdit}
                        onArchive={onArchive}
                        onDelete={onDelete}
                        selectedFolderId={selectedFolderId}
                    />
                ))}
            </div>
            <div className="mt-auto p-2 border-t">
                 <Button className="w-full" onClick={() => onAddNew('folder', null)}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Pasta na Raiz
                </Button>
            </div>
        </div>
    );
}
