// src/app/revisoes/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RevisoesClient } from '@/components/RevisoesClient';
import { type Revisao } from '@/lib/types';
import { startOfToday, isBefore, isToday, isWithinInterval, addDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function RevisoesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: revisoes, error } = await supabase
    .from('revisoes')
    .select('*')
    .eq('user_id', user.id)
    .order('data_revisao', { ascending: true });

  if (error) {
    console.error("Erro ao buscar revisões:", error);
    return <p className="p-8">Ocorreu um erro ao carregar as suas revisões.</p>;
  }

  // Lógica de filtragem de datas no servidor
  const hoje = startOfToday();
  const proximos7DiasFim = addDays(hoje, 7);

  const concluidas = revisoes?.filter(r => r.concluida) || [];
  const pendentes = revisoes?.filter(r => !r.concluida) || [];

  const atrasadas = pendentes.filter(r => isBefore(parseISO(r.data_revisao), hoje));
  const paraHoje = pendentes.filter(r => isToday(parseISO(r.data_revisao)));
  const proximos7Dias = pendentes.filter(r => isWithinInterval(parseISO(r.data_revisao), { start: addDays(hoje, 1), end: proximos7DiasFim }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Painel de Controlo de Revisões</h1>
        <p className="text-muted-foreground">A sua visão completa das revisões passadas, presentes e futuras.</p>
      </div>
      
      <RevisoesClient 
        atrasadas={atrasadas}
        paraHoje={paraHoje}
        proximos7Dias={proximos7Dias}
        concluidas={concluidas}
        debug={revisoes || []}
      />
    </div>
  );
}
