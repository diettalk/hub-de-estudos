// src/app/calendario/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CalendarioClient } from '@/components/CalendarioClient';
import { type Lembrete, type Revisao } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarioPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: lembretes } = await supabase.from('lembretes').select('*').eq('user_id', user.id);
  const { data: revisoes } = await supabase.from('revisoes').select('*').eq('user_id', user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Calendário Geral Unificado</h1>
      </div>
      
      <CalendarioClient 
        lembretes={lembretes || []} 
        revisoes={revisoes || []} 
      />
    </div>
  );
}
