// src/components/CicloTableRow.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { toggleConclusaoSessao, updateDatasSessaoEstudo, updateSessaoEstudo, deleteSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo } from '@/lib/types';
import { useDebounce } from '@/lib/hooks';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function CicloTableRow({ sessao }: { sessao: SessaoEstudo }) {
  const [isPending, startTransition] = useTransition();

  const [materiaNome, setMateriaNome] = useState(sessao.materia_nome || '');
  const [focoSugerido, setFocoSugerido] = useState(sessao.foco_sugerido || '');
  
  const debouncedMateria = useDebounce(materiaNome, 1000);
  const debouncedFoco = useDebounce(focoSugerido, 1000);

  useEffect(() => {
    if (debouncedMateria !== sessao.materia_nome) {
      updateSessaoEstudo({ id: sessao.id, materia_nome: debouncedMateria });
    }
  }, [debouncedMateria, sessao.id, sessao.materia_nome]);

  useEffect(() => {
    if (debouncedFoco !== sessao.foco_sugerido) {
      updateSessaoEstudo({ id: sessao.id, foco_sugerido: debouncedFoco });
    }
  }, [debouncedFoco, sessao.id, sessao.foco_sugerido]);

  const handleToggleConclusao = (isCompleting: boolean) => {
    startTransition(async () => {
      const result = await toggleConclusaoSessao(sessao.id, isCompleting);
      if (result?.error) toast.error(result.error);
      else toast.success(isCompleting ? 'Estudo concluído! Revisões agendadas.' : 'Estudo revertido.');
    });
  };

  const handleDateChange = (
      campo: 'data_estudo' | 'data_revisao_1' | 'data_revisao_2' | 'data_revisao_3', 
      novaData: string
    ) => {
    startTransition(async () => {
        const result = await updateDatasSessaoEstudo(sessao.id, campo, novaData);
        if (result?.error) toast.error(result.error);
        else toast.success("Data atualizada com sucesso!");
    });
  };
  
  const handleDelete = () => {
    if(window.confirm(`Tem certeza que deseja deletar a sessão ${sessao.ordem}?`)) {
        startTransition(async () => {
            await deleteSessaoCiclo(sessao.id);
            toast.success("Sessão deletada.");
        });
    }
  }

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return (
    <tr className="border-b border-border hover:bg-secondary/50">
      <td className="p-3 text-center"><Checkbox checked={sessao.concluida} onCheckedChange={handleToggleConclusao} disabled={isPending} /></td>
      <td className="p-3 font-mono">{sessao.ordem.toString().padStart(2, '0')}</td>
      <td className="p-3"><Input value={materiaNome} onChange={(e) => setMateriaNome(e.target.value)} className="bg-input h-8" /></td>
      <td className="p-3"><Input value={focoSugerido} onChange={(e) => setFocoSugerido(e.target.value)} className="bg-input h-8" /></td>
      <td className="p-3"><Input placeholder="Suas anotações..." className="bg-input h-8" /></td>
      <td className="p-3"><Input placeholder="0/0" className="bg-input h-8 w-24" /></td>
      <td className="p-3"><Input type="date" defaultValue={formatDateForInput(sessao.data_estudo)} onChange={(e) => handleDateChange('data_estudo', e.target.value)} className="bg-input h-8" /></td>
      
      {/* CORREÇÃO: Datas de revisão agora são inputs editáveis */}
      <td className="p-3"><Input type="date" defaultValue={formatDateForInput(sessao.data_revisao_1)} onChange={(e) => handleDateChange('data_revisao_1', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-3"><Input type="date" defaultValue={formatDateForInput(sessao.data_revisao_2)} onChange={(e) => handleDateChange('data_revisao_2', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-3"><Input type="date" defaultValue={formatDateForInput(sessao.data_revisao_3)} onChange={(e) => handleDateChange('data_revisao_3', e.target.value)} className="bg-input h-8" /></td>

      <td className="p-3 text-center"><Checkbox checked={sessao.materia_finalizada} /></td>
      <td className="p-3 text-center"><Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
    </tr>
  );
}
