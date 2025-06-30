// src/app/ciclo/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo, addSessaoCiclo } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTable } from '@/components/CicloTable'; // Importamos a Tabela
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type SessaoEstudo, type Disciplina } from '@/lib/types';

// Forçamos a página a ser sempre dinâmica, buscando os dados mais recentes.
export const dynamic = 'force-dynamic';

// A página agora é um Server Component (assíncrona)
export default async function CicloPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // --- LÓGICA DE CRIAÇÃO AUTOMÁTICA ---
  // 1. Tenta buscar as sessões existentes.
  let { data: sessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');

  // 2. Se não houver nenhuma sessão, chama a ação para criar o ciclo.
  if (!sessoes || sessoes.length === 0) {
    await seedFase1Ciclo();
    // 3. Re-busca os dados após a criação para exibi-los imediatamente.
    const { data: novasSessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');
    sessoes = novasSessoes;
  }

  // Busca as disciplinas (páginas) para passar para a tabela.
  const { data: disciplinas } = await supabase.from('paginas').select('id, nome:title, emoji').order('title');

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos... (seu texto completo aqui)`;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>

      <ProgressoCicloCard sessoes={sessoes || []} />

      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
            <div>
              <h5 className="font-semibold text-white">Análise de Tempo (Referência: 18/06/2025)</h5>
              <p>Prova: 05 de Outubro de 2025.<br/>Semanas Disponíveis: ~15 semanas.<br/>Total de Horas Líquidas: 15 semanas x 37.5h = ~560 horas de estudo. É tempo mais do que suficiente. Confie no processo.</p>
            </div>
            <div>
              <h5 className="font-semibold text-white">As 3 Fases do Estudo:</h5>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>FASE 1: A Fundação</strong></li>
                <li><strong>FASE 2: A Expansão e Inclusão</strong></li>
                <li><strong>FASE 3: Refinamento e Ataque Final</strong></li>
              </ol>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base para os cargos de Especialista (HFA), Analista (MGI) e Analista (INSS).</p>
        
        {/* A Tabela agora é um componente separado que recebe os dados prontos do servidor. */}
        <CicloTable sessoes={sessoes as SessaoEstudo[] || []} disciplinas={disciplinas as Disciplina[] || []} />
      </div>
      
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <li><strong>LP:</strong> Língua Portuguesa</li>
            <li><strong>RLM:</strong> Raciocínio Lógico-Quantitativo</li>
            <li><strong>G.GOV:</strong> Gestão Governamental</li>
            <li><strong>P.PUB:</strong> Políticas Públicas</li>
            <li><strong>SAÚDE/SOCIAL:</strong> Saúde e Dev. Social</li>
            <li><strong>DH:</strong> Direitos Humanos</li>
            <li><strong>PESQUISA:</strong> Pesquisa e Avaliação</li>
            <li><strong>ADM.PÚB:</strong> Adm. Pública e Finanças</li>
        </ul>
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