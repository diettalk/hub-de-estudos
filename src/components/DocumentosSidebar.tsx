// src/components/DocumentosSidebar.tsx

'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDocumento, deleteDocumento } from '@/app/actions'; // Verifique se o caminho está correto
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
    // Se o usuário cancelar ou deixar em branco, não faz nada
    if (!title || title.trim() === '') {
        toast.info("Criação cancelada.");
        return;
    }
    
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
        // Navega para o novo documento para que ele seja exibido no editor
        router.push(`/documentos?id=${result.data.id}`);
      }
    });
  };
  
  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir "${doc.title}" e TUDO dentro dele? Esta ação não pode ser desfeita.`)) {
      startTransition(async () => {
        await deleteDocumento(doc.id);
        toast.info(`'${doc.title}' foi excluído.`);
        // Se o documento deletado era o que estava aberto, volta para a página principal de documentos
        if (selectedId === doc.id) router.push('/documentos');
      });
    }
  }

  return (
    <div>
      <div 
        className={`flex items-center justify-between group rounded-md transition-colors ${selectedId === doc.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateRoot = () => {
    const title = prompt('Nome do novo documento/pasta raiz:');
    if (!title || title.trim() === '') {
        toast.info("Criação cancelada.");
        return;
    }
    
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
    <div className="bg-gray-900 text-white p-4 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">DOCUMENTOS</h2>
        <button onClick={handleCreateRoot} className="p-1 text-gray-400 hover:text-white" title="Adicionar documento raiz">
          <PlusCircle size={18}/>
        </button>
      </div>
      <div className="space-y-1 flex-grow overflow-auto">
        {tree.map(rootDoc => <Node key={rootDoc.id} doc={rootDoc} level={0} />)}
      </div>
    </div>
  );
}