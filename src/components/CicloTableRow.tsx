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

  const handleFieldChange = () => {
    // Usamos um pequeno delay (debounce) para não sobrecarregar o servidor
    // a cada tecla digitada.
    const handler = setTimeout(() => {
      if (formRef.current) {
        const formData = new FormData(formRef.current);
        startTransition(() => updateSessaoEstudo(formData));
      }
    }, 1200); // Salva 1.2s após a última alteração

    return () => clearTimeout(handler);
  };

  const percAcerto = sessao.questoes_total ? Math.round(((sessao.questoes_acertos || 0) / sessao.questoes_total) * 100) : 0;

  return (
    <tr className={`border-b border-gray-700 ${isPending ? 'opacity-50 blur-sm' : ''}`}>
      <form ref={formRef} onChange={handleFieldChange}>
        <input type="hidden" name="id" value={sessao.id} />
        <input type="hidden" name="data_estudo_atual" value={sessao.data_estudo || ''} />
        
        <td className="p-3 text-center align-middle"><Checkbox name="concluido" defaultChecked={sessao.concluido} /></td>
        <td className="p-3 text-center align-middle">{sessao.hora_no_ciclo}</td>
        <td className="p-3 align-middle">
          <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
            <SelectTrigger className="bg-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
          </Select>
        </td>
        <td className="p-3 align-middle"><Input name="foco" defaultValue={sessao.foco || ''} className="bg-gray-700" /></td>
        <td className="p-3 align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} className="bg-gray-700 h-10" /></td>
        <td className="p-3 align-middle text-center">
          <div className="flex items-center gap-1">
            <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
            <span className="text-gray-400">/</span>
            <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
          </div>
          {sessao.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
        </td>
        <td className="p-3 align-middle"><Input name="data_estudo" type="date" defaultValue={sessao.data_estudo || ''} className="bg-gray-700" /></td>
        <td className="p-3 text-center align-middle"><Checkbox name="r1_concluida" defaultChecked={sessao.r1_concluida} /></td>
        <td className="p-3 text-center align-middle"><Checkbox name="r2_concluida" defaultChecked={sessao.r2_concluida} /></td>
        <td className="p-3 text-center align-middle"><Checkbox name="r3_concluida" defaultChecked={sessao.r3_concluida} /></td>
      </form>
      {/* BOTÃO DE EXCLUIR REINSERIDO */}
      <td className="p-3 text-center align-middle">
        <form action={deleteSessaoCiclo}>
          <input type="hidden" name="id" value={sessao.id} />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-500" />
          </Button>
        </form>
      </td>
    </tr>
  );
}