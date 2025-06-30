// src/components/CicloTableRow.tsx
'use client';

import { useTransition, useRef } from 'react';
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
  const formRef = useRef<HTMLFormElement>(null);

  // Ação explícita para o botão SALVAR
  const handleSave = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      startTransition(() => updateSessaoEstudo(formData));
    }
  };
  
  const dataFinalizada = sessao.data_estudo ? new Date(sessao.data_estudo + 'T03:00:00').toLocaleDateString('pt-BR') : 'Pendente';
  const percAcerto = sessao.questoes_total && sessao.questoes_acertos ? Math.round((sessao.questoes_acertos / sessao.questoes_total) * 100) : 0;

  return (
    // A linha da tabela é um elemento <tr>, como deve ser.
    <tr className={`border-b border-gray-700 ${sessao.materia_finalizada ? 'bg-gray-800/50 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      {/* O <form> agora está dentro de uma célula, o que é válido, e agrupa os inputs */}
      <td colSpan={11} className="p-0">
        <form ref={formRef}>
          <table className="w-full text-sm text-left table-fixed">
            <tbody>
              <tr className="divide-x divide-gray-700">
                <input type="hidden" name="id" value={sessao.id} />

                <td className="p-2 w-28 text-center align-middle">
                  <Checkbox name="materia_finalizada" defaultChecked={sessao.materia_finalizada} />
                </td>
                <td className="p-2 w-20 text-center align-middle">{sessao.ordem}</td>
                <td className="p-2 w-52 align-middle">
                  <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
                    <SelectTrigger className="bg-gray-700"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
                    <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.emoji} {d.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-2 align-middle"><Input name="foco_sugerido" defaultValue={sessao.foco_sugerido || ''} className="bg-gray-700" /></td>
                <td className="p-2 align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} rows={1} className="bg-gray-700" /></td>
                <td className="p-2 align-middle text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
                    <span className="text-gray-400">/</span>
                    <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
                  </div>
                  {sessao.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
                </td>
                <td className="p-2 w-32 align-middle text-center">{dataFinalizada}</td>
                <td className="p-2 w-40 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-40 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-40 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
                
                {/* A célula de ações agora contém os botões e seus formulários individuais */}
                <td className="p-2 w-36 align-middle text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button type="button" onClick={handleSave} variant="ghost" size="icon" title="Salvar Alterações Manuais" disabled={isPending}>
                      <Save className="h-4 w-4 text-blue-400" />
                    </Button>
                    <form action={(formData) => startTransition(() => concluirSessaoEstudo(formData))}>
                      <input type="hidden" name="id" value={sessao.id} />
                      <Button type="submit" variant="ghost" size="icon" title="Concluir Sessão (OK e Gerar Revisões)" disabled={isPending || sessao.concluida}>
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </Button>
                    </form>
                    <form action={(formData) => startTransition(() => deleteSessaoCiclo(formData))}>
                      <input type="hidden" name="id" value={sessao.id} />
                      <Button type="submit" variant="ghost" size="icon" title="Excluir Linha" disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </td>
    </tr>
  );
}