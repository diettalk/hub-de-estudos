// src/app/documentos/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DocumentoEditor } from '@/components/DocumentoEditor';

export const dynamic = 'force-dynamic';

export default async function DocumentosPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Você precisa estar logado para ver seus documentos.</div>
  }

  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .eq('user_id', user.id)
    .order('title');

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Documentos Estratégicos</h1>
          <p className="text-gray-400 mt-2">Sua base de conhecimento centralizada.</p>
        </div>
        <DocumentoEditor />
      </header>
      
      <div className="space-y-4">
        {documentos && documentos.length > 0 ? (
          documentos.map(doc => (
            <details key={doc.id} className="card bg-gray-800/50 p-4 rounded-lg border-gray-700 group">
              <summary className="font-semibold text-xl cursor-pointer flex justify-between items-center">
                <span>{doc.title}</span>
                <div className="flex items-center gap-2 opacity-0 group-open:opacity-100 transition-opacity">
                  {/* @ts-ignore */}
                  <DocumentoEditor documento={doc} />
                </div>
              </summary>
              <div 
                className="prose prose-invert max-w-none mt-4 pt-4 border-t border-gray-700"
                dangerouslySetInnerHTML={{ __html: doc.content || '<p>Nenhum conteúdo ainda. Clique no lápis para editar.</p>' }}
              >
              </div>
            </details>
          ))
        ) : (
          <div className="text-center py-10 card bg-gray-800/50 border-gray-700">
            <h3 className="font-bold text-lg">Nenhum documento encontrado.</h3>
            <p className="text-gray-400">Clique em "+ Adicionar Documento" para criar o seu primeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
}