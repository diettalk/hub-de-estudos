import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildTree } from '@/lib/utils';
import DisciplinasClient from '@/components/DisciplinasClient';
import { type Node } from '@/lib/types';
import { HierarchicalSidebar } from "@/components/HierarchicalSidebar";

export const dynamic = 'force-dynamic';

export default async function DisciplinasPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // CORREÇÃO 1: Adicionamos 'sort_order' à query
  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('id, parent_id, title, emoji, sort_order')
    .eq('user_id', user.id)
    .order('sort_order'); // CORREÇÃO 2: Ordenamos por 'sort_order'

  // CORREÇÃO 3: Convertemos os IDs para string para o react-arborist
  // Isso é obrigatório para o Tree funcionar corretamente!
  const formattedPaginas = (allPaginas || []).map(page => ({
    ...page,
    id: String(page.id),
    parent_id: page.parent_id !== null ? String(page.parent_id) : null,
  }));

  const paginaTree = buildTree(formattedPaginas);
  
  const selectedId = searchParams.page ? Number(searchParams.page) : null;
  let initialPage: Node | null = null;

  if (selectedId) {
    const { data: pageData } = await supabase
      .from('paginas')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    initialPage = pageData as Node | null;
  }
  
  return (
    <DisciplinasClient 
        paginaTree={paginaTree}
        initialPage={initialPage}
    />
  );
}

