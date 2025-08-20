// src/app/disciplinas/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const buildTree = (paginas: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    paginas.forEach(p => {
        map.set(p.id, { ...p, children: [] });
    });

    paginas.forEach(p => {
        const node = map.get(p.id);
        if (node) {
            if (p.parent_id && map.has(p.parent_id)) {
                const parent = map.get(p.parent_id)!;
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

export default async function DisciplinasPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const selectedId = searchParams.page ? Number(searchParams.page) : null;

  // Modo de Foco (Tela Cheia)
  if (selectedId) {
    const { data: selectedPage } = await supabase
      .from('paginas')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();

    if (!selectedPage) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg text-muted-foreground">Disciplina não encontrada.</p>
            <Button asChild variant="link"><Link href="/disciplinas">Voltar para Disciplinas</Link></Button>
        </div>
      );
    }
      
    const handleSave = async (newContent: JSONContent) => {
      'use server';
      await updatePaginaContent(selectedId, newContent);
    };

    const handleClose = async () => {
        'use server';
        redirect('/disciplinas');
    };

    return (
        <div className="h-full w-full p-4">
            <TextEditor
                key={selectedPage.id}
                initialContent={selectedPage.content}
                onSave={handleSave}
                onClose={() => handleClose()}
            />
        </div>
    );
  }
  
  // Visualização Padrão
  const { data: allPaginas } = await supabase
    .from('paginas')
    .select('id, parent_id, title, emoji')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  const paginaTree = buildTree((allPaginas as Node[]) || []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        <HierarchicalSidebar 
            tree={paginaTree} 
            table="paginas"
            title="DISCIPLINAS"
        />
      </div>
      <div className="md:col-span-3 h-full">
        <div className="flex items-center justify-center h-full bg-card border rounded-lg">
            <p className="text-muted-foreground">Selecione ou crie uma disciplina para começar.</p>
        </div>
      </div>
    </div>
  );
}
