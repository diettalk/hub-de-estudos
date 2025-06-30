// src/app/ciclo/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo, addSessaoCiclo, deleteSessaoCiclo, updateSessaoEstudo, concluirSessaoEstudo } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Save, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CicloPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  let { data: sessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');

  if (!sessoes || sessoes.length === 0) {
    await seedFase1Ciclo();
    const { data: novasSessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');
    sessoes = novasSessoes;
  }

  const { data: disciplinas } = await supabase.from('paginas').select('id, nome:title, emoji').order('title');

  const comandoEvolucao = `Olá, David! ... (seu texto completo aqui)`;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
      <ProgressoCicloCard sessoes={sessoes || []} />
      {/* ... Seus textos de apoio (Accordion, etc.) ... */}
      <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
              <tr>
                <th className="p-3">Finalizada</th>
                <th className="p-3">Hora</th>
                <th className="p-3">Matéria</th>
                {/* ... outros headers ... */}
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(sessoes || []).map((sessao) => {
                const dataFinalizada = sessao.data_estudo ? new Date(sessao.data_estudo + 'T03:00:00').toLocaleDateString('pt-BR') : 'Pendente';
                const percAcerto = sessao.questoes_total && sessao.questoes_acertos ? Math.round((sessao.questoes_acertos / sessao.questoes_total) * 100) : 0;
                
                return (
                  <tr key={sessao.id} className={`border-b border-gray-700 ${sessao.materia_finalizada ? 'bg-gray-800/50 text-gray-500 line-through' : ''}`}>
                    <form action={updateSessaoEstudo}>
                      <td style={{ display: 'contents' }}>
                        <input type="hidden" name="id" value={sessao.id} />
                        <td className="p-2 text-center align-middle"><Checkbox name="materia_finalizada" defaultChecked={sessao.materia_finalizada} /></td>
                        <td className="p-2 text-center align-middle">{sessao.ordem}</td>
                        <td className="p-2 align-middle">
                          <Select name="disciplina_id" defaultValue={String(sessao.disciplina_id || '')}>
                            <SelectTrigger className="bg-gray-700 w-[180px]"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
                            <SelectContent>{(disciplinas as Disciplina[] || []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.emoji} {d.nome}</SelectItem>)}</SelectContent>
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
                        <td className="p-2 align-middle text-center">{dataFinalizada}</td>
                        <td className="p-2 align-middle"><Input name="data_revisao_1" type="date" defaultValue={sessao.data_revisao_1 || ''} className="bg-gray-700" /></td>
                        <td className="p-2 align-middle"><Input name="data_revisao_2" type="date" defaultValue={sessao.data_revisao_2 || ''} className="bg-gray-700" /></td>
                        <td className="p-2 align-middle"><Input name="data_revisao_3" type="date" defaultValue={sessao.data_revisao_3 || ''} className="bg-gray-700" /></td>
                        <td className="p-2 align-middle text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button formAction={updateSessaoEstudo} type="submit" variant="ghost" size="icon" title="Salvar Alterações Manuais"><Save className="h-4 w-4 text-blue-400" /></Button>
                            <Button formAction={concluirSessaoEstudo} type="submit" variant="ghost" size="icon" title="Concluir Sessão (OK e Gerar Revisões)" disabled={sessao.concluida}><CheckCircle2 className="h-4 w-4 text-green-400" /></Button>
                            <Button formAction={deleteSessaoCiclo} type="submit" variant="ghost" size="icon" title="Excluir Linha"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </td>
                      </td>
                    </form>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-2 flex justify-center border-t border-gray-700">
          <form action={addSessaoCiclo}>
            <Button type="submit" variant="ghost" size="sm">+ Adicionar Linha ao Ciclo</Button>
          </form>
        </div>
      </div>
       {/* ... Suas outras seções de texto (Legenda, Comando, etc) ... */}
    </div>
  );
}