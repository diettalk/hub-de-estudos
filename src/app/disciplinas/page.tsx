// src/app/disciplinas/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Node } from '@/components/HierarchicalSidebar';
import DisciplinasClient from '@/components/DisciplinasClient'; // Importa o novo componente

export const dynamic = 'force-dynamic';

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

  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('id, parent_id, title, emoji')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  const paginaTree = buildTree((allPaginas as Node[]) || []);
  
  const selectedId = searchParams.page ? Number(searchParams.page) : null;
  let initialPage: (Node & { content: any }) | null = null;

  if (selectedId) {
    const { data: pageData } = await supabase
      .from('paginas')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    initialPage = pageData as (Node & { content: any }) | null;
  }
  
  return (
    <DisciplinasClient 
        paginaTree={paginaTree}
        initialPage={initialPage}
    />
  );
}
