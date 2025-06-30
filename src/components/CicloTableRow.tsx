'use client';
import { useTransition, useRef } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { updateSessaoEstudo, deleteSessaoCiclo, concluirSessao } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Trash2, Save, CheckCircle2 } from 'lucide-react';
export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const handleSave = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      startTransition(() => updateSessaoEstudo(formData));
    }
  };
  return (
    <tr className={`border-b border-gray-700 ${sessao.materia_finalizada ? 'bg-gray-800/50 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      <form ref={formRef}>
        <td style={{ display: 'contents' }}>
          <input type="hidden" name="id" value={sessao.id} />
          <td className="p-2 text-center align-middle"><Checkbox name="materia_finalizada" defaultChecked={sessao.materia_finalizada} /></td>
          <td className="p-2 text-center align-middle">{sessao.ordem}</td>
          <td className="p-2 align-middle text-center">{sessao.materia_nome}</td>
          <td className="p-2 align-middle"><Input name="foco_sugerido" defaultValue={sessao.foco_sugerido || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} rows={1} className="bg-gray-700" /></td>
          <td className="p-2 align-middle text-center">
            {sessao.data_estudo ? new Date(sessao.data_estudo + 'T03:00:00').toLocaleDateString('pt-BR') : 'Pendente'}
          </td>
          <td className="p-2 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
          <td className="p-2 align-middle text-center">
            <div className="flex items-center justify-center gap-1">
              <Button type="button" onClick={handleSave} variant="ghost" size="icon" title="Salvar Alterações Manuais" disabled={isPending}><Save className="h-4 w-4 text-blue-400" /></Button>
              <form action={(formData) => startTransition(() => concluirSessao(formData))}>
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