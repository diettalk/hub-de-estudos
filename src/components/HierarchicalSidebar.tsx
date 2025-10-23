'use client';

import Link from 'next/link';
import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronDown, FileText, Plus, GripVertical, Search, 
    FilePlus2, Pencil, Trash, Star,
    ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Input } from '@/components/ui/input'; 
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { 
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator
} from '@/components/ui/context-menu';
// Certifique-se que TableName está sendo importado ou definido corretamente
// import { TableName } from '@/app/actions'; // Se você exportou o tipo
import { createItem, updateItemTitle, deleteItem, updateItemParent, toggleFavoriteStatus } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Defina o tipo TableName se não estiver importando
type TableName = 'documentos' | 'paginas'; 

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
    // CORREÇÃO: Usa o tipo TableName diretamente
    const table = node.data.table as TableName; 
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
                // REMOVIDO: Mapeamento não é mais necessário
                // const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
                updateItemTitle(table, Number(node.data.id), title).then(result => {
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
        // REMOVIDO: Mapeamento não é mais necessário
        // const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
        createItem(table, Number(node.data.id)).then(() => {
            if (!node.isOpen) node.toggle();
            refreshView();
        });
    });

    const handleDelete = () => startTransition(() => {
        // REMOVIDO: Mapeamento não é mais necessário
        // const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
        deleteItem(table, Number(node.data.id)).then(res => {
            if (res.error) toast.error(res.error);
            else toast.success(`"${node.data.title}" foi excluído.`);
            refreshView();
        });
    });
    
    // CORREÇÃO: Lógica ajustada para usar 'paginas'
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
                        // Adicionado feedback visual para drop
                        node.state.isDraggingOver && "bg-blue-500/20", 
                        node.state.willReceiveDrop && "outline-2 outline-dashed outline-primary/50"
                    )}
                >
                    <span ref={dragHandle} className="relative z-10 p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing" title="Mover">
                        <GripVertical className="w-4 h-4" />
                    </span>

                    <div className="relative flex-1 flex items-center h-full">
                        {/* Lógica das linhas de hierarquia - sem alterações */}
                        {node.parent && node.parent.level > 0 && Array.from({ length: node.parent.level }).map((_, i) => (
                             <div key={i} className="absolute left-0 top-0 h-full w-[24px]" style={{ transform: `translateX(-${(i + 1) * 24}px)` }}>
                                 <div className="h-full w-px bg-border/50 mx-auto"></div> {/* Cor ajustada */}
                             </div>
                         ))}
                         {node.parent && ( /* Só mostra a linha se tiver pai */
                           <div className="absolute left-0 top-0 h-full w-[24px]" style={{ transform: `translateX(-24px)` }}>
                               <div className={`mx-auto ${node.isLast ? 'h-1/2' : 'h-full'} w-px bg-border/50`}></div> {/* Cor e altura ajustadas */}
                               <div className="h-px w-1/2 bg-border/50 absolute top-1/2 right-0"></div> {/* Posição ajustada */}
                           </div>
                         )}

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
                                        if (e.key === 'Escape') { setEditingId(null); setTitle(node.data.title); } // Adicionado Esc
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
  // CORRIGIDO: Tipo da prop 'table'
  table, 
  title,
  activeId,
  isMinimized,
  onToggleMinimize,
}: {
  treeData: NodeType[];
  // CORRIGIDO: Aceita os nomes corretos das tabelas
  table: TableName; 
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
    
    const [favoriteItems, setFavoriteItems] = useState<NodeType[]>([]);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const storageKey = `openFolders_${table}`;

    // Processa os dados brutos para o formato esperado pelo react-arborist
    const processedData = useMemo(() => {
        function processNodes(nodes: NodeType[] = []): any[] {
            return nodes.map((n) => ({
                ...n,
                id: String(n.id), // Garante que ID é string
                table, // Passa a prop 'table' correta para cada nó
                is_favorite: n.is_favorite ?? false,
                // Recursivamente processa os filhos
                children: n.children ? processNodes(n.children) : undefined, 
            }));
        }
        return processNodes(treeData);
    }, [treeData, table]);

    // Atualiza a lista de favoritos quando os dados mudam
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
        findFavorites(treeData); // Usa treeData original aqui
        setFavoriteItems(favorites);
    }, [treeData]);

    // Carrega IDs abertos do localStorage
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

    // Salva IDs abertos no localStorage
    useEffect(() => {
        if (isLoadedFromStorage) {
            localStorage.setItem(storageKey, JSON.stringify(openIds));
        }
    }, [openIds, isLoadedFromStorage, storageKey]);

    // Rola para o item ativo
    useEffect(() => {
        if (activeId && treeRef.current && isLoadedFromStorage) {
            const timer = setTimeout(() => { treeRef.current?.scrollTo(activeId); }, 100);
            return () => clearTimeout(timer);
        }
    }, [activeId, isLoadedFromStorage]);

    // Handler para mover itens (Drag and Drop)
    const handleMove = ({ dragIds, parentId }: { dragIds: string[]; parentId: string | null }) => {
        const movedItemId = Number(dragIds[0]);
        const newParentId = parentId ? Number(parentId) : null;
        startTransition(() => {
            // REMOVIDO: Mapeamento não é mais necessário
            // const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
            updateItemParent(table, movedItemId, newParentId).then((result) => {
                if (result.error) toast.error(result.error);
                router.refresh(); // Atualiza a view
            });
        });
    };

    // Handler para criar um item na raiz
    const handleCreateRoot = () => {
        startTransition(() => {
            // REMOVIDO: Mapeamento não é mais necessário
            // const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
            createItem(table, null).then(() => {
                router.refresh();
            });
        });
    };

    // Handler para alternar favorito
    const handleToggleFavorite = (item: NodeType) => {
        startTransition(() => {
            // REMOVIDO: Mapeamento não é mais necessário
            // const correctTableName = table === 'disciplinas' ? 'paginas' : 'documentos';
            toggleFavoriteStatus(table, Number(item.id)).then(result => {
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success(result.isFavorite ? `"${item.title}" adicionado aos favoritos.` : `"${item.title}" removido dos favoritos.`);
                    router.refresh(); // Atualiza a view para refletir a mudança no estado is_favorite
                }
            });
        });
    };

  return (
    <div className="bg-card p-4 rounded-lg h-full flex flex-col border">
      <div className={cn("flex items-center mb-4 transition-all duration-300", isMinimized ? "justify-center" : "justify-between")}>
        {!isMinimized && (
            <h2 className="text-lg font-bold uppercase tracking-wider animate-fade-in">
                {title}
            </h2>
        )}
        
        {onToggleMinimize && title === "NAVEGAR" && (
            <Button variant="ghost" size="icon" onClick={onToggleMinimize} className="h-8 w-8">
                {isMinimized ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
        )}
        
        {!isMinimized && (
            <button onClick={handleCreateRoot} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full" title="Criar Raiz">
                <Plus className="w-5 h-5" />
            </button>
        )}
      </div>

      <div className={cn("transition-opacity duration-300", isMinimized ? "opacity-0 h-0 overflow-hidden" : "opacity-100 flex-grow flex flex-col min-h-0")}>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          
          {favoriteItems.length > 0 && (
              <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center">
                      <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-500" />
                      Favoritos
                  </h3>
                  <div className="flex flex-col gap-1">
                      {favoriteItems.map(item => {
                          const href = table === 'documentos' 
                              ? `/documentos?id=${item.id}` 
                              : `/disciplinas?page=${item.id}`;
                          return (
                              <ContextMenu key={item.id}>
                                  <ContextMenuTrigger asChild>
                                      <div className={cn("group flex items-center justify-between p-2 rounded-md hover:bg-secondary", String(item.id) === activeId && "bg-primary/20")}>
                                          <Link href={href} className="text-sm truncate flex-grow">
                                              {item.title}
                                          </Link>
                                          <span
                                              onClick={() => handleToggleFavorite(item)}
                                              className="ml-2 cursor-pointer opacity-75 group-hover:opacity-100"
                                              title="Desfavoritar"
                                          >
                                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-500 hover:opacity-70 transition-opacity" />
                                          </span>
                                      </div>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent>
                                      <ContextMenuItem onClick={() => handleToggleFavorite(item)}>
                                          <Star className="w-4 h-4 mr-2" /> Desfavoritar
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={() => {
                                          setTimeout(() => {
                                              setEditingId(String(item.id));
                                              treeRef.current?.scrollTo(String(item.id));
                                          }, 50)
                                      }}>
                                          <Pencil className="w-4 h-4 mr-2" /> Renomear
                                      </ContextMenuItem>
                                  </ContextMenuContent>
                              </ContextMenu>
                          )
                      })}
                  </div>
              </div>
          )}

          <div className="border-b border-border/50 my-2"></div>
          
          <div className="flex-grow flex flex-col min-h-0">
              {/* Divs para sincronizar scroll horizontal - sem alterações */}
              <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-thin"><div ref={contentWidthRef} style={{ height: '1px' }}></div></div>
              <div ref={mainScrollRef} className="flex-grow overflow-auto -mr-2 pr-2">
                  {processedData.length > 0 ? (
                      isLoadedFromStorage && (
                          <Tree<NodeType>
                              ref={treeRef}
                              data={processedData} // Usa os dados processados
                              onMove={handleMove}
                              width="100%"
                              rowHeight={40}
                              indent={24}
                              openByDefault={false}
                              openIds={openIds}
                              onOpenChange={(ids) => setOpenIds(ids.map(String))}
                              // getId não é mais necessário se 'id' já é string em processedData
                              searchTerm={searchTerm}
                              // A prop 'children' renderiza cada nó
                          >
                              {(props) => <Node {...props} onToggleFavorite={handleToggleFavorite} editingId={editingId} setEditingId={setEditingId} />}
                          </Tree>
                      )
                  ) : (
                      <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-sm">Nenhum item. Clique em '+' para criar.</p></div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}
