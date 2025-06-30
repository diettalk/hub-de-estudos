// src/components/DocumentosSidebar.tsx (NOVO ARQUIVO)

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DocumentoEditor } from './DocumentoEditor'; // Reutilizamos o editor para adicionar

// O tipo de um documento individual
type Documento = {
  id: number;
  title: string;
};

// As propriedades que o nosso sidebar vai receber
type DocumentosSidebarProps = {
  documentos: Documento[];
};

export function DocumentosSidebar({ documentos }: DocumentosSidebarProps) {
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get('id'));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">DOCUMENTOS</h2>
        {/* O botão de adicionar um novo documento fica aqui no topo */}
        <DocumentoEditor /> 
      </div>
      <div className="space-y-1">
        {documentos.map(doc => (
          <Link
            key={doc.id}
            href={`/documentos?id=${doc.id}`}
            className={`block p-2 rounded-md text-sm truncate transition-colors ${
              selectedId === doc.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
            }`}
          >
            {doc.title}
          </Link>
        ))}
      </div>
    </div>
  );
}