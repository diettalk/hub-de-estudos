// src/components/CicloTableRow.tsx
'use client';

import { useTransition } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { updateSessaoEstudo, deleteSessaoCiclo, concluirSessaoEstudo } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Trash2, Save, CheckCircle2 } from 'lucide-react';

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  const dataFinalizada = sessao.data_estudo
    ? new Date(sessao.data_estudo + 'T03:00:00').toLocaleDateString('pt-BR')
    : 'Pendente';

  const percAcerto = sessao.questoes_total && sessao.questoes_acertos
    ? Math.round((sessao.questoes_acertos / sessao.questoes_total) * 100)
    : 0;

  return (
    // A linha da tabela é um elemento <tr> simples, como deve ser.
    <tr className={`border-b border-gray-700 ${sessao.materia_finalizada ? 'bg-gray-800/50 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      {/* O formulário agora envolve APENAS a célula de Ações, tornando o HTML válido. */}
      <td className="p-2 text-center align-middle">
        <Checkbox name="materia_finalizada" form={`form-save-${sessao.id}`} defaultChecked={sessao.materia_finalizada} />
      </td>
      <td className="p-2 text-center align-middle">{sessao.ordem}</td>
      <td className="p-2 align-middle">
        <Select name="disciplina_id" form={`form-save-${sessao.id}`} defaultValue={String(sessao.disciplina_id || '')}>
          <SelectTrigger className="bg-gray-700 w-[180px]"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
          <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.emoji} {d.nome}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-2 align-middle"><Input name="foco_sugerido" form={`form-save-${sessao.id}`} defaultValue={sessao.foco_sugerido || ''} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Textarea name="diario_de_bordo" form={`form-save-${sessao.id}`} defaultValue={sessao.diario_de_bordo || ''} rows={1} className="bg-gray-700" /></td>
      <td className="p-2 align-middle text-center">
        <div className="flex items-center gap-1 justify-center">
          <Input name="questoes_acertos" form={`form-save-${sessao.id}`} type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
          <span className="text-gray-400">/</span>
          <Input name="questoes_total" form={`form-save-${sessao.id}`} type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
        </div>
        {sessao.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
      </td>
      <td className="p-2 align-middle text-center">{dataFinalizada}</td>
      <td className="p-2 align-middle"><Input name="data_revisao_1" form={`form-save-${sessao.id}`} type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input name="data_revisao_2" form={`form-save-${sessao.id}`} type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input name="data_revisao_3" form={`form-save-${sessao.id}`} type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
      
      {/* A célula de Ações agora contém os 3 formulários independentes */}
      <td className="p-2 align-middle text-center">
        <div className="flex items-center justify-center gap-1">
          {/* Formulário #1: Salvar */}
          <form id={`form-save-${sessao.id}`} action={(formData) => startTransition(() => updateSessaoEstudo(formData))}>
             <input type="hidden" name="id" value={sessao.id} />
             {/* Este form está invisível, mas é ativado pelo 'form' attribute nos inputs */}
             <Button type="submit" variant="ghost" size="icon" title="Salvar Alterações Manuais" disabled={isPending}>
                <Save className="h-4 w-4 text-blue-400" />
             </Button>
          </form>
          
          {/* Formulário #2: Concluir */}
          <form action={(formData) => startTransition(() => concluirSessaoEstudo(formData))}>
            <input type="hidden" name="id" value={sessao.id} />
            <Button type="submit" variant="ghost" size="icon" title="Concluir Sessão (OK e Gerar Revisões)" disabled={isPending || sessao.concluida}>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </Button>
          </form>
          
          {/* Formulário #3: Excluir */}
          <form action={(formData) => startTransition(() => deleteSessaoCiclo(formData))}>
            <input type="hidden" name="id" value={sessao.id} />
            <Button type="submit" variant="ghost" size="icon" title="Excluir Linha" disabled={isPending}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}