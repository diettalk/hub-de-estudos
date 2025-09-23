import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildTree } from '@/lib/utils';
import DocumentosClient from '@/components/DocumentosClient';
import { type Node } from '@/lib/types';
import { type JSONContent } from '@tiptap/react';

export const dynamic = 'force-dynamic';

// NOVO: Função de sanitização robusta para o conteúdo do Tiptap
function sanitizeTiptapContent(node: JSONContent | null | undefined): JSONContent | null {
  if (!node || !Array.isArray(node.content)) {
    return node || null;
  }

  // 1. Mapeia e limpa recursivamente todos os nós filhos primeiro
  const processedChildren = node.content.map(childNode => {
    if (childNode && childNode.content) {
      // Cria um novo nó filho com o seu conteúdo já sanitizado
      return {
        ...childNode,
        content: sanitizeTiptapContent(childNode as any)?.content || [],
      };
    }
    return childNode;
  });

  // 2. Filtra os nós inválidos do YouTube APÓS a limpeza recursiva
  const sanitizedContent = processedChildren.filter(childNode => {
    if (childNode && childNode.type === 'youtube') {
      // Mantém o vídeo apenas se 'src' for uma string não vazia
      return typeof childNode.attrs?.src === 'string' && childNode.attrs.src.trim() !== '';
    }
    // Mantém todos os outros tipos de nós
    return true;
  });

  return { ...node, content: sanitizedContent as JSONContent[] };
}


export default async function DocumentosPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: allDocuments } = await supabase
    .from('documentos')
    .select('*') 
    .eq('user_id', user.id)
    .order('title'); 

  const documentTree = buildTree(allDocuments || []);

  const idParam = searchParams.id;
  const selectedId = idParam ? Number(idParam) : null;
  let initialDocument: Node | null = null;
  
  if (selectedId) {
    const { data: docData } = await supabase
      .from('documentos')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    
    if (docData) {
        // CORREÇÃO: Limpa o conteúdo antes de o enviar para o cliente
        docData.content = sanitizeTiptapContent(docData.content);
        initialDocument = docData as Node | null;
    }
  }
  
  return (
    <DocumentosClient 
        documentTree={documentTree}
        initialDocument={initialDocument}
    />
  );
}

