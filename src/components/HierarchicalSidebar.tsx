'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, createContext, useContext, useEffect } from 'react';
import { ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node } from '@/lib/types'; // Usaremos o nosso tipo Node centralizado
import { toast } from 'sonner';

const SidebarContext = createContext<{ tree: Node[] }>({ tree: [] });

// --- Funções Auxiliares ---
function findNode(nodes: Node[], id: number): Node | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function findNodeParent(nodes: Node[], nodeId: number): Node | null {
  for (const node of nodes) {
    if (node.children.some(child => child.id === nodeId)) return node;
    const parent = findNodeParent(node.children, nodeId);
    if (parent) return parent;
  }
  return null;
}

function flattenTree(nodes: Node[]): Node[] {
    return nodes.reduce<Node[]>((acc, node) => [
        ...acc, 
        node, 
        ...flattenTree(node.children)
    ], []);
}

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
  const { tree } = useContext(SidebarContext);
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: `${depth * 1.5}rem`
  };

  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);

  const handleClicks = () => {
    clickCount.current += 1;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      if (clickCount.current === 2) {
        const parent = findNodeParent(tree, node.id);
        const grandparentId = parent ? parent.parent_id : null;
        if (node.parent_id !== null) {
          startTransition(() => { updateItemParent(table, node.id, grandparentId); });
        }
      } else if (clickCount.current >= 3) {
        if (node.parent_id !== null) {
          startTransition(() => { updateItemParent(table, node.id, null); });
        }
      }
      clickCount.current = 0;
    }, 250);
  };

  const handleSaveTitle = () => {
    if (title.trim() && title !== node.title) {
      startTransition(() => { 
        updateItemTitle(table, node.id, title).then(() => setIsEditing(false)); 
      });
    } else {
        setIsEditing(false);
    }
  };

  const handleCreateChild = () => startTransition(() => { createItem(table, node.id); });
  const handleDelete = () => {
    if (window.confirm(`Tem a certeza de que deseja excluir "${node.title}"?`)) {
      startTransition(() => { deleteItem(table, node.id); });
    }
  };

  const href = table === 'documentos' ? `/documentos?id=${node.id}` : `/disciplinas?page=${node.id}`;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center group my-1 rounded-md hover:bg-secondary pr-2">
        <button {...listeners} {...attributes} onClick={handleClicks} className="p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing" title="Mover (2 cliques: subir nível, 3 cliques: mover para raiz)">
          <GripVertical className="w-4 h-4"/>
        </button>
        
        {node.children?.length > 0 ? (
          <ChevronDown onClick={() => setIsOpen(!isOpen)} className={`w-4 h-4 cursor-pointer transition-transform flex-shrink-0 ${isOpen ? 'rotate-0' : '-rotate-90'}`}/>
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
    </div>
  );
}

interface HierarchicalSidebarProps {
  tree: Node[];
  table: 'documentos' | 'paginas';
  title: string;
}

export function HierarchicalSidebar({ tree = [], table, title }: HierarchicalSidebarProps) {
    const [activeItem, setActiveItem] = useState<Node | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => { setIsMounted(true); }, []);

    const flattenedIds = useMemo(() => flattenTree(tree).map(n => n.id), [tree]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    
    const handleDragStart = (event: DragStartEvent) => {
        const found = findNode(tree, Number(event.active.id));
        setActiveItem(found);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveItem(null);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const activeNode = findNode(tree, Number(active.id));
            if (activeNode && activeNode.parent_id !== Number(over.id)) {
              startTransition(() => { updateItemParent(table, Number(active.id), Number(over.id)); });
            }
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
        <SidebarContext.Provider value={{ tree }}>
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveItem(null)}>
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
