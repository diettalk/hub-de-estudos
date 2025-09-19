import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildTree } from '@/lib/utils';
import DocumentosClient from '@/components/DocumentosClient';
import { type Node } from '@/lib/types';
import { type JSONContent } from '@tiptap/react';

export const dynamic = 'force-dynamic';

// NOVO: Função para limpar o conteúdo do Tiptap de "vídeos fantasma"
function sanitizeTiptapContent(node: JSONContent | null): JSONContent | null {
  if (!node || !Array.isArray(node.content)) {
    return node;
  }

  // Filtra os nós de conteúdo, removendo vídeos do YouTube inválidos
  const sanitizedContent = node.content.filter(childNode => {
    if (childNode.type === 'youtube') {
      return typeof childNode.attrs?.src === 'string' && childNode.attrs.src.trim() !== '';
    }
    // Limpa recursivamente os filhos de nós que podem ter conteúdo
    if (childNode.content) {
        childNode.content = sanitizeTiptapContent(childNode as any)?.content || [];
    }
    return true;
  });

  return { ...node, content: sanitizedContent };
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

  const selectedId = searchParams.id ? Number(searchParams.id) : null;
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

