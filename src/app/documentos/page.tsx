// src/app/documentos/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DocumentosSidebar, DocumentoNode } from '@/components/DocumentosSidebar';
import { Editor } from '@/components/Editor';
import { updateDocumentoContent } from '@/app/actions'; // Precisamos de uma ação específica para salvar o conteúdo

// Tipagem para os documentos vindos do banco
type DocumentoFromDB = {
  id: number;
  parent_id: number | null;
  title: string;
  content: any; // JSONB do Supabase
};

// Função para montar a árvore de documentos
const buildTree = (docs: DocumentoFromDB[]): DocumentoNode[] => {
    const map = new Map<number, DocumentoNode>();
    const roots: DocumentoNode[] = [];

    docs.forEach(doc => {
        map.set(doc.id, { ...doc, children: [] });
    });

    docs.forEach(doc => {
        const node = map.get(doc.id);
        if (node) {
            if (doc.parent_id && map.has(doc.parent_id)) {
                map.get(doc.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });

    return roots;
};


export default async function DocumentosPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session }} = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Buscar todos os documentos do usuário
  const { data: allDocuments, error: docsError } = await supabase
    .from('documentos')
    .select('id, parent_id, title')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true });

  if (docsError) {
    console.error("Erro ao buscar documentos:", docsError);
    return <p>Erro ao carregar os documentos.</p>;
  }

  // 2. Montar a estrutura de árvore
  const documentTree = buildTree(allDocuments || []);
  
  // 3. Buscar o documento selecionado para o editor
  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  let selectedDocument: DocumentoFromDB | null = null;

  if (selectedId) {
    const { data: docData, error: docError } = await supabase
      .from('documentos')
      .select('id, title, content')
      .eq('id', selectedId)
      .eq('user_id', session.user.id)
      .single();
    
    if (docError) {
        console.error("Erro ao buscar documento selecionado:", docError);
    } else {
        selectedDocument = docData;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        {/* A barra lateral recebe a árvore de documentos */}
        <DocumentosSidebar tree={documentTree} />
      </div>

      <div className="md:col-span-3 h-full">
        {/* O editor recebe os dados do documento selecionado */}
        {selectedDocument ? (
            <Editor 
                key={selectedDocument.id} // Chave para forçar a remontagem ao mudar de doc
                pageId={selectedDocument.id}
                title={selectedDocument.title}
                content={selectedDocument.content}
                onSave={updateDocumentoContent} // Passamos a Server Action de salvar
            />
        ) : (
            <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
                <p className="text-gray-400">Selecione ou crie um documento para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}