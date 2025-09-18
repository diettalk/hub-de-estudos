'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronDown, FileText, Plus, GripVertical, Search, 
    FilePlus2, Pencil, Trash, Star
} from 'lucide-react';
import { Input } from '@/components/ui/input'; 
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { 
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator
} from '@/components/ui/context-menu';
import { createItem, updateItemTitle, deleteItem, updateItemParent, toggleFavoriteStatus } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// --- Componente Node ---
// ============================================================================
function Node({ node, style, dragHandle, onToggleFavorite, editingId, setEditingId }: NodeRendererProps<NodeType> & { 
    onToggleFavorite: (item: NodeType) => void;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
}) {
    const isEditing = String(node.data.id) === editingId;
    const [title, setTitle] = useState(node.data.title);
    const [, startTransition] = useTransition();
    const router = useRouter();
    const table = node.data.table as 'documentos' | 'disciplinas';
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
                const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
                updateItemTitle(correctTableName, Number(node.data.id), title).then(result => {
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

    const handleCreateChild = () => startTransition(() => {
        const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
        createItem(correctTableName, Number(node.data.id)).then(() => {
            if (!node.isOpen) node.toggle();
            refreshView();
        });
    });

    const handleDelete = () => startTransition(() => {
        const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
        deleteItem(correctTableName, Number(node.data.id)).then(res => {
            if (res.error) toast.error(res.error);
            else toast.success(`"${node.data.title}" foi excluído.`);
            refreshView();
        });
    });
    
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
                    <span ref={dragHandle} className="relative z-10 p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing" title="Mover">
                        <GripVertical className="w-4 h-4" />
                    </span>

                    <div className="relative flex-1 flex items-center h-full">
                        {node.parent && node.parent.level > 0 && Array.from({ length: node.parent.level }).map((_, i) => (
                            <div key={i} className="absolute left-0 top-0 h-full w-[24px]" style={{ transform: `translateX(-${(i + 1) * 24}px)` }}>
                                <div className="h-full w-px bg-slate-700/50 mx-auto"></div>
                            </div>
                        ))}
                        <div className="absolute left-0 top-0 h-1/2 w-[24px]" style={{ transform: `translateX(-24px)` }}>
                            <div className={`mx-auto ${node.isLast ? 'h-full' : 'h-1/2'} w-px bg-slate-700/50`}></div>
                            <div className="h-px w-1/2 bg-slate-700/50 absolute bottom-0 right-0"></div>
                        </div>

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
                                    ref={inputRef}
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={handleSaveTitle}
                                    onKeyDown={(e) => {
                                        if (e.key === ' ') e.stopPropagation();
                                        if (e.key === 'Enter') handleSaveTitle();
                                    }}
                                    className="bg-input text-foreground rounded px-2 py-1 flex-grow text-sm h-8"
                                />
                            ) : (
                                <Link href={href} className="flex-grow truncate py-1.5 text-sm">{node.data.title}</Link>
                            )}
                            
                            <span
                                onClick={() => onToggleFavorite(node.data)}
                                className={cn("ml-auto p-2 cursor-pointer transition-opacity", node.data.is_favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                                title={node.data.is_favorite ? "Desfavoritar" : "Favoritar"}
                            >
                                <Star className={cn("w-4 h-4 text-muted-foreground hover:text-yellow-500 hover:fill-yellow-400", node.data.is_favorite && "fill-yellow-400 text-yellow-500")} />
                            </span>
                        </div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => onToggleFavorite(node.data)}>
                    <Star className={cn("w-4 h-4 mr-2", node.data.is_favorite && "fill-yellow-400 text-yellow-500")} />
                    {node.data.is_favorite ? "Desfavoritar" : "Favoritar"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => setTimeout(() => setEditingId(String(node.data.id)), 50)}>
                    <Pencil className="w-4 h-4 mr-2" /> Renomear
                </ContextMenuItem>
                {!node.isLeaf && (
                    <ContextMenuItem onClick={handleCreateChild}>
                        <FilePlus2 className="w-4 h-4 mr-2" /> Criar Sub-item
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash className="w-4 h-4 mr-2" /> Excluir
                </ContextMenuItem>
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
  isMinimized,
  onToggleMinimize,
}: {
  treeData: NodeType[];
  table: 'documentos' | 'disciplinas';
  title: string;
  activeId?: string | null;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}) {
    const [, startTransition] = useTransition();
    const router = useRouter();

    const topScrollRef = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const contentWidthRef = useRef<HTMLDivElement>(null);
    const treeRef = useRef<TreeApi<NodeType>>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [openIds, setOpenIds] = useState<string[]>([]);
    const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
    
    // CORREÇÃO: Inicializa os favoritos com useState para evitar o erro.
    const [favoriteItems, setFavoriteItems] = useState<NodeType[]>([]);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const storageKey = `openFolders_${table}`;

    const processedData = useMemo(() => {
        function processNodes(nodes: NodeType[] = []): any[] {
            return nodes.map((n) => ({
                ...n,
                id: String(n.id),
                table,
                is_favorite: n.is_favorite ?? false,
                children: processNodes(n.children),
            }));
        }
        return processNodes(treeData);
    }, [treeData, table]);

    // CORREÇÃO: Usa um useEffect para preencher a lista de favoritos de forma segura.
    useEffect(() => {
        const favorites: NodeType[] = [];
        function findFavorites(nodes: NodeType[]) {
            if (!nodes) return; 
            for (const node of nodes) {
                if (node.is_favorite) {
                    favorites.push(node);
                }
                if (Array.isArray(node.children)) {
                    findFavorites(node.children);
                }
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
            const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
            updateItemParent(correctTableName, movedItemId, newParentId).then((result) => {
                if (result.error) toast.error(result.error);
                router.refresh();
            });
        });
    };

    const handleCreateRoot = () => {
        startTransition(() => {
            const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
            createItem(correctTableName, null).then(() => {
                router.refresh();
            });
        });
    };

    const handleToggleFavorite = (item: NodeType) => {
        startTransition(() => {
            const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
            toggleFavoriteStatus(correctTableName, Number(item.id)).then(result => {
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success(result.isFavorite ? `"${item.title}" adicionado aos favoritos.` : `"${item.title}" removido dos favoritos.`);
                }
            });
        });
    };

    return (
        <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
            {/* O resto do JSX permanece o mesmo da nossa última versão funcional */}
        </div>
    );
}

