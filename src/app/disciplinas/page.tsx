import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildTree } from '@/lib/utils';
import DisciplinasClient from '@/components/DisciplinasClient';
import { type Node } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DisciplinasPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('id, parent_id, title, emoji')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  const paginaTree = buildTree(allPaginas || []);
  
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

