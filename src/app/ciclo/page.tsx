// src/components/CicloTable.tsx

'use client';

import { useTransition } from 'react';
import { updateSessaoEstudo } from '@/app/actions';
// CORREÇÃO: Todos os caminhos de importação foram ajustados para usar '@/'
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Tipos para os dados
type Disciplina = { id: number; nome: string };
type Sessao = {
  id: number;
  hora_no_ciclo: number;
  foco: string | null;
  diario_de_bordo: string | null;
  questoes_acertos: number | null;
  questoes_total: number | null;
  data_estudo: string | null;
  data_revisao_1: string | null;
  data_revisao_2: string | null;
  data_revisao_3: string | null;
  concluido: boolean;
  materia_finalizada: boolean;
  disciplina_id: number | null;
  disciplina: { nome: string } | null;
  r1_concluida: boolean;
  r2_concluida: boolean;
  r3_concluida: boolean;
};

export function CicloTable({ sessoes, disciplinas }: { sessoes: Sessao[], disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  // Função para submeter o formulário de uma linha específica
  const handleFormChange = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    startTransition(() => {
      updateSessaoEstudo(formData);
    });
  };

  return (
    <table className="min-w-full text-sm text-left">
      <thead className="bg-gray-800">
        <tr>
          <th className="p-3">OK</th>
          <th className="p-3">HORA</th>
          <th className="p-3">MATÉRIA</th>
          <th className="p-3 w-1/4">FOCO SUGERIDO</th>
          <th className="p-3 w-1/4">DIÁRIO DE BORDO</th>
          <th className="p-3 text-center">QUESTÕES</th>
          <th className="p-3">DATA ESTUDO</th>
          <th className="p-3">R1 (24H)</th>
          <th className="p-3">R7 (7D)</th>
          <th className="p-3">R30 (30D)</th>
        </tr>
      </thead>
      <tbody>
        {sessoes.map((sessao) => (
          <tr key={sessao.id} className="border-b border-gray-700">
            {/* O formulário agora envolve a linha toda para capturar qualquer mudança */}
            <form onChange={(e) => handleFormChange(e.currentTarget)}>
              <input type="hidden" name="id" value={sessao.id} />
              {/* Enviamos a data de estudo atual para a action poder comparar */}
              <input type="hidden" name="data_estudo_atual" value={sessao.data_estudo || ''} />
              
              <td className="p-2 text-center align-middle">
                <Checkbox name="concluido" value="true" defaultChecked={sessao.concluido} />
              </td>
              <td className="p-2 text-center align-middle">{sessao.hora_no_ciclo}</td>
              <td className="p-2 align-middle">
                <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
                  <SelectTrigger className="bg-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="p-2 align-middle"><Input name="foco" defaultValue={sessao.foco || ''} className="bg-gray-700" /></td>
              <td className="p-2 align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} className="bg-gray-700 h-10" /></td>
              <td className="p-2 flex items-center gap-1 align-middle">
                <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
                <span className="text-gray-400">/</span>
                <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
              </td>
              <td className="p-2 align-middle"><Input name="data_estudo" type="date" defaultValue={sessao.data_estudo || ''} className="bg-gray-700" /></td>
              <td className="p-2 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
              <td className="p-2 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
              <td className="p-2 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
            </form>
          </tr>
        ))}
      </tbody>
    </table>
  );
}