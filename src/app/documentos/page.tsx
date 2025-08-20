// src/app/documentos/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Node } from '@/components/HierarchicalSidebar';
import DocumentosClient from '@/components/DocumentosClient'; // Importa o novo componente

export const dynamic = 'force-dynamic';

const buildTree = (docs: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    docs.forEach(doc => {
        map.set(doc.id, { ...doc, children: [] });
    });

    docs.forEach(doc => {
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

  const { data: allDocuments } = await supabase
    .from('documentos')
    .select('id, parent_id, title')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const documentTree = buildTree((allDocuments as Node[]) || []);

  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  let initialDocument: (Node & { content: any }) | null = null;
  
  if (selectedId) {
    const { data: docData } = await supabase
      .from('documentos')
      .select('id, parent_id, title, content')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    initialDocument = docData as (Node & { content: any }) | null;
  }
  
  return (
    <DocumentosClient 
        documentTree={documentTree}
        initialDocument={initialDocument}
    />
  );
}
