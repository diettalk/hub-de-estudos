'use client';

import Link from 'next/link';
// ALTERADO: useTransition foi adicionado de volta à importação.
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical, Search, 
    FilePlus2, Pencil, Trash
} from 'lucide-react';
import { Input } from '@/components/ui/input'; 
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { 
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger 
} from '@/components/ui/context-menu';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// --- Componente Node ---
// ============================================================================
function Node({ node, style, dragHandle }: NodeRendererProps<NodeType>) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(node.data.title);
    const [, startTransition] = useTransition();
    const router = useRouter();
    const table = node.data.table;

    const refreshView = () => router.refresh();

    const handleSaveTitle = () => { /* ...código inalterado... */ };
    const handleCreateChild = () => { /* ...código inalterado... */ };
    const handleDelete = () => { /* ...código inalterado... */ };

    const href = table === 'documentos' 
        ? `/documentos?id=${node.data.id}` 
        : `/disciplinas?page=${node.data.id}`;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    style={style}
                    className={cn(
                        "relative flex items-center group my-1 rounded-md hover:bg-secondary pr-2 transition-colors",
                        node.state.isDragging && "opacity-50",
                        node.state.isSelected && "bg-primary/20",
                        node.state.willReceiveDrop && "outline-2 outline-dashed outline-primary/50"
                    )}
                >
                    {/* ALTERADO: Adicionamos relative e z-10 para trazer a alça para a frente */}
                    <span 
                        ref={dragHandle} 
                        className="relative z-10 p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing" 
                        title="Mover"
                    >
                        <GripVertical className="w-4 h-4" />
                    </span>

                    <div className="relative flex-1 flex items-center h-full">
                        {/* Guias Visuais (agora ficam para trás) */}
                        {node.parent && node.parent.level > 0 && Array.from({ length: node.parent.level }).map((_, i) => (
                            <div key={i} className="absolute left-0 top-0 h-full w-[24px]" style={{ transform: `translateX(-${(i + 1) * 24}px)` }}>
                                <div className="h-full w-px bg-slate-700/50 mx-auto"></div>
                            </div>
                        ))}
                        <div className="absolute left-0 top-0 h-1/2 w-[24px]" style={{ transform: `translateX(-24px)` }}>
                            <div className={`mx-auto ${node.isLast ? 'h-full' : 'h-1/2'} w-px bg-slate-700/50`}></div>
                            <div className="h-px w-1/2 bg-slate-700/50 absolute bottom-0 right-0"></div>
                        </div>

                        {/* Conteúdo do Nó */}
                        <div className="relative z-10 bg-card flex items-center h-full w-full">
                            {node.isLeaf ? (
                                <FileText className="w-4 h-4 mx-2 text-muted-foreground flex-shrink-0" />
                            ) : (
                                <ChevronDown
                                    onClick={() => node.toggle()}
                                    className={`w-4 h-4 mx-2 cursor-pointer transition-transform flex-shrink-0 ${node.isOpen ? 'rotate-0' : '-rotate-90'}`}
                                />
                            )}
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={handleSaveTitle}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                    className="bg-input text-foreground rounded px-2 py-1 flex-grow text-sm h-8"
                                    autoFocus
                                />
                            ) : (
                                <Link href={href} className="flex-grow truncate py-1.5 text-sm">{node.data.title}</Link>
                            )}
                        </div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {/* ...código do menu de contexto inalterado... */}
            </ContextMenuContent>
        </ContextMenu>
    );
}

// ============================================================================
// --- Componente HierarchicalSidebar ---
// ============================================================================
export function HierarchicalSidebar({
  treeData = [],
  table,
  title,
  activeId,
}: {
  treeData: NodeType[];
  table: 'documentos' | 'disciplinas';
  title: string;
  activeId?: string | null;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeApi<NodeType>>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  const processedData = useMemo(() => {
    function addTable(nodes: NodeType[]): any[] {
      return nodes.map((n) => ({ ...n, id: String(n.id), table, children: addTable(n.children) }));
    }
    return addTable(treeData);
  }, [treeData, table]);

  const storageKey = `openFolders_${table}`;
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const savedIds = JSON.parse(savedState);
        if (Array.isArray(savedIds)) {
          setOpenIds(savedIds.map(String));
        }
      } catch { localStorage.removeItem(storageKey); }
    }
    setIsLoadedFromStorage(true);
  }, [storageKey]);

  useEffect(() => {
    if (isLoadedFromStorage) {
      localStorage.setItem(storageKey, JSON.stringify(openIds));
    }
  }, [openIds, isLoadedFromStorage, storageKey]);

  useEffect(() => {
    if (activeId && treeRef.current && isLoadedFromStorage) {
      const timer = setTimeout(() => { treeRef.current?.scrollTo(activeId); }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeId, isLoadedFromStorage]);

  const handleMove = ({ dragIds, parentId }: { dragIds: string[]; parentId: string | null }) => {
    const movedItemId = Number(dragIds[0]);
    const newParentId = parentId ? Number(parentId) : null;
    startTransition(() => {
      updateItemParent(table, movedItemId, newParentId).then((result) => {
        if (result.error) toast.error(result.error);
        router.refresh();
      });
    });
  };

  const handleCreateRoot = () => {
    startTransition(() => {
      createItem(table, null).then(() => {
        router.refresh();
      });
    });
  };

  return (
    <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <h2 className="text-lg font-bold uppercase tracking-wider">{title}</h2>
        <button onClick={handleCreateRoot} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full" title={`Criar ${table === 'documentos' ? 'Documento' : 'Disciplina'} Raiz`}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-thin"><div ref={contentWidthRef} style={{ height: '1px' }}></div></div>

      <div ref={mainScrollRef} className="flex-grow overflow-auto -mr-2 pr-2">
        {processedData.length > 0 ? (
          isLoadedFromStorage && (
            <Tree<NodeType>
              ref={treeRef}
              data={processedData}
              onMove={handleMove}
              width="100%"
              rowHeight={40}
              indent={24}
              openByDefault={false}
              openIds={openIds}
              onOpenChange={(ids) => setOpenIds(ids.map(String))}
              getId={(node) => String(node.id)}
              searchTerm={searchTerm}
            >
              {Node}
            </Tree>
          )
        ) : (
          <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-sm">Nenhum item. Clique em '+' para criar.</p></div>
        )}
      </div>
    </div>
  );
}

