// src/components/CicloTableRow.tsx
'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { updateSessaoEstudo, deleteSessaoCiclo } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleFormChange = () => {
    const handler = setTimeout(() => {
      if (formRef.current) {
        const formData = new FormData(formRef.current);
        startTransition(() => updateSessaoEstudo(formData));
      }
    }, 1500);

    return () => clearTimeout(handler);
  };

  const dataFinalizada = sessao.data_estudo 
    ? new Date(sessao.data_estudo + 'T03:00:00').toLocaleDateString('pt-BR') 
    : 'Pendente';

  const percAcerto = sessao.questoes_total && sessao.questoes_acertos ? Math.round((sessao.questoes_acertos / sessao.questoes_total) * 100) : 0;

  return (
    <tr className={`border-b border-gray-700 hover:bg-gray-700/20 ${isPending ? 'opacity-50' : ''}`} >
      {/* Usamos um único formulário por linha, com um truque de CSS para não quebrar o layout da tabela */}
      <td colSpan={12} className="p-0">
        <form ref={formRef} onChange={handleFormChange}>
          <table className="w-full text-sm text-left table-fixed">
            <tbody>
              <tr className="divide-x divide-gray-700">
                <input type="hidden" name="id" value={sessao.id} />
                <input type="hidden" name="data_estudo_atual" value={sessao.data_estudo || ''} />
                
                <td className="p-2 w-12 text-center align-middle"><Checkbox name="concluido" defaultChecked={sessao.concluido} /></td>
                <td className="p-2 w-28 text-center align-middle">{dataFinalizada}</td>
                <td className="p-2 w-16 text-center align-middle">{sessao.hora_no_ciclo}</td>
                <td className="p-2 w-48 align-middle">
                  <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
                    <SelectTrigger className="bg-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-2 w-[25%] align-middle"><Input name="foco" defaultValue={sessao.foco || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-[25%] align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} className="bg-gray-700 h-10" /></td>
                <td className="p-2 w-40 align-middle text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
                    <span className="text-gray-400">/</span>
                    <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
                  </div>
                  {sessao.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
                </td>
                <td className="p-2 w-40 align-middle"><Input name="data_estudo" type="date" defaultValue={sessao.data_estudo || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-40 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-40 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-40 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
                <td className="p-2 w-12 text-center align-middle">
                  <form action={deleteSessaoCiclo}>
                      <input type="hidden" name="id" value={sessao.id} />
                      <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" title="Excluir Linha">
                          <Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-500" />
                      </Button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </td>
    </tr>
  );
}