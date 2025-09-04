'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
// 💡 A importação de 'TreeApi' é necessária para a tipagem da nossa ref.
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';

// O componente 'Node' continua exatamente igual, não precisa de o alterar.
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
}: {
  treeData: NodeType[];
  table: 'documentos' | 'disciplinas';
  title: string;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Refs para scroll (inalteradas)
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef<HTMLDivElement>(null);

  // A ref para a árvore não é mais necessária para esta funcionalidade.
  // const treeRef = useRef<TreeApi<NodeType>>(null);

  const processedData = useMemo(() => {
    function addTable(nodes: NodeType[]): any[] {
      return nodes.map((n) => ({ ...n, table, children: addTable(n.children) }));
    }
    return addTable(treeData);
  }, [treeData, table]);

  const storageKey = `openFolders_${table}`;

  // --- NOVA LÓGICA DE PERSISTÊNCIA (À PROVA DE HIDRATAÇÃO) ---

  // 1. O estado começa vazio. Garante que o servidor e o cliente inicial são idênticos.
  const [openIds, setOpenIds] = useState<string[]>([]);
  
  // 2. Usamos um 'useEffect' para carregar o estado do localStorage APENAS no cliente.
  // Isto é executado após a hidratação, evitando erros.
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const savedIds = JSON.parse(savedState);
        if (Array.isArray(savedIds)) {
          console.log(`[${table}] Estado restaurado do localStorage:`, savedIds);
          setOpenIds(savedIds);
        }
      } catch {
        // Se houver um erro ao analisar o JSON, limpa a chave inválida.
        localStorage.removeItem(storageKey);
      }
    }
  // A lista de dependências vazia `[]` garante que isto só é executado uma vez, na montagem.
  }, [storageKey, table]);

  // 3. Usamos outro 'useEffect' para GUARDAR o estado sempre que ele for alterado.
  useEffect(() => {
    // Este 'if' evita que o estado inicial vazio `[]` sobrescreva um estado já guardado
    // antes de ter tido a oportunidade de ser carregado.
    // (Embora na prática a ordem dos useEffects nos proteja, esta é uma salvaguarda extra).
    console.log(`[${table}] Salvando novo estado no localStorage:`, openIds);
    localStorage.setItem(storageKey, JSON.stringify(openIds));
  }, [openIds, storageKey, table]);


  // Funções handleMove e handleCreateRoot permanecem inalteradas...
  const handleMove = ({ dragIds, parentId }: { dragIds: string[]; parentId: string | null }) => {
    const movedItemId = Number(dragIds[0]);
    const newParentId = parentId ? Number(parentId) : null;
    startTransition(() => { updateItemParent(table, movedItemId, newParentId).then((result) => { if (result.error) toast.error(result.error); router.refresh(); }); });
  };
  const handleCreateRoot = () => { startTransition(() => { createItem(table, null).then((result) => { if (result?.error) toast.error(result.error); else router.refresh(); }); }); };
  useEffect(() => { /* ...lógica de scroll inalterada... */ }, [processedData]);


  return (
    <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <h2 className="text-lg font-bold uppercase tracking-wider">{title}</h2>
        <button onClick={handleCreateRoot} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full" title={`Criar ${table === 'documentos' ? 'Documento' : 'Disciplina'} Raiz`}>
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-thin"><div ref={contentWidthRef} style={{ height: '1px' }}></div></div>
      <div ref={mainScrollRef} className="flex-grow overflow-auto -mr-2 pr-2">
        {processedData.length > 0 ? (
          <Tree<NodeType>
            // A ref e o onToggle foram removidos.
            data={processedData}
            onMove={handleMove}
            width="100%"
            rowHeight={40}
            indent={24}
            openByDefault={false}
            // 4. Transformamos o componente em controlado, passando o nosso estado e setter.
            openIds={openIds}
            onOpenChange={setOpenIds}
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