import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import BibliotecaClient from '@/components/BibliotecaClient';

export const dynamic = 'force-dynamic';

// Função para construir a árvore a partir de uma lista plana de recursos
const buildTree = (resources: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    resources.forEach(r => {
        map.set(r.id, { ...r, children: [] });
    });

    resources.forEach(r => {
        const node = map.get(r.id);
        if (node) {
            if (r.parent_id && map.has(r.parent_id)) {
                const parent = map.get(r.parent_id)!;
                if (!parent.children) parent.children = [];
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

export default async function BibliotecaPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Busca todos os recursos do utilizador
  const { data: allResources } = await supabase
    .from('recursos')
    .select('id, parent_id, title, type, emoji')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const resourceTree = buildTree((allResources as Node[]) || []);
  
  const selectedId = searchParams?.page ? Number(String(searchParams.page)) : null;
  let selectedResource: any = null;

  if (selectedId) {
    const { data: resourceData } = await supabase
      .from('recursos')
      .select('*')
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .single();
    selectedResource = resourceData;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        {/* A Sidebar Hierárquica agora gere a árvore de recursos */}
        <HierarchicalSidebar 
            tree={resourceTree} 
            table="recursos"
            title="BIBLIOTECA"
            allowTypes={['folder', 'link', 'pdf']}
        />
      </div>
      <div className="md:col-span-3 h-full">
        {/* O Cliente da Biblioteca mostra o conteúdo do item selecionado */}
        <BibliotecaClient resource={selectedResource} />
      </div>
    </div>
  );
}
