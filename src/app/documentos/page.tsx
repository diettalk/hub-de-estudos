// src/app/documentos/page.tsx (CORREÇÃO FINAL)

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Editor } from '@/components/Editor';
import { DocumentosSidebar, type DocumentoNode } from '@/components/DocumentosSidebar';
import { updateDocumento } from '@/app/actions';

export const dynamic = 'force-dynamic';

const buildTree = (documentos: Omit<DocumentoNode, 'children'>[]): DocumentoNode[] => {
  const docMap: { [key: number]: DocumentoNode } = {};
  documentos.forEach(doc => {
    docMap[doc.id] = { ...doc, children: [] };
  });
  const tree: DocumentoNode[] = [];
  documentos.forEach(doc => {
    if (doc.parent_id && docMap[doc.parent_id]) {
      docMap[doc.parent_id].children?.push(docMap[doc.id]);
    } else {
      tree.push(docMap[doc.id]);
    }
  });
  return tree;
};

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: { id: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: documentos } = await supabase
    .from('documentos')
    .select('id, title, content, parent_id')
    .eq('user_id', user.id)
    .order('title');

  const tree = buildTree(documentos || []);

  if (!documentos || documentos.length === 0) {
    // A lógica para estado vazio agora é tratada pelo Sidebar
    return (
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[85vh]">
        <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg overflow-y-auto">
          <DocumentosSidebar tree={[]} />
        </div>
        <div className="md:col-span-3 bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center">
            <h3 className="font-bold text-lg">Nenhum documento encontrado.</h3>
            <p className="text-gray-400">Crie seu primeiro documento no painel à esquerda.</p>
        </div>
      </div>
    );
  }

  const selectedDocumentId = Number(searchParams.id) || tree[0]?.id;
  const selectedDocument = documentos.find(doc => doc.id === selectedDocumentId);

  let parsedContent = null;
  if (selectedDocument?.content) {
    try {
      parsedContent = typeof selectedDocument.content === 'string' 
        ? JSON.parse(selectedDocument.content) 
        : selectedDocument.content;
    } catch (e) {
      parsedContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(selectedDocument.content) }] }] };
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[85vh]">
      <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg overflow-y-auto">
        <DocumentosSidebar tree={tree} />
      </div>

      <div className="md:col-span-3 bg-gray-800 p-6 rounded-lg flex flex-col">
        {selectedDocument ? (
          <Editor
            key={selectedDocument.id}
            pageId={selectedDocument.id}
            content={parsedContent}
            onSave={updateDocumento}
            title={selectedDocument.title}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Selecione um documento na lista para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}