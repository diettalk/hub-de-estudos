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
  // 💡 A tipagem foi ajustada para 'disciplinas' para maior consistência com o contexto do projeto.
  table: 'documentos' | 'disciplinas';
  title: string;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  // refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef<HTMLDivElement>(null);
  // ✅ A ref para a árvore é essencial para a nossa solução imperativa.
  const treeRef = useRef<TreeApi<NodeType>>(null);

  const processedData = useMemo(() => {
    function addTable(nodes: NodeType[]): any[] {
      return nodes.map((n) => ({ ...n, table, children: addTable(n.children) }));
    }
    return addTable(treeData);
  }, [treeData, table]);

  // REQUISITO 1: Usar uma chave única e dinâmica para o localStorage.
  const storageKey = `openFolders_${table}`;

  // REQUISITO 2 (CRÍTICO): Solução à prova de erros de hidratação.
  // Este useEffect é executado apenas uma vez no cliente, após a montagem do componente.
  // Ele lê o estado do localStorage e aplica-o de forma imperativa, evitando conflitos
  // com a renderização do servidor.
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState && treeRef.current) {
      try {
        const openIds = JSON.parse(savedState);
        if (Array.isArray(openIds)) {
          // Usamos a API da própria biblioteca para abrir as pastas guardadas.
          // Isto modifica a árvore sem causar uma re-renderização que gere um erro de hidratação.
          openIds.forEach(id => treeRef.current?.open(id));
        }
      } catch (e) {
        console.error("Falha ao restaurar o estado da árvore do localStorage", e);
      }
    }
  }, [storageKey]); // A dependência garante que o efeito é executado se a chave mudar.

  // REQUISITO 3: Guardar o estado em tempo real.
  // Esta função é chamada sempre que o utilizador abre ou fecha uma pasta.
  const handleToggle = () => {
    if (treeRef.current) {
      // Através da ref, obtemos a lista atual de IDs de pastas abertas (é um Set).
      const openIds = Array.from(treeRef.current.openIds);
      // Guardamos a lista atualizada no localStorage.
      localStorage.setItem(storageKey, JSON.stringify(openIds));
    }
  };

  // Sincronizar barras de rolagem (lógica inalterada)
  useEffect(() => {
    const topDiv = topScrollRef.current;
    const mainDiv = mainScrollRef.current;
    if (!topDiv || !mainDiv) return;

    let isSyncing = false;
    const handleTopScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      mainDiv.scrollLeft = topDiv.scrollLeft;
      isSyncing = false;
    };
    const handleMainScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      topDiv.scrollLeft = mainDiv.scrollLeft;
      isSyncing = false;
    };

    topDiv.addEventListener('scroll', handleTopScroll);
    mainDiv.addEventListener('scroll', handleMainScroll);

    const measureContent = () => {
      if (mainDiv.firstElementChild && contentWidthRef.current) {
        contentWidthRef.current.style.width = `${mainDiv.firstElementChild.scrollWidth}px`;
      }
    };
    const resizeObserver = new ResizeObserver(measureContent);
    if (mainDiv.firstElementChild) {
      resizeObserver.observe(mainDiv.firstElementChild);
    }
    measureContent();

    return () => {
      topDiv.removeEventListener('scroll', handleTopScroll);
      mainDiv.removeEventListener('scroll', handleMainScroll);
      resizeObserver.disconnect();
    };
  }, [processedData]);

  // mover item (lógica inalterada)
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

  // criar item raiz (lógica inalterada)
  const handleCreateRoot = () => {
    startTransition(() => {
      createItem(table, null).then((result) => {
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

      {/* Barra de rolagem superior */}
      <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div ref={contentWidthRef} style={{ height: '1px' }}></div>
      </div>
      <div ref={mainScrollRef} className="flex-grow overflow-auto -mr-2 pr-2">
        {processedData.length > 0 ? (
          <Tree<NodeType>
            ref={treeRef}
            data={processedData}
            onMove={handleMove}
            // ✅ Ligamos o nosso handler ao evento onToggle da árvore.
            onToggle={handleToggle}
            width="100%"
            rowHeight={40}
            indent={24}
            // ❌ As props 'openIds' e 'onOpenChange' foram removidas.
            // A árvore agora gere o seu estado de abertura internamente (não-controlada),
            // o que é fundamental para evitar o erro de hidratação.
          >
            {Node}
          </Tree>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              Nenhum {table === 'documentos' ? 'documento' : 'item'} ainda. Clique em '+' para criar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}