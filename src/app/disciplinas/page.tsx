// src/app/disciplinas/page.tsx (VERSÃO CORRIGIDA)

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SidebarClient } from '@/components/SidebarClient';
import { Editor } from '@/components/Editor';
import { updatePagina } from '@/app/actions';

export type Pagina = {
  id: number;
  parent_id: number | null;
  title: string;
  emoji: string;
  content: any;
  children?: Pagina[];
};

const buildTree = (pages: Pagina[]): Pagina[] => {
  const pageMap: { [key: number]: Pagina } = {};
  pages.forEach(page => {
    pageMap[page.id] = { ...page, children: [] };
  });

  const tree: Pagina[] = [];
  pages.forEach(page => {
    if (page.parent_id && pageMap[page.parent_id]) {
      pageMap[page.parent_id].children?.push(pageMap[page.id]);
    } else {
      tree.push(pageMap[page.id]);
    }
  });

  return tree;
};

export default async function DisciplinasPage({
  searchParams,
}: {
  searchParams: { page: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser(); // Usando getUser() como boa prática
  if (!user) redirect('/login');

  const { data: paginas } = await supabase
    .from('paginas')
    .select('*')
    .order('title', { ascending: true });

  const tree = buildTree(paginas || []);
  
  const selectedPageId = Number(searchParams.page) || (paginas && paginas[0] ? paginas[0].id : null);
  const selectedPage = paginas?.find(p => p.id === selectedPageId) || null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[80vh]">
      <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg overflow-y-auto">
        <SidebarClient tree={tree} allPages={paginas || []} />
      </div>
      <div className="md:col-span-3 bg-gray-800 p-6 rounded-lg flex flex-col">
        {selectedPage ? (
          <>
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">{selectedPage.emoji}</span>
              {selectedPage.title}
            </h1>
            {/* ***** A CORREÇÃO ESTÁ AQUI ***** */}
            <Editor 
              key={selectedPage.id} // Adicionamos a KEY para forçar a recriação do componente
              pageId={selectedPage.id}
              title={selectedPage.title}
              emoji={selectedPage.emoji}
              content={selectedPage.content}
              onSave={updatePagina}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Selecione uma página ou crie uma nova.</p>
          </div>
        )}
      </div>
    </div>
  );
}