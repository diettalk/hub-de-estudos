'use client';

import Link from 'next/link';
import React, { useState, useTransition, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, FileText, Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { createItem, updateItemTitle, deleteItem, updateItemParent } from '@/app/actions';
import { type Node as NodeType } from '@/lib/types';
import { toast } from 'sonner';

// --- Componente para Renderizar cada Nó da Árvore ---

function Node({ node, style, dragHandle }: NodeRendererProps<NodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.data.title);
  const [, startTransition] = useTransition();
  const table = node.data.table; // 'documentos' ou 'paginas'

  const handleSaveTitle = () => {
    if (title.trim() && title !== node.data.title) {
      startTransition(() => {
        updateItemTitle(table, node.data.id, title).then(result => {
          if (result.error) toast.error(result.error);
          setIsEditing(false);
          node.tree.refresh();
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
      node.tree.refresh();
    });
  });

  const handleDelete = () => startTransition(() => {
    deleteItem(table, node.data.id).then(res => {
      if (res.error) toast.error(res.error);
      else toast.success(`"${node.data.title}" foi excluído.`);
      node.tree.refresh();
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
      {/* Ícone de Arrastar */}
      <span className="p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </span>

      {/* Ícone de Pasta/Ficheiro */}
      {node.isLeaf ? (
        <FileText className="w-4 h-4 mx-2 text-muted-foreground" />
      ) : (
        <ChevronDown
          onClick={() => node.toggle()}
          className={`w-4 h-4 mx-2 cursor-pointer transition-transform ${node.isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      )}

      {/* Título ou Input de Edição */}
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

      {/* Botões de Ação */}
      <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setIsEditing(true)} title="Renomear" className="p-2 text-muted-foreground hover:text-foreground rounded"><Edit2 className="w-4 h-4" /></button>
        {!node.isLeaf && <button onClick={handleCreateChild} title="Criar Sub-item" className="p-2 text-muted-foreground hover:text-foreground rounded"><Plus className="w-4 h-4" /></button>}
        <button onClick={handleDelete} title="Excluir" className="p-2 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}


// --- Componente Principal da Barra Lateral ---
interface HierarchicalSidebarProps {
  treeData: any[]; // Usamos any[] por enquanto para flexibilidade
  table: 'documentos' | 'paginas';
  title: string;
}

export function HierarchicalSidebar({ treeData = [], table, title }: HierarchicalSidebarProps) {
  const [, startTransition] = useTransition();
  const treeRef = useRef<any>(null); // Referência para a API da árvore

  // Adiciona o tipo de tabela a cada nó, pois o componente Node precisa dele.
  const processedData = useMemo(() => {
    function addTable(nodes: NodeType[]): any[] {
        return nodes.map(n => ({ ...n, table, children: addTable(n.children) }))
    }
    return addTable(treeData);
  }, [treeData, table]);


  const handleMove = ({ dragIds, parentId }: { dragIds: string[], parentId: string | null }) => {
    const movedItemId = Number(dragIds[0]);
    const newParentId = parentId ? Number(parentId) : null;

    startTransition(() => {
      updateItemParent(table, movedItemId, newParentId).then(result => {
        if (result.error) {
            toast.error(result.error);
            // Se houver um erro, é crucial recarregar os dados para evitar estado inconsistente.
            treeRef.current?.refresh();
        }
      });
    });
  };

  const handleCreateRoot = () => {
    startTransition(() => {
      createItem(table, null).then(result => {
        if (result?.error) toast.error(result.error);
        else treeRef.current?.refresh(); // Recarrega os dados após criar um item
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

      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        <Tree
          ref={treeRef}
          data={processedData} // <-- A CORREÇÃO ESTÁ AQUI: 'initialData' foi renomeado para 'data'
          onMove={handleMove}
          width="100%"
          height={1000} // Altura grande para evitar scroll interno da biblioteca
          rowHeight={40}
          indent={24}
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
}

