import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';

export const dynamic = 'force-dynamic';

// A função buildTree continua a mesma
const buildTree = (paginas: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    paginas.forEach(p => {
        map.set(p.id, { ...p, children: [] });
    });

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

  // CORREÇÃO: Vamos buscar TODOS os dados das 'paginas' para garantir que nada fica de fora,
  // e ordenar por 'title' para consistência.
  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('*') // Buscamos tudo para garantir que temos todos os dados para a árvore e para o editor
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  const paginaTree = buildTree((allPaginas as Node[]) || []);
  
  const selectedId = searchParams.page ? Number(searchParams.page) : null;
  
  // Agora, em vez de fazer uma segunda busca, simplesmente encontramos a página selecionada na lista que já temos.
  const selectedPage = allPaginas?.find(p => p.id === selectedId) || null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        <HierarchicalSidebar 
            tree={paginaTree} 
            table="paginas"
            title="DISCIPLINAS"
        />
      </div>
      <div className="md:col-span-3 h-full">
        {selectedPage ? (
            <TextEditor
                key={selectedPage.id}
                initialContent={selectedPage.content}
                onSave={async (newContent: JSONContent) => {
                    'use server';
                    await updatePaginaContent(selectedPage!.id, newContent);
                }}
            />
        ) : (
            <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                <p className="text-muted-foreground">Selecione ou crie uma disciplina para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}
