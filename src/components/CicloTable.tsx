// src/components/CicloTable.tsx
'use client';

import { useTransition } from 'react';
import { addSessaoCiclo, deleteSessaoCiclo, concluirSessaoEstudo, updateSessaoEstudo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Trash2, Save, CheckCircle2 } from 'lucide-react';

// Sub-componente para uma única linha da tabela
function TableRow({ sessao, disciplinas }: { sessao: SessaoEstudo, disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  const dataFinalizada = sessao.data_estudo
    ? new Date(sessao.data_estudo + 'T03:00:00').toLocaleDateString('pt-BR')
    : 'Pendente';

  const percAcerto = sessao.questoes_total && sessao.questoes_acertos
    ? Math.round((sessao.questoes_acertos / sessao.questoes_total) * 100)
    : 0;

  return (
    <tr className={`border-b border-gray-700 ${sessao.materia_finalizada ? 'bg-gray-800/50 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      <form action={(formData) => startTransition(() => updateSessaoEstudo(formData))}>
        <td style={{ display: 'contents' }}>
          <input type="hidden" name="id" value={sessao.id} />
          <td className="p-2 text-center align-middle">
            <Checkbox name="materia_finalizada" defaultChecked={sessao.materia_finalizada} />
          </td>
          <td className="p-2 text-center align-middle">{sessao.ordem}</td>
          <td className="p-2 align-middle">
            <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
              <SelectTrigger className="bg-gray-700 w-[180px]"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
              <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.emoji} {d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </td>
          <td className="p-2 align-middle"><Input name="foco_sugerido" defaultValue={sessao.foco_sugerido || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle"><Textarea name="diario_de_bordo" rows={1} className="bg-gray-700" /></td>
          <td className="p-2 align-middle text-center">
            <div className="flex items-center gap-1 justify-center">
              <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
              <span className="text-gray-400">/</span>
              <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
            </div>
            {sessao.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
          </td>
          <td className="p-2 align-middle text-center">{dataFinalizada}</td>
          <td className="p-2 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle text-center">
            <div className="flex items-center justify-center gap-1">
              <Button type="submit" variant="ghost" size="icon" title="Salvar Alterações Manuais" disabled={isPending}><Save className="h-4 w-4 text-blue-400" /></Button>
              <form action={(formData) => startTransition(() => concluirSessaoEstudo(formData))}>
                <input type="hidden" name="id" value={sessao.id} />
                <Button type="submit" variant="ghost" size="icon" title="Concluir Sessão (OK e Gerar Revisões)" disabled={isPending || sessao.concluida}><CheckCircle2 className="h-4 w-4 text-green-400" /></Button>
              </form>
              <form action={(formData) => startTransition(() => deleteSessaoCiclo(formData))}>
                <input type="hidden" name="id" value={sessao.id} />
                <Button type="submit" variant="ghost" size="icon" title="Excluir Linha" disabled={isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </form>
            </div>
          </td>
        </td>
      </form>
    </tr>
  );
}

// Componente principal que monta a tabela
export function CicloTable({ sessoes, disciplinas }: { sessoes: SessaoEstudo[], disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
            <tr>
              <th className="p-3">Finalizada</th>
              <th className="p-3">Hora</th>
              <th className="p-3">Matéria</th>
              <th className="p-3 min-w-[350px]">Foco Sugerido</th>
              <th className="p-3 min-w-[250px]">Diário de Bordo</th>
              <th className="p-3 min-w-[200px]">Questões</th>
              <th className="p-3 min-w-[150px]">Concluído em</th>
              <th className="text-center p-3">R1 (24h)</th>
              <th className="text-center p-3">R7 (7d)</th>
              <th className="text-center p-3">R30 (30d)</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sessoes.map((sessao) => <TableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-center border-t border-gray-700">
        <form action={() => startTransition(() => addSessaoCiclo())}>
          <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
            {isPending ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
          </Button>
        </form>
      </div>
    </div>
  );
}