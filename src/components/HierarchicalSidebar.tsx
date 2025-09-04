'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';

// O seu componente Node original e funcional. Nenhuma alteração aqui.
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
        const grandparentId = parent?.parent?.id ? Number(parent.parent.id) : null;
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


export function HierarchicalSidebar({ treeData = [], table, title }: { treeData: NodeType[], table: 'documentos' | 'paginas', title: string }) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef<HTMLDivElement>(null);

  // --- NOVA LÓGICA DE PERSISTÊNCIA DE ESTADO INDIVIDUAL ---
  const storageKey = `folderState_${table}`;
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

  // Efeito para CARREGAR o estado do localStorage APENAS no cliente, evitando erros de hidratação.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            setOpenState(JSON.parse(saved));
        } catch (e) {
            console.error("Falha ao ler o estado da sidebar do localStorage:", e);
        }
    }
  }, [storageKey]);

  // Efeito para SALVAR o estado no localStorage sempre que o utilizador o altera.
  useEffect(() => {
    // Não guardamos o estado inicial vazio para não apagar um estado já salvo por engano.
    if (Object.keys(openState).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(openState));
    }
  }, [openState, storageKey]);

  // Handler que é chamado pelo react-arborist sempre que uma pasta é aberta/fechada.
  const handleToggle = (node: any) => {
    // Atualizamos o nosso mapa de estado com o novo estado da pasta.
    setOpenState(prev => ({
        ...prev,
        [node.id]: !prev[node.id] // Inverte o estado atual da pasta clicada
    }));
  };
  // --- FIM DA LÓGICA DE PERSISTÊNCIA ---

  const processedData = useMemo(() => {
    function addTable(nodes: NodeType[]): any[] {
        return nodes.map(n => ({ ...n, id: String(n.id), table, children: addTable(n.children) }))
    }
    return addTable(treeData);
  }, [treeData, table]);

  useEffect(() => {
    const topDiv = topScrollRef.current;
    const mainDiv = mainScrollRef.current;
    if (!topDiv || !mainDiv) return;
    let isSyncing = false;
    const handleTopScroll = () => { if (!isSyncing) { isSyncing = true; mainScrollRef.current!.scrollLeft = topDiv.scrollLeft; isSyncing = false; } };
    const handleMainScroll = () => { if (!isSyncing) { isSyncing = true; topScrollRef.current!.scrollLeft = mainDiv.scrollLeft; isSyncing = false; } };
    topDiv.addEventListener('scroll', handleTopScroll);
    mainDiv.addEventListener('scroll', handleMainScroll);
    const measureContent = () => { if (mainDiv.firstElementChild && contentWidthRef.current) { contentWidthRef.current.style.width = `${mainDiv.firstElementChild.scrollWidth}px`; } };
    const resizeObserver = new ResizeObserver(measureContent);
    if (mainDiv.firstElementChild) { resizeObserver.observe(mainDiv.firstElementChild); }
    measureContent();
    return () => {
      topDiv.removeEventListener('scroll', handleTopScroll);
      mainDiv.removeEventListener('scroll', handleMainScroll);
      resizeObserver.disconnect();
    };
  }, [processedData]);

  const handleMove = ({ dragIds, parentId }: { dragIds: string[], parentId: string | null }) => {
    const movedItemId = Number(dragIds[0]);
    const newParentId = parentId ? Number(parentId) : null;
    startTransition(() => {
      updateItemParent(table, movedItemId, newParentId).then(result => {
        if (result.error) toast.error(result.error);
        router.refresh();
      });
    });
  };

  const handleCreateRoot = () => {
    startTransition(() => {
      createItem(table, null).then(result => {
        if (result?.error) toast.error(result.error);
        else router.refresh();
      });
    });
  };

  return (
    <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <h2 className="text-lg font-bold uppercase tracking-wider">{title}</h2>
        <button
          onClick={handleCreateRoot}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full"
          title={`Criar ${table === 'documentos' ? 'Documento' : 'Disciplina'} Raiz`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-thin"><div ref={contentWidthRef} style={{ height: '1px' }}></div></div>
      <div ref={mainScrollRef} className="flex-grow overflow-auto -mr-2 pr-2">
        {processedData.length > 0 ? (
          <Tree
            data={processedData}
            onMove={handleMove}
            // --- ATUALIZAÇÃO: Conectamos o nosso estado à árvore ---
            isOpen={(node) => openState[node.id] || false}
            onToggle={handleToggle}
            width="100%"
            rowHeight={40}
            indent={24}
          >
            {Node}
          </Tree>
        ) : (
          <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-sm">Nenhum {table === 'documentos' ? 'documento' : 'item'} ainda. Clique em '+' para criar.</p></div>
        )}
      </div>
    </div>
  );
}

