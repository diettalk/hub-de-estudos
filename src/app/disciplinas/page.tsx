import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildTree } from '@/lib/utils';
import DisciplinasClient from '@/components/DisciplinasClient';
import { type Node } from '@/lib/types';
import { type JSONContent } from '@tiptap/react';

export const dynamic = 'force-dynamic';

// NOVO: Função de sanitização robusta para o conteúdo do Tiptap
function sanitizeTiptapContent(node: JSONContent | null | undefined): JSONContent | null {
  if (!node || !Array.isArray(node.content)) {
    return node || null;
  }
  const processedChildren = node.content.map(childNode => {
    if (childNode && childNode.content) {
      return { ...childNode, content: sanitizeTiptapContent(childNode as any)?.content || [] };
    }
    return childNode;
  });
  const sanitizedContent = processedChildren.filter(childNode => {
    if (childNode && childNode.type === 'youtube') {
      return typeof childNode.attrs?.src === 'string' && childNode.attrs.src.trim() !== '';
    }
    return true;
  });
  return { ...node, content: sanitizedContent as JSONContent[] };
}

export default async function DisciplinasPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('*')
    .eq('user_id', user.id)
    .order('title');

  const paginaTree = buildTree(allPaginas || []);
  
 const idParam = searchParams.page; // Renomeado para evitar conflitos de nome, mantendo a lógica
  const selectedId = idParam ? Number(idParam) : null;
  let initialPage: Node | null = null;

  if (selectedId) {
    const { data: pageData } = await supabase
      .from('paginas')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    
    if (pageData) {
        // CORREÇÃO: Limpa o conteúdo antes de o enviar para o cliente
        pageData.content = sanitizeTiptapContent(pageData.content);
        initialPage = pageData as Node | null;
    }
  }
  
  return (
    <DisciplinasClient 
        paginaTree={paginaTree}
        initialPage={initialPage}
    />
  );
}

