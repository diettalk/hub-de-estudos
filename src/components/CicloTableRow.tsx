// src/components/CicloTableRow.tsx

'use client';

import { useState, useEffect, useTransition } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { updateSessaoEstudo } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Partial<SessaoEstudo>>(sessao);

  // Auto-save com debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      // Compara o estado atual com a prop inicial para ver se houve mudança
      if (JSON.stringify(formData) !== JSON.stringify(sessao)) {
        const dataToSubmit = new FormData();
        for (const key in formData) {
          // @ts-ignore
          dataToSubmit.append(key, formData[key]);
        }
        dataToSubmit.append('id', String(sessao.id));
        dataToSubmit.append('data_estudo_atual', sessao.data_estudo || '');

        startTransition(() => updateSessaoEstudo(dataToSubmit));
      }
    }, 1500); // Salva 1.5s após a última alteração

    return () => {
      clearTimeout(handler);
    };
  }, [formData, sessao]);

  const handleChange = (field: keyof SessaoEstudo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const percAcerto = formData.questoes_total ? Math.round(((formData.questoes_acertos || 0) / formData.questoes_total) * 100) : 0;

  return (
    <tr className={`border-b border-gray-700 ${isPending ? 'opacity-50' : ''}`}>
      <td className="p-3 text-center align-middle">
        <Checkbox
          checked={formData.concluido}
          onCheckedChange={(checked) => handleChange('concluido', checked)}
        />
      </td>
      <td className="p-3 text-center align-middle">{sessao.hora_no_ciclo}</td>
      <td className="p-3 align-middle">
        <Select
          value={String(formData.disciplina_id || '')}
          onValueChange={(value) => handleChange('disciplina_id', Number(value))}
        >
          <SelectTrigger className="bg-gray-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-3 align-middle">
        <Input value={formData.foco || ''} onChange={(e) => handleChange('foco', e.target.value)} className="bg-gray-700" />
      </td>
      <td className="p-3 align-middle">
        <Textarea value={formData.diario_de_bordo || ''} onChange={(e) => handleChange('diario_de_bordo', e.target.value)} className="bg-gray-700 h-10" />
      </td>
      <td className="p-3 align-middle text-center">
        <div className="flex items-center gap-1">
          <Input type="number" value={formData.questoes_acertos || ''} onChange={(e) => handleChange('questoes_acertos', e.target.value)} className="bg-gray-700 w-16" placeholder="C" />
          <span className="text-gray-400">/</span>
          <Input type="number" value={formData.questoes_total || ''} onChange={(e) => handleChange('questoes_total', e.target.value)} className="bg-gray-700 w-16" placeholder="T" />
        </div>
        {formData.questoes_total ? <span className="text-xs mt-1">{percAcerto}%</span> : null}
      </td>
      <td className="p-3 align-middle"><Input type="date" value={formData.data_estudo || ''} onChange={(e) => handleChange('data_estudo', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-3 align-middle"><Checkbox checked={formData.r1_concluida} onCheckedChange={(c) => handleChange('r1_concluida', c)} /></td>
      <td className="p-3 align-middle"><Checkbox checked={formData.r2_concluida} onCheckedChange={(c) => handleChange('r2_concluida', c)} /></td>
      <td className="p-3 align-middle"><Checkbox checked={formData.r3_concluida} onCheckedChange={(c) => handleChange('r3_concluida', c)} /></td>
    </tr>
  );
}