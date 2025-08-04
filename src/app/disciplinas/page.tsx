// src/app/disciplinas/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor'; // Seu componente de editor
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updatePaginaContent } from '@/app/actions';

export const dynamic = 'force-dynamic';

type PaginaFromDB = {
  id: number;
  parent_id: number | null;
  title: string;
  emoji: string;
  content: any; 
};

const buildTree = (paginas: PaginaFromDB[]): Node[] => {
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

  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('id, parent_id, title, emoji')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const paginaTree = buildTree(allPaginas || []);
  
  const selectedId = searchParams.page ? Number(searchParams.page) : null;
  let selectedPage: PaginaFromDB | null = null;

  if (selectedId) {
    const { data: pageData } = await supabase
      .from('paginas')
      .select('id, title, content, emoji')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    selectedPage = pageData;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        {/* CORREÇÃO: Removida a prop 'actions' e 'itemType', e adicionada a prop 'table' */}
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
                onSave={async (newContent: any) => {
                  'use server';
                  await updatePaginaContent(selectedPage!.id, newContent);
                }}
            />
        ) : (
            <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
                <p className="text-gray-400">Selecione ou crie uma disciplina para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}
