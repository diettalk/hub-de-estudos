// src/app/ciclo/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo, addSessaoCiclo } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTableRow } from '@/components/CicloTableRow'; // Importamos a linha da tabela
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

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos. Quero evoluir para a **Fase [PREENCHA: 2 para Expansão ou 3 para Ataque Final]**.

Abaixo estão os dados do meu desempenho para você analisar e criar o novo ciclo:

**1. DIÁRIO DE BORDO (RESUMO):**
* **Matérias com 100% dos tópicos da Fase 1 estudados:** [Liste aqui as matérias que você finalizou os tópicos previstos na Fase 1. Ex: LP, RLM, G.GOV.]
* **Matérias com estudo em andamento:** [Liste as matérias e em qual tópico você está. Ex: P.PUB - estou em 50% de Modelos de Análise.]

**2. DADOS DA REVISÃO FAROL (ANKI OU MANUAL):**
* **TOP 3 Matérias com mais cartões 🔴 VERMELHOS (maiores dificuldades):**
    1.  [Nome da Matéria 1]
    2.  [Nome da Matéria 2]
    3.  [Nome da Matéria 3]
* **TOP 3 Matérias com mais cartões 🟢 VERDES (maiores facilidades):**
    1.  [Nome da Matéria 1]
    2.  [Nome da Matéria 2]
    3.  [Nome da Matéria 3]

**3. PERCEPÇÃO PESSOAL:**
* **Matéria que me sinto MAIS CONFIANTE:** [Sua resposta]
* **Matéria que sinto MAIS DIFICULDADE:** [Sua resposta]
* **Observações adicionais:** [Qualquer outra informação que julgue relevante]

Com base nestes dados, por favor, gere o **"Ciclo de Estudos - Fase [2 ou 3]"**, introduzindo as novas matérias do nosso Guia Estratégico e ajustando a frequência das matérias da Fase 1`;

 return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
      <ProgressoCicloCard sessoes={sessoes || []} />
      {/* ... Seus textos de apoio (Accordion, etc.) ... */}
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base...</p>
        <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                  <th className="p-3">OK</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th>
                  <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                  <th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Data Estudo</th>
                  <th className="text-center p-3">R1 (24h)</th>
                  <th className="text-center p-3">R7 (7d)</th>
                  <th className="text-center p-3">R30 (30d)</th>
                  <th className="p-3">Finalizada</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(sessoes || []).map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao as SessaoEstudo} disciplinas={disciplinas as Disciplina[] || []} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-gray-700">
            <form action={addSessaoCiclo}>
              <Button type="submit" variant="ghost" size="sm">+ Adicionar Linha ao Ciclo</Button>
            </form>
          </div>
        </div>
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
