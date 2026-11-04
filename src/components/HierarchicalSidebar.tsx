'use client';

import Link from 'next/link';
import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Check,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createItem,
  updateItemTitle,
  deleteItem,
  toggleFavoriteStatus,
} from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TableName = 'paginas';

interface TreeItemProps {
  node: NodeType;
  level: number;
  activeId?: string | null;
  openIds: Record<string, boolean>;
  onToggleOpen: (id: string) => void;
  searchTerm: string;
}

function SidebarTreeItem({
  node,
  level,
  activeId,
  openIds,
  onToggleOpen,
  searchTerm,
}: TreeItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(node.title);

  const nodeIdStr = String(node.id);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isOpen = Boolean(openIds[nodeIdStr]) || Boolean(searchTerm.trim());
  const isSelected = activeId === nodeIdStr;

  useEffect(() => {
    setTitleInput(node.title);
  }, [node.title]);

  const handleSaveRename = () => {
    if (!titleInput.trim() || titleInput.trim() === node.title) {
      setIsEditing(false);
      setTitleInput(node.title);
      return;
    }
    startTransition(async () => {
      const res = await updateItemTitle('paginas', Number(node.id), titleInput.trim());
      if (res.error) toast.error(res.error);
      else {
        toast.success('Renomeado com sucesso!');
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const handleCreateSubItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startTransition(async () => {
      const res = await createItem('paginas', Number(node.id));
      if (res.error) {
        toast.error(res.error);
      } else {
        if (!openIds[nodeIdStr]) onToggleOpen(nodeIdStr);
        toast.success('Subtópico criado!');
        router.refresh();
        if (res.newItem?.id) {
          router.push(`/disciplinas?page=${res.newItem.id}`);
        }
      }
    });
  };

  const handleDeleteItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (
      !confirm(
        `Tem certeza que deseja excluir "${node.title}"${
          hasChildren ? ' e todos os subtópicos dentro dele' : ''
        }?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteItem('paginas', Number(node.id));
      if (res.error) toast.error(res.error);
      else {
        toast.success(`"${node.title}" excluído.`);
        if (isSelected) {
          router.push('/disciplinas');
        } else {
          router.refresh();
        }
      }
    });
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startTransition(async () => {
      await toggleFavoriteStatus('paginas', Number(node.id));
      router.refresh();
    });
  };

  return (
    <div className="select-none">
      <div
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        className={cn(
          'group flex items-center justify-between gap-1 py-1.5 pr-2 rounded-xl text-xs transition-all my-0.5',
          isSelected
            ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
            : 'text-foreground/90 hover:bg-secondary/70'
        )}
      >
        {/* Esquerda: Seta de abrir pasta + Ícone + Nome / Input */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onToggleOpen(nodeIdStr)}
            className={cn(
              'p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex-shrink-0',
              !hasChildren && 'opacity-30'
            )}
            title={isOpen ? 'Recolher' : 'Expandir'}
          >
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {hasChildren ? (
            isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
            )
          ) : (
            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setTitleInput(node.title);
                  }
                }}
                autoFocus
                className="w-full h-6 px-2 rounded bg-background border border-emerald-500 text-xs text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1 text-emerald-500 hover:bg-secondary rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-muted-foreground hover:bg-secondary rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Link
              href={`/disciplinas?page=${node.id}`}
              className="flex-1 truncate py-0.5"
              title={node.title}
            >
              {node.title}
            </Link>
          )}
        </div>

        {/* Direita: Botões Visíveis de Criar Subtópico (+), Renomear (Lápis), Favoritar e Excluir (Lixeira) */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 flex-shrink-0">
            <button
              type="button"
              onClick={handleCreateSubItem}
              disabled={isPending}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-emerald-400 transition-colors"
              title="Criar subtópico / anotação aqui dentro"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsEditing(true);
              }}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Renomear"
            >
              <Pencil className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={handleToggleFav}
              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-amber-400 transition-colors"
              title={node.is_favorite ? 'Remover favorito' : 'Favoritar'}
            >
              <Star
                className={cn(
                  'w-3 h-3',
                  node.is_favorite && 'fill-amber-400 text-amber-400'
                )}
              />
            </button>

            <button
              type="button"
              onClick={handleDeleteItem}
              disabled={isPending}
              className="p-1 rounded hover:bg-rose-500/15 text-muted-foreground hover:text-rose-400 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Renderiza os filhos recursivamente se estiver aberto */}
      {hasChildren && isOpen && (
        <div className="border-l border-border/50 ml-4">
          {node.children!.map((child) => (
            <SidebarTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              activeId={activeId}
              openIds={openIds}
              onToggleOpen={onToggleOpen}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchicalSidebar({
  treeData = [],
  table,
  title,
  activeId,
}: {
  treeData: NodeType[];
  table: TableName;
  title: string;
  activeId?: string | null;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  // Abre por padrão as pastas principais
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    treeData.forEach((n) => {
      initial[String(n.id)] = true;
    });
    setOpenIds((prev) => ({ ...initial, ...prev }));
  }, [treeData]);

  const handleToggleOpen = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateRoot = () => {
    startTransition(async () => {
      const res = await createItem(table, null);
      if (!res.error && res.newItem?.id) {
        toast.success('Nova disciplina criada!');
        router.refresh();
        router.push(`/disciplinas?page=${res.newItem.id}`);
      }
    });
  };

  // Filtra a árvore pela busca
  const filteredTree = React.useMemo(() => {
    if (!searchTerm.trim()) return treeData;
    const q = searchTerm.toLowerCase();

    function filterNodes(nodes: NodeType[]): NodeType[] {
      const res: NodeType[] = [];
      for (const n of nodes) {
        const childrenFiltered = n.children ? filterNodes(n.children) : [];
        if (n.title.toLowerCase().includes(q) || childrenFiltered.length > 0) {
          res.push({ ...n, children: childrenFiltered });
        }
      }
      return res;
    }
    return filterNodes(treeData);
  }, [treeData, searchTerm]);

  return (
    <div className="p-3.5 h-full flex flex-col bg-card select-none">
      {/* CABEÇALHO DA ÁRVORE */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateRoot}
          disabled={isPending}
          className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-lg border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
          title="Criar nova Disciplina principal"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Matéria</span>
        </Button>
      </div>

      {/* BUSCA */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar matéria ou tópico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-xs bg-secondary/40 border-border rounded-xl"
        />
      </div>

      {/* LEGENDA RÁPIDA DE AJUDA */}
      <div className="px-2 py-1.5 mb-2 rounded-lg bg-secondary/30 border border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Use os ícones ao lado de cada item:</span>
        <span className="font-semibold text-foreground">+ Subtópico • ✏️ Nome • 🗑️ Excluir</span>
      </div>

      {/* LISTA HIERÁRQUICA CLARA */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-0.5">
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => (
            <SidebarTreeItem
              key={node.id}
              node={node}
              level={0}
              activeId={activeId}
              openIds={openIds}
              onToggleOpen={handleToggleOpen}
              searchTerm={searchTerm}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4">
            <p className="text-xs text-muted-foreground">Nenhum tópico encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}