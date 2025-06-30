// src/app/documentos/page.tsx (VERSÃO REFATORADA)

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Editor } from '@/components/Editor'; // Reutilizamos o mesmo editor da pág. de Disciplinas
import { DocumentosSidebar } from '@/components/DocumentosSidebar'; // Importamos nosso novo sidebar
import { updateDocumento } from '@/app/actions'; // A ação de salvar que será passada para o Editor

export const dynamic = 'force-dynamic';

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: { id: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. Buscamos todos os documentos
  const { data: documentos } = await supabase
    .from('documentos')
    .select('id, title, content') // Selecionamos apenas o necessário
    .eq('user_id', user.id)
    .order('title');

  // Se não houver documentos, mostramos uma mensagem amigável
  if (!documentos || documentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
         <div className="text-center py-10 card bg-gray-800/50 border-gray-700 w-full max-w-md">
           <h3 className="font-bold text-lg">Nenhum documento encontrado.</h3>
           <p className="text-gray-400 mt-2">Clique no botão abaixo para criar o seu primeiro.</p>
           <div className="mt-4">
             <DocumentoEditor />
           </div>
         </div>
      </div>
    );
  }

  // 2. Determinamos qual documento está selecionado a partir da URL
  const selectedDocumentId = Number(searchParams.id) || documentos[0].id;
  const selectedDocument = documentos.find(doc => doc.id === selectedDocumentId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[85vh]">
      {/* Coluna da Esquerda: O novo Sidebar */}
      <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg overflow-y-auto">
        <DocumentosSidebar documentos={documentos} />
      </div>

      {/* Coluna da Direita: O Editor de Texto */}
      <div className="md:col-span-3 bg-gray-800 p-6 rounded-lg flex flex-col">
        {selectedDocument ? (
          // Usamos o mesmo componente Editor, passando a key, o conteúdo e a ação de salvar correta
          <Editor
            key={selectedDocument.id}
            pageId={selectedDocument.id}
            content={selectedDocument.content}
            onSave={updateDocumento} // Passamos a ação 'updateDocumento'
            // As props de título e emoji não são necessárias aqui
            title="" 
            emoji=""
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Selecione um documento na lista.</p>
          </div>
        )}
      </div>
    </div>
  );
}