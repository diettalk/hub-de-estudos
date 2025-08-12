import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';

export const dynamic = 'force-dynamic';

// A mesma função que usamos na página de Disciplinas para construir a árvore
const buildTree = (documentos: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    documentos.forEach(doc => {
        map.set(doc.id, { ...doc, children: [] });
    });

    documentos.forEach(doc => {
        const node = map.get(doc.id);
        if (node) {
            if (doc.parent_id && map.has(doc.parent_id)) {
                const parent = map.get(doc.parent_id)!;
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

export default async function DocumentosPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Busca todos os itens da tabela 'documentos' para construir a árvore
  const { data: allDocumentos } = await supabase
    .from('documentos')
    .select('id, parent_id, title, emoji') // 'emoji' pode não existir, mas não causa erro
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const documentTree = buildTree((allDocumentos as Node[]) || []);
  
  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  let selectedDocument: Node | null = null;

  // Se um ID estiver selecionado na URL, busca o conteúdo completo desse item
  if (selectedId) {
    const { data: docData } = await supabase
      .from('documentos')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    selectedDocument = docData as Node | null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        {/* Renderiza a sidebar hierárquica, dizendo que a tabela é 'documentos' */}
        <HierarchicalSidebar 
            tree={documentTree} 
            table="documentos"
            title="DOCUMENTOS"
        />
      </div>
      <div className="md:col-span-3 h-full">
        {selectedDocument ? (
            // Se um documento estiver selecionado, mostra o nosso novo editor avançado
            <TextEditor
                key={selectedDocument.id}
                initialContent={selectedDocument.content}
                onSave={async (newContent: JSONContent) => {
                    'use server';
                    await updateDocumentoContent(selectedDocument!.id, newContent);
                }}
            />
        ) : (
            // Mensagem padrão se nada estiver selecionado
            <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                <p className="text-muted-foreground">Selecione ou crie um documento para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}
