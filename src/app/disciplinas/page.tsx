import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';

export const dynamic = 'force-dynamic';

// Função para construir a árvore a partir de uma lista plana de páginas
const buildTree = (paginas: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    // Primeiro, cria um mapa de todos os nós para acesso rápido
    paginas.forEach(p => {
        map.set(p.id, { ...p, children: [] });
    });

    // Agora, atribui cada nó ao seu pai correto
    paginas.forEach(p => {
        const node = map.get(p.id);
        if (node) {
            if (p.parent_id && map.has(p.parent_id)) {
                const parent = map.get(p.parent_id)!;
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

export default async function DisciplinasPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Busca todos os itens da tabela 'paginas' para construir a árvore
  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('id, parent_id, title, emoji') // Não buscamos o 'content' de todos para otimizar
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const paginaTree = buildTree((allPaginas as Node[]) || []);
  
  const selectedId = searchParams.page ? Number(searchParams.page) : null;
  let selectedPage: Node | null = null;

  // Se um ID estiver selecionado na URL, busca o conteúdo completo desse item
  if (selectedId) {
    const { data: pageData } = await supabase
      .from('paginas')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    selectedPage = pageData as Node | null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        {/* Renderiza a nova sidebar hierárquica */}
        <HierarchicalSidebar 
            tree={paginaTree} 
            table="paginas"
            title="DISCIPLINAS"
        />
      </div>
      <div className="md:col-span-3 h-full">
        {selectedPage ? (
            // Se uma página estiver selecionada, mostra o editor
            <TextEditor
                key={selectedPage.id} // A chave força o editor a recarregar quando a página muda
                initialContent={selectedPage.content}
                onSave={async (newContent: JSONContent) => {
                    'use server';
                    await updatePaginaContent(selectedPage!.id, newContent);
                }}
            />
        ) : (
            // Se nenhuma página estiver selecionada, mostra uma mensagem
            <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                <p className="text-muted-foreground">Selecione ou crie uma disciplina para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}
