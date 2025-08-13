import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BibliotecaClient } from '@/components/BibliotecaClient';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import { type Resource, type Disciplina, type Node } from '@/lib/types';

export const dynamic = 'force-dynamic';

const buildTree = (resources: Resource[]): Node[] => {
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

export default async function BibliotecaPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: resources } = await supabase
    .from('resources')
    .select('*, paginas(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: disciplinas } = await supabase
    .from('paginas')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title');

  const resourceTree = buildTree((resources as Resource[]) || []);
  const selectedId = searchParams.id ? Number(searchParams.id) : null;
  const selectedResource = selectedId ? resources?.find(r => r.id === selectedId) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
      <div className="md:col-span-1 h-full">
        <HierarchicalSidebar 
            tree={resourceTree} 
            table="resources" // Informa a sidebar que estamos a trabalhar com a tabela 'resources'
            title="BIBLIOTECA"
        />
      </div>
      <div className="md:col-span-3 h-full">
        <BibliotecaClient 
          disciplinas={(disciplinas as Disciplina[]) || []} 
          selectedResource={selectedResource as Resource | null}
        />
      </div>
    </div>
  );
}
