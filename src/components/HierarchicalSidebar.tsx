'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  FileText,
  Plus,
  GripVertical,
  Search,
  FilePlus2,
  Pencil,
  Trash2,
  Star,
  FolderOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  createItem,
  updateItemTitle,
  deleteItem,
  updateItemParent,
  toggleFavoriteStatus,
} from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type TableName = 'paginas';
type FavoriteItem = { id: number | string; title: string };
type TreeNodeData = Omit<NodeType, 'id' | 'children'> & {
  id: string;
  table: TableName;
  is_favorite: boolean;
  children?: TreeNodeData[];
};

// COMPONENTE DE CADA NÓ DA ÁRVORE
function TreeNodeRow({
  node,
  style,
  dragHandle,
  onToggleFavorite,
  editingId,
  setEditingId,
}: NodeRendererProps<TreeNodeData> & {
  onToggleFavorite: (item: FavoriteItem) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const isEditing = String(node.data.id) === editingId;
  const [title, setTitle] = useState(node.data.title);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const table = node.data.table;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const refreshView = () => router.refresh();

  const handleSaveTitle = () => {
    if (title.trim() && title !== node.data.title) {
      startTransition(() => {
        updateItemTitle(table, Number(node.data.id), title).then((result) => {
          if (result.error) toast.error(result.error);
          setEditingId(null);
          refreshView();
        });
      });
    } else {
      setEditingId(null);
      setTitle(node.data.title);
    }
  };

  const handleCreateChild = () =>
    startTransition(() => {
      createItem(table, Number(node.data.id)).then(() => {
        if (!node.isOpen) node.toggle();
        refreshView();
      });
    });

  const handleDelete = () =>
    startTransition(() => {
      deleteItem(table, Number(node.data.id)).then((res) => {
        if (res.error) toast.error(res.error);
        else toast.success(`"${node.data.title}" foi excluído.`);
        refreshView();
      });
    });

  const href = `/disciplinas?page=${node.data.id}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          style={style}
          className={cn(
            'group relative flex items-center pr-2 my-0.5 rounded-lg text-xs font-medium transition-all select-none',
            'hover:bg-secondary/70',
            node.state.isDragging && 'opacity-40',
            node.state.isSelected && 'bg-primary/10 text-primary font-semibold',
            node.state.willReceiveDrop && 'ring-2 ring-primary ring-dashed'
          )}
        >
          {/* Alça de Arraste */}
          <span
            ref={dragHandle}
            className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-opacity"
            title="Mover de pasta"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>

          {/* Ícone de Pasta ou Documento */}
          <div className="flex items-center flex-1 min-w-0 py-1">
            {node.isLeaf ? (
              <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground/70 flex-shrink-0" />
            ) : (
              <button
                type="button"
                onClick={() => node.toggle()}
                className="p-0.5 mr-1 text-muted-foreground hover:text-foreground transition-transform"
              >
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    node.isOpen ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>
            )}

            {/* Input de Edição de Título */}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === ' ') e.stopPropagation();
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setTitle(node.data.title);
                  }
                }}
                className="bg-background text-foreground border border-primary rounded px-2 py-0.5 text-xs flex-1 h-6 focus:outline-none"
              />
            ) : (
              <Link href={href} className="flex-1 truncate py-1 text-inherit">
                {node.data.title}
              </Link>
            )}

            {/* Favorito */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(node.data);
              }}
              className={cn(
                'ml-1 p-1 rounded-md transition-opacity',
                node.data.is_favorite
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              )}
              title={node.data.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5 text-muted-foreground hover:text-amber-500',
                  node.data.is_favorite && 'fill-amber-400 text-amber-500'
                )}
              />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48 text-xs">
        <ContextMenuItem onClick={() => onToggleFavorite(node.data)} className="gap-2">
          <Star className={cn('w-3.5 h-3.5', node.data.is_favorite && 'fill-amber-400 text-amber-500')} />
          <span>{node.data.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => setTimeout(() => setEditingId(String(node.data.id)), 50)} className="gap-2">
          <Pencil className="w-3.5 h-3.5" />
          <span>Renomear</span>
        </ContextMenuItem>
        {!node.isLeaf && (
          <ContextMenuItem onClick={handleCreateChild} className="gap-2">
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Criar Sub-tópico</span>
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Excluir</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// COMPONENTE PRINCIPAL DA BARRA LATERAL HIERÁRQUICA
export function HierarchicalSidebar({
  treeData = [],
  table,
  title,
  activeId,
  isMinimized,
  onToggleMinimize,
}: {
  treeData: NodeType[];
  table: TableName;
  title: string;
  activeId?: string | null;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const treeRef = useRef<TreeApi<TreeNodeData>>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<NodeType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const storageKey = `openFolders_${table}`;

  const processedData = useMemo(() => {
    function processNodes(nodes: NodeType[] = []): TreeNodeData[] {
      return nodes.map((n) => ({
        ...n,
        id: String(n.id),
        table,
        is_favorite: n.is_favorite ?? false,
        children: n.children ? processNodes(n.children) : undefined,
      }));
    }
    return processNodes(treeData);
  }, [treeData, table]);

  useEffect(() => {
    const favorites: NodeType[] = [];
    function findFavorites(nodes: NodeType[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.is_favorite) favorites.push(node);
        if (Array.isArray(node.children)) findFavorites(node.children);
      }
    }
    findFavorites(treeData);
    setFavoriteItems(favorites);
  }, [treeData]);

  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const savedIds = JSON.parse(savedState);
        if (Array.isArray(savedIds)) setOpenIds(savedIds.map(String));
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

  useEffect(() => {
    if (activeId && treeRef.current && isLoadedFromStorage) {
      const timer = setTimeout(() => {
        treeRef.current?.scrollTo(activeId);
      }, 100);
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

  const handleToggleFavorite = (item: FavoriteItem) => {
    startTransition(() => {
      toggleFavoriteStatus(table, Number(item.id)).then((result) => {
        if (result.error) toast.error(result.error);
        else {
          toast.success(
            result.isFavorite ? `"${item.title}" favoritado.` : `"${item.title}" removido dos favoritos.`
          );
          router.refresh();
        }
      });
    });
  };

  return (
    <div className="p-3.5 h-full flex flex-col bg-card select-none">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateRoot}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Criar nova matéria / pasta raiz"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* CAMPO DE BUSCA */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filtrar tópicos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-xs bg-secondary/40 border-border"
        />
      </div>

      {/* SEÇÃO DE FAVORITOS */}
      {favoriteItems.length > 0 && (
        <div className="mb-3 pb-3 border-b border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
            Favoritos
          </span>
          <div className="space-y-0.5 mt-1">
            {favoriteItems.map((item) => (
              <Link
                key={item.id}
                href={`/disciplinas?page=${item.id}`}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors group',
                  String(item.id) === activeId
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <span className="truncate">{item.title}</span>
                <Star className="w-3 h-3 text-amber-500 fill-amber-400 opacity-80 group-hover:opacity-100 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ÁRVORE PRINCIPAL */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {processedData.length > 0 ? (
          isLoadedFromStorage && (
            <Tree<TreeNodeData>
              ref={treeRef}
              data={processedData}
              onMove={handleMove}
              width="100%"
              rowHeight={34}
              indent={18}
              openByDefault={false}
              initialOpenState={Object.fromEntries(openIds.map((id): [string, boolean] => [id, true]))}
              onToggle={(id) =>
                setOpenIds((ids) =>
                  ids.includes(id) ? ids.filter((openId) => openId !== id) : [...ids, id]
                )
              }
              searchTerm={searchTerm}
            >
              {(props) => (
                <TreeNodeRow
                  {...props}
                  onToggleFavorite={handleToggleFavorite}
                  editingId={editingId}
                  setEditingId={setEditingId}
                />
              )}
            </Tree>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4">
            <p className="text-xs text-muted-foreground">Nenhuma disciplina criada.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateRoot}
              className="mt-2 text-xs h-7 gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Criar matéria
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}