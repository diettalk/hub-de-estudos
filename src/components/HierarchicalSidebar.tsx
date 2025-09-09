'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// NOVO: Importação do ícone de pesquisa e do componente de Input
import { ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical, Search } from 'lucide-react';
import { Input } from '@/components/ui/input'; 
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';

// O componente Node permanece inalterado
function Node({ node, style, dragHandle }: NodeRendererProps<NodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.data.title);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const table = node.data.table;
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);
  const refreshView = () => router.refresh();

  const handleMultiClick = () => {
    clickCount.current += 1;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      if (clickCount.current === 2) {
        const parent = node.parent;
        const grandparentId = parent?.parent?.id ?? null;
        if (node.data.parent_id !== grandparentId) {
            startTransition(() => {
                updateItemParent(table, node.data.id, grandparentId).then(refreshView);
            });
        }
      } else if (clickCount.current >= 3) {
        if (node.data.parent_id !== null) {
            startTransition(() => {
                updateItemParent(table, node.data.id, null).then(refreshView);
            });
        }
      }
      clickCount.current = 0;
    }, 250);
  };

  const handleSaveTitle = () => {
    if (title.trim() && title !== node.data.title) {
      startTransition(() => {
        updateItemTitle(table, node.data.id, title).then(result => {
          if (result.error) toast.error(result.error);
          setIsEditing(false);
          refreshView();
        });
      });
    } else {
      setIsEditing(false);
      setTitle(node.data.title);
    }
  };

  const handleCreateChild = () => startTransition(() => {
    createItem(table, node.data.id).then(() => {
      if (!node.isOpen) node.toggle();
      refreshView();
    });
  });

  const handleDelete = () => startTransition(() => {
    deleteItem(table, node.data.id).then(res => {
      if (res.error) toast.error(res.error);
      else toast.success(`"${node.data.title}" foi excluído.`);
      refreshView();
    });
  });

  const href = table === 'documentos' 
    ? `/documentos?id=${node.data.id}` 
    : `/disciplinas?page=${node.data.id}`;

  return (
    <div
      style={style}
      ref={dragHandle}
      className={`flex items-center group my-1 rounded-md hover:bg-secondary pr-2 ${node.state.isDragging ? 'opacity-50' : ''} ${node.state.isSelected ? 'bg-primary/20' : ''}`}
    >
      <span onClick={handleMultiClick} className="p-2 text-muted-foreground hover:text-foreground cursor-grab active-cursor-grabbing" title="Mover (2 cliques: subir nível, 3 cliques: mover para raiz)">
        <GripVertical className="w-4 h-4" />
      </span>
      {node.data.emoji && <span className="mx-2">{node.data.emoji}</span>}
      {node.isLeaf && !node.data.emoji ? (
        <FileText className="w-4 h-4 mx-2 text-muted-foreground" />
      ) : (
        !node.isLeaf && <ChevronDown
          onClick={() => node.toggle()}
          className={`w-4 h-4 mx-2 cursor-pointer transition-transform ${node.isOpen ? 'rotate-0' : '-rotate-90'}`}
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
      <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setIsEditing(true)} title="Renomear" className="p-2 text-muted-foreground hover:text-foreground rounded"><Edit2 className="w-4 h-4" /></button>
        {!node.isLeaf && <button onClick={handleCreateChild} title="Criar Sub-item" className="p-2 text-muted-foreground hover:text-foreground rounded"><Plus className="w-4 h-4" /></button>}
        <button onClick={handleDelete} title="Excluir" className="p-2 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* --- Sidebar --- */
export function HierarchicalSidebar({
  treeData = [],
  table,
  title,
  // NOVO: Prop para receber o ID do item ativo atualmente
  activeId,
}: {
  treeData: NodeType[];
  table: 'documentos' | 'disciplinas';
  title: string;
  activeId?: string | null; // A prop é opcional
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef<HTMLDivElement>(null);
  
  // NOVO: A ref para a árvore é necessária para a função de scroll
  const treeRef = useRef<TreeApi<NodeType>>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const processedData = useMemo(() => {
    function addTable(nodes: NodeType[]): any[] {
      return nodes.map((n) => ({
        ...n,
        id: String(n.id),
        table,
        children: addTable(n.children),
      }));
    }
    return addTable(treeData);
  }, [treeData, table]);

  // A lógica de persistência permanece inalterada
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
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setIsLoadedFromStorage(true);
  }, [storageKey]);

  useEffect(() => {
    if (isLoadedFromStorage) {
      localStorage.setItem(storageKey, JSON.stringify(openIds));
    }
  }, [openIds, isLoadedFromStorage, storageKey]);

  // NOVO: useEffect para controlar o scroll automático
  useEffect(() => {
    // Só executa se tivermos um activeId, a árvore estiver pronta e o estado carregado
    if (activeId && treeRef.current && isLoadedFromStorage) {
      // Usamos um pequeno timeout para garantir que a árvore já renderizou e pode calcular as posições
      const timer = setTimeout(() => {
        treeRef.current?.scrollTo(activeId);
      }, 100); // 100ms é um delay seguro
      
      // Limpa o timeout se o componente for desmontado
      return () => clearTimeout(timer);
    }
  }, [activeId, isLoadedFromStorage]); // Re-executa se o item ativo mudar

  const handleMove = ({ dragIds, parentId }: { dragIds: string[]; parentId: string | null }) => { /* ... */ };
  const handleCreateRoot = () => { /* ... */ };
  useEffect(() => { /* ...lógica de scroll... */ }, [processedData]);

  return (
    <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <h2 className="text-lg font-bold uppercase tracking-wider">{title}</h2>
        <button onClick={handleCreateRoot} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full" title={`...`}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div ref={contentWidthRef} style={{ height: '1px' }}></div>
      </div>

      <div ref={mainScrollRef} className="flex-grow overflow-auto -mr-2 pr-2">
        {processedData.length > 0 ? (
          isLoadedFromStorage && (
            <Tree<NodeType>
              // ALTERADO: Adicionamos a ref de volta
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
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">...</p>
          </div>
        )}
      </div>
    </div>
  );
}