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
  // Usamos um estado local para controlar os valores dos inputs
  const [formData, setFormData] = useState({
    concluido: sessao.concluido,
    disciplina_id: sessao.disciplina_id,
    foco: sessao.foco,
    diario_de_bordo: sessao.diario_de_bordo,
    questoes_acertos: sessao.questoes_acertos,
    questoes_total: sessao.questoes_total,
    data_estudo: sessao.data_estudo,
    r1_concluida: sessao.r1_concluida,
    r2_concluida: sessao.r2_concluida,
    r3_concluida: sessao.r3_concluida,
  });

  // Efeito de Auto-Save
  useEffect(() => {
    // Cria um timer para salvar 1.5s depois da última alteração
    const handler = setTimeout(() => {
      const dataToSubmit = new FormData();
      dataToSubmit.append('id', String(sessao.id));
      dataToSubmit.append('data_estudo_atual', sessao.data_estudo || '');

      // Adiciona todos os dados do nosso estado ao formData
      for (const key in formData) {
        // @ts-ignore
        const value = formData[key];
        if (typeof value === 'boolean') {
          dataToSubmit.append(key, value ? 'on' : '');
        } else if (value !== null && value !== undefined) {
          dataToSubmit.append(key, String(value));
        }
      }
      
      startTransition(() => updateSessaoEstudo(dataToSubmit));

    }, 1500);

    // Limpa o timer se o usuário fizer uma nova alteração
    return () => clearTimeout(handler);
  }, [formData, sessao]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const percAcerto = formData.questoes_total ? Math.round(((formData.questoes_acertos || 0) / formData.questoes_total) * 100) : 0;

  return (
    <tr className={`border-b border-gray-700 ${isPending ? 'opacity-50' : ''}`}>
      <td className="p-3 text-center align-middle">
        <Checkbox
          checked={formData.concluido}
          onCheckedChange={(checked) => handleChange('concluido', !!checked)}
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
        <div className="flex items-center gap-1 justify-center">
          <Input type="number" value={formData.questoes_acertos || ''} onChange={(e) => handleChange('questoes_acertos', e.target.value)} className="bg-gray-700 w-16" placeholder="C" />
          <span className="text-gray-400">/</span>
          <Input type="number" value={formData.questoes_total || ''} onChange={(e) => handleChange('questoes_total', e.target.value)} className="bg-gray-700 w-16" placeholder="T" />
        </div>
        {formData.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
      </td>
      <td className="p-3 align-middle"><Input type="date" value={formData.data_estudo || ''} onChange={(e) => handleChange('data_estudo', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-3 text-center align-middle"><Checkbox checked={formData.r1_concluida} onCheckedChange={(c) => handleChange('r1_concluida', !!c)} /></td>
      <td className="p-3 text-center align-middle"><Checkbox checked={formData.r2_concluida} onCheckedChange={(c) => handleChange('r2_concluida', !!c)} /></td>
      <td className="p-3 text-center align-middle"><Checkbox checked={formData.r3_concluida} onCheckedChange={(c) => handleChange('r3_concluida', !!c)} /></td>
      <td className="p-3 text-center align-middle">
        <form action={deleteSessaoCiclo}>
          <input type="hidden" name="id" value={sessao.id} />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" title="Excluir Linha">
            <Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-500" />
          </Button>
        </form>
      </td>
    </tr>
  );
}