// src/components/SidebarClient.tsx

'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagina } from '@/app/disciplinas/page'; // Reutiliza o tipo
import { createPagina, deletePagina, updatePagina } from '@/app/actions';
import { PlusCircle, Trash2, FilePen } from 'lucide-react';

// Componente recursivo para renderizar cada nó da árvore
const PageNode = ({ page, level }: { page: Pagina; level: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPageId = Number(searchParams.get('page'));

  const handleCreate = () => {
    const title = prompt('Nome da nova página/pasta:');
    const emoji = prompt('Emoji para a nova página:');
    if (title && emoji) {
      startTransition(() => createPagina(page.id, title, emoji));
    }
  };
  
  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir "${page.title}" e todas as suas sub-páginas?`)) {
        startTransition(() => deletePagina(page.id));
    }
  }

  return (
    <div>
      <div 
        className={`flex items-center justify-between group rounded-md transition-colors ${selectedPageId === page.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <div className="flex items-center gap-2 cursor-pointer flex-grow" onClick={() => router.push(`/disciplinas?page=${page.id}`)}>
          {page.children && page.children.length > 0 && (
            <span onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-xs">{isExpanded ? '▼' : '►'}</span>
          )}
          <span>{page.emoji}</span>
          <span className="text-sm truncate">{page.title}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <button onClick={handleCreate} className="p-1 hover:text-green-400"><PlusCircle size={14} /></button>
            <button onClick={handleDelete} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      </div>
      {isExpanded && page.children && (
        <div>
          {page.children.map(child => <PageNode key={child.id} page={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

export function SidebarClient({ tree, allPages }: { tree: Pagina[]; allPages: Pagina[] }) {
    const [isPending, startTransition] = useTransition();

    const handleCreateRoot = () => {
        const title = prompt('Nome da nova página/pasta:');
        const emoji = prompt('Emoji para a nova página:');
        if (title && emoji) {
            startTransition(() => createPagina(null, title, emoji));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">BIBLIOTECA</h2>
                <button onClick={handleCreateRoot} className="p-1 text-gray-400 hover:text-white"><PlusCircle size={18}/></button>
            </div>
            {tree.map(rootPage => <PageNode key={rootPage.id} page={rootPage} level={0} />)}
        </div>
    );
}