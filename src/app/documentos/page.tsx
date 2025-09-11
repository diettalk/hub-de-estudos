import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildTree } from '@/lib/utils';
import DocumentosClient from '@/components/DocumentosClient';
import { type Node } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DocumentosPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // CORREÇÃO: Adicionada a coluna 'is_favorite' à busca de dados.
  const { data: allDocuments } = await supabase
    .from('documentos')
    .select('id, parent_id, title, is_favorite') 
    .eq('user_id', user.id)
    .order('title'); 

  // A linha de console.log defeituosa foi removida daqui.

  const documentTree = buildTree(allDocuments || []);

  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  let initialDocument: Node | null = null;
  
  if (selectedId) {
    const { data: docData } = await supabase
      .from('documentos')
      .select('id, parent_id, title, content, is_favorite')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    initialDocument = docData as Node | null;
  }
  
  return (
    <DocumentosClient 
        documentTree={documentTree}
        initialDocument={initialDocument}
    />
  );
}

