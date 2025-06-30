// src/components/CicloTable.tsx

'use client';

import { useTransition } from 'react';
import { updateSessaoEstudo, deleteSessaoCiclo, addSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Trash2 } from 'lucide-react';

// Este é um sub-componente para cada linha, para manter a lógica organizada
function TableRow({ sessao, disciplinas }: { sessao: SessaoEstudo, disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  // Função que é chamada sempre que qualquer campo no formulário da linha muda
  const handleFormChange = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    startTransition(() => {
      updateSessaoEstudo(formData);
    });
  };

  const percAcerto = sessao.questoes_total ? Math.round(((sessao.questoes_acertos || 0) / sessao.questoes_total) * 100) : 0;

  return (
    <form onChange={(e) => handleFormChange(e.currentTarget)}>
        {/* Usamos 'display: contents' para que o <form> não quebre o layout da tabela */}
        <tr className={`border-b border-gray-700 hover:bg-gray-700/20 ${isPending ? 'opacity-50' : ''}`} style={{ display: 'contents' }}>
            <input type="hidden" name="id" value={sessao.id} />
            <input type="hidden" name="data_estudo_atual" value={sessao.data_estudo || ''} />
            
            <td className="p-2 text-center align-middle"><Checkbox name="concluido" defaultChecked={sessao.concluido} /></td>
            <td className="p-2 text-center align-middle">{sessao.hora_no_ciclo}</td>
            <td className="p-2 align-middle">
                <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
                    <SelectTrigger className="bg-gray-700 w-[150px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
            </td>
            <td className="p-2 align-middle"><Input name="foco" defaultValue={sessao.foco || ''} className="bg-gray-700" /></td>
            <td className="p-2 align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} className="bg-gray-700 h-10" /></td>
            <td className="p-2 align-middle">
                <div className="flex items-center gap-1 justify-center">
                    <Input name="questoes_acertos" type="number" defaultValue={sessao.questoes_acertos || ''} className="bg-gray-700 w-16" placeholder="C" />
                    <span className="text-gray-400">/</span>
                    <Input name="questoes_total" type="number" defaultValue={sessao.questoes_total || ''} className="bg-gray-700 w-16" placeholder="T" />
                    {sessao.questoes_total ? <span className="text-xs ml-2">{percAcerto}%</span> : null}
                </div>
            </td>
            <td className="p-2 align-middle"><Input name="data_estudo" type="date" defaultValue={sessao.data_estudo || ''} className="bg-gray-700" /></td>
            <td className="p-2 text-center align-middle"><Checkbox name="r1_concluida" defaultChecked={sessao.r1_concluida} /></td>
            <td className="p-2 text-center align-middle"><Checkbox name="r2_concluida" defaultChecked={sessao.r2_concluida} /></td>
            <td className="p-2 text-center align-middle"><Checkbox name="r3_concluida" defaultChecked={sessao.r3_concluida} /></td>
            <td className="p-2 text-center align-middle">
                <form action={deleteSessaoCiclo}><input type="hidden" name="id" value={sessao.id} /><Button type="submit" variant="ghost" size="icon" className="h-8 w-8" title="Excluir Linha"><Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-500" /></Button></form>
            </td>
        </tr>
    </form>
  );
}

// Este é o componente principal que monta a tabela inteira
export function CicloTable({ sessoes, disciplinas }: { sessoes: SessaoEstudo[], disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
            <tr>
              {/* REMOVIDAS AS LARGURAS FIXAS PARA UM LAYOUT MAIS FLUIDO */}
              <th className="p-3">OK</th>
              <th className="p-3">Hora</th>
              <th className="p-3">Matéria</th>
              <th className="p-3">Foco Sugerido</th>
              <th className="p-3">Diário de Bordo</th>
              <th className="p-3">Questões</th>
              <th className="p-3">Data Estudo</th>
              <th className="text-center p-3">R1</th>
              <th className="text-center p-3">R7</th>
              <th className="text-center p-3">R30</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sessoes.map((sessao) => <TableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-center border-t border-gray-700">
        <Button onClick={() => startTransition(() => addSessaoCiclo())} variant="ghost" size="sm" disabled={isPending}>
          {isPending ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
        </Button>
      </div>
    </div>
  );
}