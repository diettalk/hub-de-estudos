'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteSessoesEmMassa } from '@/app/actions';
import { type PlanoAtivoInfo } from '@/lib/plano-ativo';
import { type SessaoEstudo, type Node as DisciplinaNode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SLICE_COLORS = [
  '#f472b6',
  '#60a5fa',
  '#4ade80',
  '#c084fc',
  '#94a3b8',
  '#fde047',
  '#2dd4bf',
  '#fb923c',
];

const DIAS_SEMANA_NOMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

interface PlanejamentoWizardModalProps {
  open: boolean;
  onClose: () => void;
  disciplinasDoPlano: DisciplinaNode[];
  sessoesCicloAtivo: SessaoEstudo[];
  planoAtivo: PlanoAtivoInfo | null;
  sugerirTopicosAuto: boolean;
  onCreated: (novosBlocos: SessaoEstudo[], idsRemovidos: number[], formato: 'ciclo' | 'quadro') => void;
}

export function PlanejamentoWizardModal({
  open,
  onClose,
  disciplinasDoPlano,
  sessoesCicloAtivo,
  planoAtivo,
  sugerirTopicosAuto,
  onCreated,
}: PlanejamentoWizardModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formato, setFormato] = useState<'ciclo' | 'quadro'>('ciclo');
  const [metodoCalculo, setMetodoCalculo] = useState<'pesos' | 'manual'>('pesos');
  const [selectedDiscIds, setSelectedDiscIds] = useState<number[]>([]);
  const [pesos, setPesos] = useState<Record<number, number>>({});
  const [horasSemana, setHorasSemana] = useState<number>(12);
  const [minutosBloco, setMinutosBloco] = useState<number>(45);
  const [inicio, setInicio] = useState<'hoje' | 'amanha' | 'outro'>('hoje');
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [termino, setTermino] = useState<'continuo' | 'data'>('continuo');
  const [dataTermino, setDataTermino] = useState('');

  useEffect(() => {
    if (open) {
      const ids = disciplinasDoPlano.map((d) => Number(d.id));
      setSelectedDiscIds(ids);
      const pInit: Record<number, number> = {};
      ids.forEach((id) => {
        pInit[id] = 3;
      });
      setPesos(pInit);
      if (planoAtivo?.data_prova) {
        setDataTermino(planoAtivo.data_prova.split('T')[0]);
      }
      setStep(1);
    }
  }, [open, disciplinasDoPlano, planoAtivo]);

  if (!open) return null;

  const obterTopicoSugerido = (disc: DisciplinaNode): string => {
    if (Array.isArray(disc.children) && disc.children.length > 0) {
      return `Aula / Tópico: ${disc.children[0].title}`;
    }
    return '';
  };

  const handleConfirmar = () => {
    if (selectedDiscIds.length === 0) {
      toast.error('Selecione pelo menos uma disciplina na Etapa 2.');
      return;
    }

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const idsAntigosPendentes = sessoesCicloAtivo.filter((s) => !s.concluida).map((s) => s.id);
      if (idsAntigosPendentes.length > 0) {
        await deleteSessoesEmMassa(idsAntigosPendentes);
      }

      const disciplinasEscolhidas = disciplinasDoPlano.filter((d) =>
        selectedDiscIds.includes(Number(d.id))
      );

      const minutosTotaisSemana = horasSemana * 60;
      const somaPesos = disciplinasEscolhidas.reduce(
        (acc, d) => acc + (pesos[Number(d.id)] || 3),
        0
      );

      const novosBlocos: any[] = [];
      let ordemCounter = 1;

      if (metodoCalculo === 'pesos') {
        const filas = disciplinasEscolhidas.map((disc) => {
          const peso = pesos[Number(disc.id)] || 3;
          const minsMateria = Math.max(
            minutosBloco,
            Math.round((peso / Math.max(1, somaPesos)) * minutosTotaisSemana)
          );
          const qtdBlocos = Math.max(1, Math.round(minsMateria / minutosBloco));
          return { disc, restantes: qtdBlocos };
        });

        let aindaTem = true;
        let diaCounter = 0;
        while (aindaTem) {
          aindaTem = false;
          for (const item of filas) {
            if (item.restantes > 0) {
              aindaTem = true;
              item.restantes -= 1;

              const topicoAuto = sugerirTopicosAuto ? obterTopicoSugerido(item.disc) : '';
              const partesDiario: string[] = [];
              if (planoAtivo) partesDiario.push(`[PLANO:${planoAtivo.id}]`);
              partesDiario.push(`[MIN:${minutosBloco}]`);
              if (formato === 'quadro') {
                partesDiario.push(`[DIA:${DIAS_SEMANA_NOMES[diaCounter % 7]}]`);
                diaCounter++;
              }

              novosBlocos.push({
                user_id: user.id,
                ordem: ordemCounter++,
                disciplina_id: Number(item.disc.id),
                materia_nome: item.disc.title,
                foco_sugerido: topicoAuto,
                diario_de_bordo: partesDiario.join(' | '),
                concluida: false,
                materia_finalizada: false,
              });
            }
          }
        }
      } else {
        disciplinasEscolhidas.forEach((disc, idx) => {
          const topicoAuto = sugerirTopicosAuto ? obterTopicoSugerido(disc) : '';
          const partesDiario: string[] = [];
          if (planoAtivo) partesDiario.push(`[PLANO:${planoAtivo.id}]`);
          partesDiario.push(`[MIN:${minutosBloco}]`);
          if (formato === 'quadro') {
            partesDiario.push(`[DIA:${DIAS_SEMANA_NOMES[idx % 7]}]`);
          }

          novosBlocos.push({
            user_id: user.id,
            ordem: ordemCounter++,
            disciplina_id: Number(disc.id),
            materia_nome: disc.title,
            foco_sugerido: topicoAuto,
            diario_de_bordo: partesDiario.join(' | '),
            concluida: false,
            materia_finalizada: false,
          });
        });
      }

      const { data: inseridos, error } = await supabase
        .from('ciclo_sessoes')
        .insert(novosBlocos)
        .select('*');

      if (error) {
        toast.error('Erro ao gerar planejamento.');
      } else if (inseridos) {
        toast.success(`Planejamento criado com ${inseridos.length} blocos!`);
        onCreated(inseridos as SessaoEstudo[], idsAntigosPendentes, formato);
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[1040px] max-h-[92vh] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col md:flex-row text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* COLUNA ESQUERDA: ETAPAS + RESUMO */}
        <div className="w-full md:w-72 bg-secondary/30 border-b md:border-b-0 md:border-r border-border p-6 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">Refazer planejamento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Leva cerca de 2 minutos</p>
            </div>

            <div className="space-y-4">
              {[
                { num: 1, title: 'Formato', sub: 'Ciclo ou quadro semanal' },
                { num: 2, title: 'Disciplinas & Pesos', sub: 'O que entra no plano' },
                { num: 3, title: 'Rotina', sub: 'Horas e blocos' },
                { num: 4, title: 'Período', sub: 'Início e término' },
              ].map((st) => {
                const isDone = step > st.num;
                const isCurrent = step === st.num;
                return (
                  <div
                    key={st.num}
                    onClick={() => setStep(st.num as any)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all',
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isCurrent
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : st.num}
                    </div>
                    <div>
                      <span
                        className={cn(
                          'text-xs font-bold block',
                          isCurrent || isDone ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {st.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">{st.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-2 text-xs mt-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Seu Planejamento
            </span>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formato</span>
              <strong className="text-foreground">
                {formato === 'ciclo' ? 'Ciclo de estudos' : 'Quadro semanal'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distribuição</span>
              <strong className="text-foreground">
                {metodoCalculo === 'pesos' ? 'Cálculo por Pesos' : 'Manual'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disciplinas</span>
              <strong className="text-foreground">{selectedDiscIds.length}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Por semana</span>
              <strong className="text-foreground">{horasSemana}h</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Período</span>
              <strong className="text-foreground">
                {termino === 'continuo' ? 'Contínuo' : 'Até a prova'}
              </strong>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CONTEÚDO DAS 4 ETAPAS */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold text-emerald-500">Etapa {step} de 4</span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                  {step === 1 && 'Como você prefere organizar seus estudos?'}
                  {step === 2 && 'Quais disciplinas entram no planejamento?'}
                  {step === 3 && 'Qual será sua carga horária e duração dos blocos?'}
                  {step === 4 && 'Quando começa e até quando vai?'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormato('ciclo')}
                    className={cn(
                      'p-5 rounded-2xl border cursor-pointer transition-all space-y-3',
                      formato === 'ciclo'
                        ? 'border-emerald-500 bg-emerald-500/[0.06] ring-1 ring-emerald-500/30'
                        : 'border-border hover:bg-secondary/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold">Ciclo de estudos</span>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          formato === 'ciclo'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-muted-foreground'
                        )}
                      >
                        {formato === 'ciclo' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      As disciplinas se revezam numa ordem fixa, sem depender do dia. Rendeu menos hoje? O ciclo continua de onde parou.
                    </p>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Para rotina imprevisível
                    </Badge>
                  </div>

                  <div
                    onClick={() => setFormato('quadro')}
                    className={cn(
                      'p-5 rounded-2xl border cursor-pointer transition-all space-y-3',
                      formato === 'quadro'
                        ? 'border-emerald-500 bg-emerald-500/[0.06] ring-1 ring-emerald-500/30'
                        : 'border-border hover:bg-secondary/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold">Quadro semanal</span>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          formato === 'quadro'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-muted-foreground'
                        )}
                      >
                        {formato === 'quadro' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Cada dia de Segunda a Domingo tem suas disciplinas e sua carga de horas. Você abre o dia e já sabe o que estudar.
                    </p>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Para rotina fixa
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="text-sm font-bold">
                    Como calcular e distribuir as sessões de estudo?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setMetodoCalculo('pesos')}
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all',
                        metodoCalculo === 'pesos'
                          ? 'border-emerald-500 bg-emerald-500/[0.06]'
                          : 'border-border hover:bg-secondary/30'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Calcular por Peso / Importância</span>
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                          Recomendado
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Você define o peso (1 a 5) de cada matéria e o sistema calcula e intercala os blocos automaticamente.
                      </p>
                    </div>

                    <div
                      onClick={() => setMetodoCalculo('manual')}
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all',
                        metodoCalculo === 'manual'
                          ? 'border-emerald-500 bg-emerald-500/[0.06]'
                          : 'border-border hover:bg-secondary/30'
                      )}
                    >
                      <span className="font-bold text-sm block">
                        Prefiro montar do zero (Disciplina por disciplina)
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cria 1 bloco base para cada matéria e você duplica ou ajusta manualmente na sequência.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{selectedDiscIds.length}</strong> de{' '}
                    {disciplinasDoPlano.length} selecionadas
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedDiscIds(disciplinasDoPlano.map((d) => Number(d.id)))
                      }
                      className="h-8 text-xs rounded-xl"
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDiscIds([])}
                      className="h-8 text-xs rounded-xl"
                    >
                      Limpar seleção
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {disciplinasDoPlano.map((disc, idx) => {
                    const idNum = Number(disc.id);
                    const isChecked = selectedDiscIds.includes(idNum);
                    const pesoAtual = pesos[idNum] || 3;

                    return (
                      <div
                        key={disc.id}
                        onClick={() =>
                          setSelectedDiscIds((prev) =>
                            prev.includes(idNum)
                              ? prev.filter((i) => i !== idNum)
                              : [...prev, idNum]
                          )
                        }
                        className={cn(
                          'p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5',
                          isChecked
                            ? 'border-emerald-500 bg-emerald-500/[0.06]'
                            : 'border-border bg-secondary/20 opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                            />
                            <span className="text-xs font-bold text-foreground truncate">
                              {disc.title}
                            </span>
                          </div>
                          <Checkbox
                            checked={isChecked}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                        </div>

                        {isChecked && metodoCalculo === 'pesos' && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]"
                          >
                            <span className="text-muted-foreground font-medium">
                              Peso / Importância:
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    setPesos((prev) => ({ ...prev, [idNum]: p }))
                                  }
                                  className={cn(
                                    'w-6 h-6 rounded-md text-[10px] font-bold transition-all',
                                    pesoAtual === p
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4">
                  <div>
                    <label className="text-sm font-bold block">
                      Quantas horas por semana você quer planejar no ciclo?
                    </label>
                    <p className="text-xs text-muted-foreground">
                      O sistema distribuirá essa carga entre as disciplinas escolhidas.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={2}
                      max={50}
                      value={horasSemana}
                      onChange={(e) => setHorasSemana(parseInt(e.target.value, 10))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-2xl font-extrabold text-emerald-400 w-20 text-right">
                      {horasSemana}h
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
                  <label className="text-sm font-bold block">
                    Duração padrão de cada bloco de estudo:
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[30, 45, 50, 60].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setMinutosBloco(min)}
                        className={cn(
                          'py-3 rounded-xl font-bold text-xs border transition-all',
                          minutosBloco === min
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {min} minutos
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold">Quando você quer começar?</h4>
                  <div className="grid grid-cols-3 gap-3.5">
                    {[
                      { id: 'hoje', title: 'Hoje', sub: 'Começar agora' },
                      { id: 'amanha', title: 'Amanhã', sub: 'Próximo dia' },
                      { id: 'outro', title: 'Outro dia', sub: 'Escolher data' },
                    ].map((op) => (
                      <div
                        key={op.id}
                        onClick={() => setInicio(op.id as any)}
                        className={cn(
                          'p-4 rounded-2xl border cursor-pointer transition-all',
                          inicio === op.id
                            ? 'border-emerald-500 bg-emerald-500/[0.08]'
                            : 'border-border hover:bg-secondary/30'
                        )}
                      >
                        <span className="font-bold text-sm block">{op.title}</span>
                        <span className="text-xs text-muted-foreground">{op.sub}</span>
                      </div>
                    ))}
                  </div>
                  {inicio === 'outro' && (
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="h-10 w-52 text-xs bg-secondary/30 rounded-xl"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold">Até quando vai o planejamento?</h4>
                  <div className="space-y-3">
                    <div
                      onClick={() => setTermino('continuo')}
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3',
                        termino === 'continuo'
                          ? 'border-emerald-500 bg-emerald-500/[0.08]'
                          : 'border-border hover:bg-secondary/30'
                      )}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                        {termino === 'continuo' && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Sem data de término</span>
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                            RECOMENDADO
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          O planejamento segue até você encerrar ou definir uma data.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setTermino('data')}
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all space-y-3',
                        termino === 'data'
                          ? 'border-emerald-500 bg-emerald-500/[0.08]'
                          : 'border-border hover:bg-secondary/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                          {termino === 'data' && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm block">
                            Definir data da prova / meta final
                          </span>
                          <p className="text-xs text-muted-foreground">
                            As revisões serão escalonadas automaticamente até esta data.
                          </p>
                        </div>
                      </div>
                      {termino === 'data' && (
                        <Input
                          type="date"
                          value={dataTermino}
                          onChange={(e) => setDataTermino(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-10 w-56 text-xs bg-background rounded-xl ml-7"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RODAPÉ DO WIZARD */}
          <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
            <span className="text-xs text-muted-foreground">Etapa {step} de 4</span>
            <div className="flex items-center gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep((prev) => (prev - 1) as any)}
                  className="h-10 px-5 text-xs font-bold rounded-xl"
                >
                  Voltar
                </Button>
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => setStep((prev) => (prev + 1) as any)}
                  className="h-10 px-6 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleConfirmar}
                  className="h-10 px-6 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md"
                >
                  {isPending ? 'Criando...' : 'Criar planejamento'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}