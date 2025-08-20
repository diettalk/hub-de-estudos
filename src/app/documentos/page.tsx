// src/app/documentos/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type DocumentoFromDB = {
  id: number;
  parent_id: number | null;
  title: string;
  content: any; 
};

const buildTree = (docs: DocumentoFromDB[]): Node[] => {
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

  const selectedId = searchParams.id ? Number(searchParams.id) : null;

  // Se um documento estiver selecionado, entramos no modo de tela cheia
  if (selectedId) {
    const { data: selectedDocument } = await supabase
      .from('documentos')
      .select('id, title, content')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();

    if (!selectedDocument) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-lg text-muted-foreground">Documento não encontrado.</p>
                <Button asChild variant="link"><Link href="/documentos">Voltar para Documentos</Link></Button>
            </div>
        );
    }

    const handleSave = async (newContent: JSONContent) => {
      'use server';
      await updateDocumentoContent(selectedId, newContent);
    };

    const handleClose = async () => {
        'use server';
        redirect('/documentos');
    };

    return (
        <div className="h-full w-full p-4">
             <TextEditor
                key={selectedDocument.id}
                initialContent={selectedDocument.content}
                onSave={handleSave}
                onClose={() => handleClose()}
            />
        </div>
    );
  }

  // Visualização padrão com a barra lateral
  const { data: allDocuments } = await supabase
    .from('documentos')
    .select('id, parent_id, title')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const documentTree = buildTree(allDocuments || []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 h-full">
      <div className="md:col-span-1 h-full p-4">
        <HierarchicalSidebar 
            tree={documentTree} 
            table="documentos"
            title="DOCUMENTOS"
        />
      </div>
      <div className="md:col-span-3 h-full flex flex-col p-4">
        <div className="flex items-center justify-center h-full bg-card border rounded-lg">
            <p className="text-muted-foreground">Selecione ou crie um documento para começar.</p>
        </div>
      </div>
    </div>
  );
}
