// src/app/ciclo/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo } from '@/app/actions';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTable } from '@/components/CicloTable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
export const dynamic = 'force-dynamic';
export default async function CicloPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  let { data: sessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');
  if (!sessoes || sessoes.length === 0) {
    await seedFase1Ciclo();
    const { data: novasSessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');
    sessoes = novasSessoes;
  }
  const { data: disciplinas } = await supabase.from('paginas').select('id, nome:title, emoji').order('title');
  const comandoEvolucao = `Olá, David! ... (seu texto completo aqui)`;
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
      <ProgressoCicloCard sessoes={sessoes || []} />
      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
             {/* SEUS TEXTOS COMPLETOS AQUI */}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base para os cargos de Especialista (HFA), Analista (MGI) e Analista (INSS).</p>
        <CicloTable sessoes={sessoes as SessaoEstudo[] || []} disciplinas={disciplinas as Disciplina[] || []} />
      </div>
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        {/* SUA LISTA DE LEGENDA AQUI */}
      </div>
      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold">Comando para Evolução do Ciclo (Para uso futuro)</AccordionTrigger>
          <AccordionContent>
            <pre className="mt-4 bg-gray-900 p-4 rounded-md text-xs whitespace-pre-wrap font-mono">{comandoEvolucao}</pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}