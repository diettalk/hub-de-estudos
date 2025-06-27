// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { updateSessaoEstudo, addSessaoCiclo, deleteSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTableRow } from '@/components/CicloTableRow';

export default function CicloPage() {
  const [sessoes, setSessoes] = useState<SessaoEstudo[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, startAddingTransition] = useTransition();
  const supabase = createClientComponentClient();
  const getCicloData = async () => {
    const sessoesPromise = supabase.from('sessoes_estudo').select(`*, disciplinas (id, nome, emoji)`).order('hora_no_ciclo');
    const disciplinasPromise = supabase.from('disciplinas').select('*').order('nome');
    const [{ data: sessoesData }, { data: disciplinasData }] = await Promise.all([sessoesPromise, disciplinasPromise]);
    setSessoes(sessoesData as SessaoEstudo[] || []);
    setDisciplinas(disciplinasData || []);
    setLoading(false);
  };

  useEffect(() => {
    getCicloData();
    const channel = supabase.channel('realtime-ciclo-page').on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes_estudo' }, getCicloData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  if (loading) return <div>Carregando...</div>;
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
      <ProgressoCicloCard sessoes={sessoes} />    
      <details className="card p-6 bg-gray-800/50">
        <summary className="font-semibold text-lg cursor-pointer">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</summary>
        <div className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
          <h4 className="font-bold text-white">Tutorial de Evolução do Ciclo</h4>
          <div>
            <h5 className="font-semibold text-white">Análise de Tempo (Referência: 26/06/2025)</h5>
            <p>Prova: 05 de Outubro de 2025.<br/>Semanas Disponíveis: ~15 semanas.<br/>Total de Horas Líquidas: 15 semanas x 37.5h = ~560 horas de estudo. É tempo mais do que suficiente. Confie no processo.</p>
          </div>
          <div>
            <h5 className="font-semibold text-white">As 3 Fases do Estudo:</h5>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>FASE 1: A Fundação (18 de Junho a 22 de Julho - 5 semanas)</strong><br/>Objetivo: Dominar os fundamentos das matérias de maior peso para os seus cargos alvo (HFA, MGI, INSS), que são Gestão, Políticas Públicas, Português, RLM e o básico de Saúde/Social.</li>
              <li><strong>FASE 2: A Expansão e Inclusão (23 de Julho a 31 de Agosto - ~6 semanas)</strong><br/>Objetivo: Introduzir gradualmente as matérias restantes do nosso "Guia de Estudos Estratégico".</li>
              <li><strong>FASE 3: Refinamento e Ataque Final (01 de Setembro até a Prova - ~5 semanas)</strong><br/>Objetivo: Parar de aprender conteúdo novo e focar em lapidar o conhecimento, ganhar velocidade e dominar a banca FGV.</li>
            </ol>
          </div>
        </div>
      </details>
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base para os cargos de Especialista (HFA), Analista (MGI) e Analista (INSS).</p>
        <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                  <th className="p-3">OK</th>
                  <th className="p-3">Finalizada</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th>
                  <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                  <th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Data Estudo</th>
                  <th className="text-center p-3">R1 (24h)</th>
                  <th className="text-center p-3">R7 (7d)</th>
                  <th className="text-center p-3">R30 (30d)</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-gray-700">
            <Button onClick={() => startAddingTransition(() => addSessaoCiclo())} variant="ghost" size="sm" disabled={isAdding}>
              {isAdding ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <li><strong>LP:</strong> Língua Portuguesa (Foco FGV)</li>
            <li><strong>RLM:</strong> Raciocínio Lógico-Quantitativo</li>
            <li><strong>G.GOV:</strong> Eixo 1 - Gestão Governamental e Governança Pública</li>
            <li><strong>P.PUB:</strong> Eixo 2 - Políticas Públicas</li>
            <li><strong>SAÚDE/SOCIAL:</strong> Eixo 3 - Saúde e Desenvolvimento Social</li>
            <li><strong>DH:</strong> Eixo 4 - Direitos Humanos</li>
            <li><strong>PESQUISA:</strong> Eixo 5 - Pesquisa e Avaliação</li>
            <li><strong>ADM.PÚB:</strong> Conhecimentos Gerais - Administração Pública e Finanças</li>
        </ul>
      </div>
      <details className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
        <summary className="font-semibold">Comando para Evolução do Ciclo (Para uso futuro)</summary>
        <pre className="mt-4 bg-gray-900 p-4 rounded-md text-xs whitespace-pre-wrap">{comandoEvolucao}</pre>
      </details>
    </div>
  );
}