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

  // CORREÇÃO: Usamos select('*') para garantir que todos os dados necessários são buscados.
  const { data: allDocuments } = await supabase
    .from('documentos')
    .select('*') 
    .eq('user_id', user.id)
    .order('title'); 

  const documentTree = buildTree(allDocuments || []);

  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  let initialDocument: Node | null = null;
  
  if (selectedId) {
    const { data: docData } = await supabase
      .from('documentos')
      .select('*') // Também aqui para consistência
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

