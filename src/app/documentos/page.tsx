// src/app/documentos/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';

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

  const { data: allDocuments } = await supabase
    .from('documentos')
    .select('id, parent_id, title')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const documentTree = buildTree(allDocuments || []);

  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  let selectedDocument: DocumentoFromDB | null = null;
  
  if (selectedId) {
    const { data: docData } = await supabase
      .from('documentos')
      .select('id, title, content')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    selectedDocument = docData;
  }
  
  // [CORREÇÃO] A função onSave é definida aqui e passada como prop
  const handleSave = async (newContent: JSONContent) => {
    'use server';
    if (!selectedId) return;
    await updateDocumentoContent(selectedId, newContent);
  };

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
        {selectedDocument ? (
            <div className="bg-card border rounded-lg h-full flex flex-col">
                <TextEditor
                    key={selectedDocument.id}
                    initialContent={selectedDocument.content}
                    onSave={handleSave}
                />
            </div>
        ) : (
            <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                <p className="text-muted-foreground">Selecione ou crie um documento para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}
