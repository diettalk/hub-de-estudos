import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BibliotecaClient } from '@/components/BibliotecaClient'; // Jajapóta ko'ág̃aite
import { type Resource, type Disciplina, type Node } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Omohenda recurso-kuéra yvyraicha
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


export default async function BibliotecaPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Oheka recurso-kuéra usuario mba'éva
  const { data: resources } = await supabase
    .from('resources')
    .select('*, paginas(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Oheka disciplina-kuéra ojehechauka hag̃ua formulario-pe
  const { data: disciplinas } = await supabase
    .from('paginas')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title');

  const resourceTree = buildTree((resources as Resource[]) || []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
        <p className="text-muted-foreground">Ne ñongatuha guasu link, PDF ha tembiapo ñe'ẽnguérape g̃uarã.</p>
      </header>
      <BibliotecaClient 
        resourceTree={resourceTree} 
        disciplinas={(disciplinas as Disciplina[]) || []} 
      />
    </div>
  );
}
