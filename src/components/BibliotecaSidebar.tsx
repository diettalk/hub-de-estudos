// src/components/BibliotecaSidebar.tsx

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type Resource } from '@/lib/types';
import { Plus, Folder, Link as LinkIcon, FilePdf, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HierarchicalResource = Resource & { children: HierarchicalResource[] };

// Função para construir a árvore a partir de uma lista plana de recursos
function buildTree(resources: Resource[]): HierarchicalResource[] {
    const resourceMap = new Map<number, HierarchicalResource>();
    const tree: HierarchicalResource[] = [];

    resources.forEach(resource => {
        resourceMap.set(resource.id, { ...resource, children: [] });
    });

    resources.forEach(resource => {
        const node = resourceMap.get(resource.id);
        if (node) {
            if (resource.parent_id && resourceMap.has(resource.parent_id)) {
                resourceMap.get(resource.parent_id)?.children.push(node);
            } else {
                tree.push(node);
            }
        }
    });

    return tree;
}

// Componente recursivo para renderizar cada item da árvore
function TreeItem({ item, level, onAddNew }: { item: HierarchicalResource; level: number; onAddNew: (type: 'folder' | 'link' | 'pdf', parentId: number | null) => void; }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFolderId = Number(searchParams.get('folderId')) || null;
    const isActive = currentFolderId === item.id;
    const [isExpanded, setIsExpanded] = useState(true);

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
            // Se for um ficheiro, seleciona a pasta pai
            router.push(item.parent_id ? `/biblioteca?folderId=${item.parent_id}` : '/biblioteca');
        }
    };

    return (
        <div>
            <div
                onClick={handleSelect}
                style={{ paddingLeft: `${level * 1.25}rem` }}
                className={cn(
                    "flex items-center py-1.5 pr-2 rounded-md cursor-pointer group hover:bg-accent",
                    isActive && "bg-accent text-accent-foreground"
                )}
            >
                {item.type === 'folder' && item.children.length > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                )}
                {getIcon(item.type)}
                <span className="flex-grow text-sm truncate">{item.title}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); onAddNew('folder', item.id); }}
                    className="opacity-0 group-hover:opacity-100 ml-auto"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
            {isExpanded && item.children.map(child => (
                <TreeItem key={child.id} item={child} level={level + 1} onAddNew={onAddNew} />
            ))}
        </div>
    );
}


export default function BibliotecaSidebar({ resources, onAddNew }: { resources: Resource[], onAddNew: (type: 'folder' | 'link' | 'pdf', parentId: number | null) => void; }) {
    const router = useRouter();
    const tree = buildTree(resources);

    return (
        <div className="h-full bg-muted/40 p-2 rounded-lg flex flex-col">
            <div className="p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/biblioteca')}>
                    Biblioteca Raiz
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1">
                {tree.map(item => (
                    <TreeItem key={item.id} item={item} level={0} onAddNew={onAddNew}/>
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
