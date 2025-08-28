'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, createContext, useContext, useEffect } from 'react';
import { ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node } from '@/lib/types';
import { toast } from 'sonner';

// --- Tipos e Contexto ---
type DropIndicator = { overId: number; isFolder: boolean; depth: number; };
const SidebarContext = createContext<{ 
    tree: Node[]; 
    openFolders: Set<number>;
    toggleFolder: (id: number) => void;
    dropIndicator: DropIndicator | null;
}>({ tree: [], openFolders: new Set(), toggleFolder: () => {}, dropIndicator: null });

// --- Funções Auxiliares ---
function findNode(nodes: Node[], id: number): Node | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function getAllChildIds(node: Node): number[] {
    return [node.id, ...node.children.flatMap(getAllChildIds)];
}

function flattenTree(nodes: Node[]): Node[] {
    return nodes.reduce<Node[]>((acc, node) => [ ...acc, node, ...flattenTree(node.children) ], []);
}

// --- Componentes da UI ---
function ItemOverlay({ node, table }: { node: Node; table: 'documentos' | 'paginas' }) {
    return (
        <div className="flex items-center group my-1 rounded-md pr-1 bg-secondary opacity-90 shadow-lg p-2">
            <GripVertical className="w-4 h-4 text-muted-foreground mr-2"/>
            {table === 'paginas' && <span className="mr-2">{node.emoji || '📄'}</span>}
            {table === 'documentos' && <FileText className="w-4 h-4 mr-2"/>}
            <span className="truncate">{node.title}</span>
        </div>
    );
}

function SortableItem({ node, depth = 0, table }: { node: Node; depth?: number; table: 'documentos' | 'paginas' }) {
  const { openFolders, toggleFolder, dropIndicator } = useContext(SidebarContext);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });

  const isOpen = openFolders.has(node.id);
  const isDropTarget = dropIndicator?.overId === node.id;
  const isFolderDropTarget = isDropTarget && dropIndicator?.isFolder;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleSaveTitle = () => {
    if (title.trim() && title !== node.title) {
      startTransition(() => { 
        updateItemTitle(table, node.id, title).then(result => {
            if (result.error) toast.error(result.error);
            setIsEditing(false);
        }); 
      });
    } else {
        setIsEditing(false);
        setTitle(node.title);
    }
  };

  const handleCreateChild = () => startTransition(() => { 
    createItem(table, node.id).then(() => {
        if(!isOpen) toggleFolder(node.id);
    }); 
  });
  
  const handleDelete = () => {
    startTransition(() => { 
        deleteItem(table, node.id).then(res => {
            if (res.error) toast.error(res.error);
            else toast.success(`"${node.title}" foi excluído.`);
        });
    });
  };

  const href = table === 'documentos' ? `/documentos?id=${node.id}` : `/disciplinas?page=${node.id}`;

  return (
    <div ref={setNodeRef} style={style} className="relative" data-depth={depth}>
      {isDropTarget && !isFolderDropTarget && <div className="absolute top-0 h-0.5 bg-blue-500 z-10" style={{ left: `${depth * 1.5}rem`, right: 0 }} />}
      <div className={`flex items-center group my-1 rounded-md hover:bg-secondary pr-2 ${isFolderDropTarget ? 'bg-blue-500/20' : ''}`} style={{ paddingLeft: `${depth * 1.5}rem` }}>
        <button {...listeners} {...attributes} className="p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4"/>
        </button>
        
        {node.children?.length > 0 ? (
          <ChevronDown onClick={() => toggleFolder(node.id)} className={`w-4 h-4 cursor-pointer transition-transform flex-shrink-0 ${isOpen ? 'rotate-0' : '-rotate-90'}`}/>
        ) : <div className="w-4 h-4 flex-shrink-0"/>}

        {table === 'paginas' && <span className="mx-2">{node.emoji || '📄'}</span>}
        {table === 'documentos' && <FileText className="w-4 h-4 mx-2 text-muted-foreground"/>}

        {isEditing ? (
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleSaveTitle} onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()} className="bg-input text-foreground rounded px-2 py-1 flex-grow text-sm h-8" autoFocus />
        ) : (
          <Link href={href} className="flex-grow truncate py-1.5 text-sm">{node.title}</Link>
        )}

        <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setIsEditing(true)} title="Renomear" className="p-2 text-muted-foreground hover:text-foreground rounded"><Edit2 className="w-4 h-4"/></button>
          <button onClick={handleCreateChild} title="Criar Sub-item" className="p-2 text-muted-foreground hover:text-foreground rounded"><Plus className="w-4 h-4"/></button>
          <button onClick={handleDelete} title="Excluir" className="p-2 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-4 h-4"/></button>
        </div>
      </div>
      {isOpen && node.children?.map(child => <SortableItem key={child.id} node={child} depth={depth + 1} table={table} />)}
      {isDropTarget && !isFolderDropTarget && <div className="absolute bottom-0 h-0.5 bg-blue-500 z-10" style={{top: '100%', left: `${depth * 1.5}rem`, right: 0}} />}
    </div>
  );
}

