// src/components/CicloTable.tsx

'use client';

import { useTransition } from 'react';
import { updateSessaoEstudo } from '@/app/actions';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

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

  const handleFormChange = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    startTransition(() => {
      updateSessaoEstudo(formData);
    });
  };

  return (
    <table className="min-w-full text-sm text-left table-fixed">
      <thead className="bg-gray-800">
        <tr>
          <th className="p-3 w-12">OK</th>
          <th className="p-3 w-16">HORA</th>
          <th className="p-3 w-48">MATÉRIA</th>
          <th className="p-3 w-1/4">FOCO SUGERIDO</th>
          <th className="p-3 w-1/4">DIÁRIO DE BORDO</th>
          <th className="p-3 w-40 text-center">QUESTÕES</th>
          <th className="p-3 w-40">DATA ESTUDO</th>
          <th className="p-3 w-40">R1 (24H)</th>
          <th className="p-3 w-40">R7 (7D)</th>
          <th className="p-3 w-40">R30 (30D)</th>
        </tr>
      </thead>
      {/* CORREÇÃO: A tag <tbody> agora envolve os formulários */}
      <tbody style={{ display: 'contents' }}>
        {sessoes.map((sessao) => (
          // CORREÇÃO: A tag <form> agora tem o estilo 'display: contents' para não quebrar a tabela
          <form 
            key={sessao.id} 
            onChange={(e) => handleFormChange(e.currentTarget)} 
            style={{ display: 'contents' }}
          >
            <tr className="border-b border-gray-700">
              <input type="hidden" name="id" value={sessao.id} />
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
            </tr>
          </form>
        ))}
      </tbody>
    </table>
  );
}