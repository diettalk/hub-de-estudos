// src/components/DocumentosSidebar.tsx (FLUXO DE CRIAÇÃO CORRIGIDO)

'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDocumento, deleteDocumento } from '@/app/actions';
import { PlusCircle, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export type DocumentoNode = {
  id: number;
  parent_id: number | null;
  title: string;
  children: DocumentoNode[];
};

const Node = ({ doc, level }: { doc: DocumentoNode; level: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get('id'));

  const handleCreate = (parentId: number | null) => {
    const title = prompt('Nome do novo documento/pasta:');
    if (!title || title.trim() === '') return;
    
    const formData = new FormData();
    formData.append('title', title);
    if (parentId) {
      formData.append('parent_id', String(parentId));
    }

    startTransition(async () => {
      const result = await addDocumento(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.data) {
        toast.success(`'${title}' criado com sucesso.`);
        router.push(`/documentos?id=${result.data.id}`);
      }
    });
  };
  
  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir "${doc.title}" e TUDO dentro dele?`)) {
      startTransition(async () => {
        await deleteDocumento(doc.id);
        toast.info(`'${doc.title}' foi excluído.`);
        if (selectedId === doc.id) router.push('/documentos');
      });
    }
  }

  return (
    <div>
      <div 
        className={`flex items-center justify-between group rounded-md transition-colors ${selectedId === doc.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <div className="flex items-center gap-2 cursor-pointer flex-grow py-1" onClick={() => router.push(`/documentos?id=${doc.id}`)}>
          {doc.children.length > 0 ? (
            <span onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-xs w-4 text-center cursor-pointer">{isExpanded ? '▼' : '►'}</span>
          ) : (
            <span className="w-4 ml-1 mr-1 text-gray-500"><FileText size={12} /></span>
          )}
          <span className="text-sm truncate">{doc.title}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1">
            <button onClick={() => handleCreate(doc.id)} className="p-1 hover:text-green-400" title="Adicionar sub-documento"><PlusCircle size={14} /></button>
            <button onClick={handleDelete} className="p-1 hover:text-red-400" title="Excluir"><Trash2 size={14} /></button>
        </div>
      </div>
      {isExpanded && (
        <div>
          {doc.children.map(child => <Node key={child.id} doc={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

export function DocumentosSidebar({ tree }: { tree: DocumentoNode[] }) {
  // A função handleCreate foi movida para dentro do Node para ter acesso ao parentId
  // mas a lógica de criar na raiz continua aqui.
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateRoot = () => {
    const title = prompt('Nome do novo documento/pasta raiz:');
    if (!title || title.trim() === '') return;
    
    const formData = new FormData();
    formData.append('title', title);
    
    startTransition(async () => {
      const result = await addDocumento(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.data){
        toast.success(`'${title}' criado com sucesso.`);
        router.push(`/documentos?id=${result.data.id}`);
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">DOCUMENTOS</h2>
        <button onClick={handleCreateRoot} className="p-1 text-gray-400 hover:text-white" title="Adicionar documento raiz">
          <PlusCircle size={18}/>
        </button>
      </div>
      <div className="space-y-1">
        {tree.map(rootDoc => <Node key={rootDoc.id} doc={rootDoc} level={0} />)}
      </div>
    </div>
  );
}