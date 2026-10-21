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

// CORREÇÃO 1: searchParams agora deve ser tipado como uma Promise
export default async function DisciplinasPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  // CORREÇÃO 2: Await na promise dos cookies
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('*')
    .eq('user_id', user.id)
    .order('title');

  const paginaTree = buildTree(allPaginas || []);
  
  // CORREÇÃO 3: Await na promise do searchParams antes de usar
  const params = await searchParams;
  const idParam = params.page; 
  
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