// --- Componente Principal ---
interface HierarchicalSidebarProps {
  tree: Node[];
  table: 'documentos' | 'paginas';
  title: string;
}

export function HierarchicalSidebar({ tree = [], table, title }: HierarchicalSidebarProps) {
    const [activeItem, setActiveItem] = useState<Node | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [openFolders, setOpenFolders] = useState(new Set<number>());
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
    const [, startTransition] = useTransition();
    const openFolderTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { setIsMounted(true); }, []);
    
    useEffect(() => {
        setOpenFolders(new Set<number>(flattenTree(tree).filter(n => n.children.length > 0).map(n => n.id)));
    }, [tree]);

    const flattenedIds = useMemo(() => flattenTree(tree).map(n => n.id), [tree]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    
    const toggleFolder = (id: number) => {
        setOpenFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const found = findNode(tree, Number(event.active.id));
        setActiveItem(found);
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
        const { over } = event;
        const overId = over ? Number(over.id) : null;

        if (!overId) {
            setDropIndicator(null);
            return;
        }

        const overNode = findNode(tree, overId);
        if (!overNode) return;

        if (overNode.children.length > 0 && !openFolders.has(overId)) {
            openFolderTimeout.current = setTimeout(() => {
                setOpenFolders(prev => new Set(prev).add(overId));
            }, 500);
        }
        
        const overElement = over.data.current?.sortable.containerNode;
        const depth = overElement ? Number(overElement.dataset.depth) : 0;
        setDropIndicator({ overId, isFolder: overNode.children.length > 0, depth });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
        setActiveItem(null);
        setDropIndicator(null);

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeNode = findNode(tree, Number(active.id));
        const overNode = findNode(tree, Number(over.id));
        if (!activeNode || !overNode) return;
        
        // --- LÓGICA DE SEGURANÇA ---
        // Impede que uma pasta seja movida para dentro de si mesma ou de seus filhos
        const descendantIds = getAllChildIds(activeNode);
        if (descendantIds.includes(overNode.id)) {
            toast.error("Não é possível mover uma pasta para dentro de si mesma.");
            return;
        }

        // --- LÓGICA DE REORDENAÇÃO ---
        const isOverFolder = overNode.children.length > 0;
        const newParentId = isOverFolder ? overNode.id : overNode.parent_id;

        if (activeNode.parent_id !== newParentId || activeNode.id !== overNode.id) {
             startTransition(() => { 
                updateItemParent(table, activeNode.id, newParentId).then(result => {
                    if (result.error) toast.error(result.error);
                });
            });
        }
    };
    
    const handleCreateRoot = () => {
        startTransition(() => { 
            createItem(table, null).then(result => {
                if (result?.error) toast.error(result.error);
            }); 
        });
    };

    return (
        <SidebarContext.Provider value={{ tree, openFolders, toggleFolder, dropIndicator }}>
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter}
                onDragStart={handleDragStart} 
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd} 
                onDragCancel={() => { setActiveItem(null); setDropIndicator(null); }}
            >
                <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b">
                        <h2 className="text-lg font-bold uppercase tracking-wider">{title}</h2>
                        <button onClick={handleCreateRoot} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full" title={`Criar ${table === 'documentos' ? 'Documento' : 'Disciplina'} Raiz`}>
                            <Plus className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                        <SortableContext items={flattenedIds} strategy={verticalListSortingStrategy}>
                            {tree.map(node => <SortableItem key={node.id} node={node} table={table} />)}
                        </SortableContext>
                    </div>
                </div>
                
                {isMounted && createPortal(
                    <DragOverlay>
                        {activeItem ? <ItemOverlay node={activeItem} table={table} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </SidebarContext.Provider>
    );
}
