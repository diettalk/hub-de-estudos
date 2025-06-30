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
  
  const percAcerto = sessao.questoes_total && sessao.questoes_acertos ? Math.round((sessao.questoes_acertos / sessao.questoes_total) * 100) : 0;

  // O formulário agora envolve a linha inteira para submeter todas as alterações de uma vez
  return (
    <tr className={`border-b border-gray-700 ${sessao.materia_finalizada ? 'bg-gray-800/50 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`} >
        <form action={(formData) => startTransition(() => updateSessaoEstudo(formData))}>
            {/* Truque para o form se comportar como uma linha de tabela */}
            <td style={{display: 'contents'}}>
                <input type="hidden" name="id" value={sessao.id} />
                
                <td className="p-3 text-center align-middle"><Checkbox name="materia_finalizada" defaultChecked={sessao.materia_finalizada} /></td>
                <td className="p-3 text-center align-middle">{sessao.hora_no_ciclo}</td>
                <td className="p-3 align-middle">
                    <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
                        <SelectTrigger className="bg-gray-700 w-[150px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
                    </Select>
                </td>
                <td className="p-3 align-middle"><Input name="foco" defaultValue={sessao.foco || ''} className="bg-gray-700" /></td>
                <td className="p-3 align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} className="bg-gray-700 h-10" /></td>
                <td className="p-3 align-middle text-center">
                    <div className="flex items-center gap-1 justify-center">
                        <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
                        <span className="text-gray-400">/</span>
                        <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
                    </div>
                    {sessao.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
                </td>
                <td className="p-3 align-middle">{dataFinalizada}</td>
                <td className="p-3 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
                <td className="p-3 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
                <td className="p-3 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
                <td className="p-3 align-middle text-center">
                  <div className="flex items-center justify-center gap-1">
                      <Button type="submit" variant="ghost" size="icon" title="Salvar Alterações Manuais" disabled={isPending}><Save className="h-4 w-4 text-blue-400" /></Button>
                      
                      {/* O botão de Concluir Sessão tem seu próprio formulário para chamar a action correta */}
                      <form action={concluirSessaoEstudo}>
                        <input type="hidden" name="id" value={sessao.id} />
                        <Button type="submit" variant="ghost" size="icon" title="Concluir Sessão (OK e Gerar Revisões)" disabled={isPending || sessao.concluido}><CheckCircle2 className="h-4 w-4 text-green-400" /></Button>
                      </form>
                      
                      <form action={deleteSessaoCiclo}>
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