'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteSessoesEmMassa } from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  limparTagPlano,
} from '@/lib/plano-ativo';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileCheck2,
  Plus,
  Trophy,
  AlertTriangle,
  Target,
  Clock,
  Calendar,
  Trash2,
  X,
  Check,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SimuladosClientProps {
  sessoesIniciais: SessaoEstudo[];
  disciplinasRaiz: Disciplina[];
}

interface SimuladoAgrupado {
  idGrupo: string;
  titulo: string;
  dataISO: string;
  tempoTexto: string;
  acertosTotal: number;
  questoesTotal: number;
  errosTotal: number;
  perc: number;
  sessaoIds: number[];
  materias: {
    materia: string;
    acertos: number;
    total: number;
    erros: number;
    perc: number;
  }[];
}

export function SimuladosClient({
  sessoesIniciais,
  disciplinasRaiz,
}: SimuladosClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  const [sessoes, setSessoes] = useState<SessaoEstudo[]>(sessoesIniciais);
  const [modalOpen, setModalOpen] = useState(false);

  // Campos do Modal de Novo Simulado
  const [tituloSimulado, setTituloSimulado] = useState('');
  const [dataSimulado, setDataSimulado] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [tempoSimulado, setTempoSimulado] = useState('04:00:00');
  const [notasPorDisciplina, setNotasPorDisciplina] = useState<
    Record<number, { acertos: string; erros: string }>
  >({});

  // Disciplinas que pertencem ao Plano Ativo
  const disciplinasDoPlano = useMemo(() => {
    if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
      return disciplinasRaiz.filter((d) =>
        planoAtivo.disciplinaIds.includes(Number(d.id))
      );
    }
    return disciplinasRaiz;
  }, [disciplinasRaiz, planoAtivo]);

  // Filtra apenas registros que são Simulados ([Simulado] ou [SIMULADO:...]) do Plano Ativo
  const simuladosAgrupados = useMemo(() => {
    const sessoesSimulado = sessoes.filter((s) => {
      if (!s.concluida || !sessaoPertenceAoPlano(s, planoAtivo)) return false;
      const texto = `${s.foco_sugerido || ''} ${s.diario_de_bordo || ''}`;
      return texto.includes('[Simulado]') || texto.includes('[SIMULADO:');
    });

    const mapa: Record<string, SimuladoAgrupado> = {};

    sessoesSimulado.forEach((s) => {
      const diario = s.diario_de_bordo || '';
      const foco = limparTagPlano(s.foco_sugerido);
      const matchSim = diario.match(/\[SIMULADO:([^\]]+)\]/);
      const nomeSim = matchSim
        ? matchSim[1]
        : foco.replace('[Simulado]', '').trim() || 'Simulado Geral';

      const dataStr = s.data_estudo ? s.data_estudo.split('T')[0] : 'Sem Data';
      const chave = `${dataStr}__${nomeSim}`;

      const matchTempo = diario.match(/⏱️\s*(\d{1,2}:\d{2}(?::\d{2})?)/);
      const tempoStr = matchTempo ? matchTempo[1] : '04:00:00';

      const ac = Number(s.questoes_acertos) || 0;
      const tot = Number(s.questoes_total) || 0;
      const err = Math.max(0, tot - ac);

      if (!mapa[chave]) {
        mapa[chave] = {
          idGrupo: chave,
          titulo: nomeSim,
          dataISO: dataStr,
          tempoTexto: tempoStr,
          acertosTotal: 0,
          questoesTotal: 0,
          errosTotal: 0,
          perc: 0,
          sessaoIds: [],
          materias: [],
        };
      }

      mapa[chave].acertosTotal += ac;
      mapa[chave].questoesTotal += tot;
      mapa[chave].errosTotal += err;
      mapa[chave].sessaoIds.push(s.id);
      mapa[chave].materias.push({
        materia: s.materia_nome || 'Geral',
        acertos: ac,
        total: tot,
        erros: err,
        perc: tot > 0 ? Math.round((ac / tot) * 100) : 0,
      });
    });

    return Object.values(mapa)
      .map((sim) => ({
        ...sim,
        perc:
          sim.questoesTotal > 0
            ? Math.round((sim.acertosTotal / sim.questoesTotal) * 100)
            : 0,
      }))
      .sort((a, b) => b.dataISO.localeCompare(a.dataISO));
  }, [sessoes, planoAtivo]);

  // Diagnóstico de matérias onde mais perde pontos nos simulados
  const materiaMaisErros = useMemo(() => {
    const errosPorMateria: Record<string, { erros: number; total: number }> = {};
    simuladosAgrupados.forEach((sim) => {
      sim.materias.forEach((m) => {
        if (!errosPorMateria[m.materia]) {
          errosPorMateria[m.materia] = { erros: 0, total: 0 };
        }
        errosPorMateria[m.materia].erros += m.erros;
        errosPorMateria[m.materia].total += m.total;
      });
    });

    const ordenado = Object.entries(errosPorMateria).sort(
      (a, b) => b[1].erros - a[1].erros
    );
    return ordenado.length > 0 && ordenado[0][1].erros > 0
      ? { nome: ordenado[0][0], erros: ordenado[0][1].erros }
      : null;
  }, [simuladosAgrupados]);

  const handleOpenModal = () => {
    setTituloSimulado(
      `${simuladosAgrupados.length + 1}º Simulado ${planoAtivo ? planoAtivo.nome : ''}`.trim()
    );
    const init: Record<number, { acertos: string; erros: string }> = {};
    disciplinasDoPlano.forEach((d) => {
      init[d.id] = { acertos: '', erros: '' };
    });
    setNotasPorDisciplina(init);
    setModalOpen(true);
  };

  const handleSalvarSimulado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloSimulado.trim()) {
      toast.error('Informe um nome para o simulado.');
      return;
    }

    const linhasPreenchidas = disciplinasDoPlano.filter((d) => {
      const n = notasPorDisciplina[d.id];
      return n && ((parseInt(n.acertos) || 0) > 0 || (parseInt(n.erros) || 0) > 0);
    });

    if (linhasPreenchidas.length === 0) {
      toast.error('Preencha as questões de pelo menos uma disciplina.');
      return;
    }

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ultimas } = await supabase
        .from('ciclo_sessoes')
        .select('ordem')
        .eq('user_id', user.id)
        .order('ordem', { ascending: false })
        .limit(1);

      let ordemCounter =
        ultimas && ultimas.length > 0 ? (ultimas[0].ordem || 0) + 1 : 1;

      const registrosParaInserir = linhasPreenchidas.map((disc, idx) => {
        const ac = Math.max(0, parseInt(notasPorDisciplina[disc.id]?.acertos) || 0);
        const err = Math.max(0, parseInt(notasPorDisciplina[disc.id]?.erros) || 0);
        const tot = ac + err;

        const partesDiario: string[] = [];
        if (planoAtivo) partesDiario.push(`[PLANO:${planoAtivo.id}]`);
        partesDiario.push(`[SIMULADO:${tituloSimulado.trim()}]`);
        // Grava o tempo total na primeira linha do simulado para não multiplicar horas no histórico
        partesDiario.push(`⏱️ ${idx === 0 ? tempoSimulado : '00:01:00'}`);

        return {
          user_id: user.id,
          ordem: ordemCounter++,
          disciplina_id: disc.id,
          materia_nome: disc.title,
          foco_sugerido: `[Simulado] ${tituloSimulado.trim()}`,
          diario_de_bordo: partesDiario.join(' | '),
          questoes_acertos: ac,
          questoes_total: tot,
          concluida: true,
          materia_finalizada: false,
          data_estudo: dataSimulado,
        };
      });

      const { data: inseridos, error } = await supabase
        .from('ciclo_sessoes')
        .insert(registrosParaInserir)
        .select('*');

      if (error) {
        toast.error('Erro ao registrar simulado.');
      } else if (inseridos) {
        setSessoes((prev) => [...(inseridos as SessaoEstudo[]), ...prev]);
        toast.success(`Simulado "${tituloSimulado}" registrado com sucesso!`);
        setModalOpen(false);
        router.refresh();
      }
    });
  };

  const handleExcluirSimulado = (sim: SimuladoAgrupado) => {
    if (!confirm(`Deseja excluir o simulado "${sim.titulo}"?`)) return;
    startTransition(async () => {
      await deleteSessoesEmMassa(sim.sessaoIds);
      setSessoes((prev) => prev.filter((s) => !sim.sessaoIds.includes(s.id)));
      toast.success('Simulado excluído.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO IGUAL AO PRINT 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Simulados
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Teste seus conhecimentos
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenModal}
          className="self-start sm:self-auto h-9 px-4 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Novo simulado</span>
        </Button>
      </div>

      {/* SE AINDA NÃO HÁ SIMULADOS: ESTADO VAZIO IDÊNTICO AO PRINT 3 */}
      {simuladosAgrupados.length === 0 ? (
        <div className="min-h-[520px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Você ainda não registrou nenhum simulado
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Registrar simulados mostra a sua evolução ao longo do tempo e revela em quais disciplinas você perde mais pontos.
            </p>
          </div>
          <Button
            onClick={handleOpenModal}
            className="h-10 px-6 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm"
          >
            Registrar simulado
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3 CARDS DE DIAGNÓSTICO DOS SIMULADOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">
                  Simulados Realizados
                </span>
                <Trophy className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-3xl font-extrabold text-foreground block mt-2">
                {simuladosAgrupados.length}
              </span>
              <span className="text-xs text-muted-foreground">no plano atual</span>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">
                  Média de Aproveitamento
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-3xl font-extrabold text-emerald-400 block mt-2">
                {Math.round(
                  simuladosAgrupados.reduce((acc, s) => acc + s.perc, 0) /
                    simuladosAgrupados.length
                )}
                %
              </span>
              <span className="text-xs text-muted-foreground">de acertos médios</span>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">
                  Onde perde mais pontos
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-lg font-extrabold text-rose-400 block mt-2 truncate">
                {materiaMaisErros ? materiaMaisErros.nome : 'Nenhum erro'}
              </span>
              <span className="text-xs text-muted-foreground">
                {materiaMaisErros
                  ? `${materiaMaisErros.erros} questões erradas em simulados`
                  : '100% de aproveitamento'}
              </span>
            </div>
          </div>

          {/* LISTA DETALHADA DOS SIMULADOS */}
          <div className="space-y-4">
            {simuladosAgrupados.map((sim) => (
              <div
                key={sim.idGrupo}
                className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-extrabold text-foreground">
                        {sim.titulo}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-bold',
                          sim.perc >= 80
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                            : sim.perc >= 60
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                            : 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                        )}
                      >
                        {sim.perc}% de aproveitamento
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {sim.dataISO !== 'Sem Data'
                          ? new Date(sim.dataISO + 'T12:00:00Z').toLocaleDateString('pt-BR')
                          : 'Sem data'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-emerald-500" />
                        {sim.acertosTotal} certas • {sim.errosTotal} erradas ({sim.questoesTotal} total)
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExcluirSimulado(sim)}
                    disabled={isPending}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Excluir simulado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Desempenho por Disciplina neste Simulado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {sim.materias.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-bold text-foreground truncate">{m.materia}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                        <span>
                          <strong className="text-emerald-400">{m.acertos}</strong>/{m.total}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {m.perc}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR NOVO SIMULADO POR DISCIPLINA */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[740px] max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div>
                <h2 className="text-lg font-bold">Registrar Simulado</h2>
                <p className="text-xs text-muted-foreground">
                  Informe seus acertos e erros em cada disciplina do plano
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarSimulado} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-6 space-y-1.5">
                  <label className="font-semibold block">Nome / Identificação do Simulado</label>
                  <Input
                    value={tituloSimulado}
                    onChange={(e) => setTituloSimulado(e.target.value)}
                    placeholder="Ex.: 1º Simulado Pós-Edital"
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="font-semibold block">Data</label>
                  <Input
                    type="date"
                    value={dataSimulado}
                    onChange={(e) => setDataSimulado(e.target.value)}
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="font-semibold block">Duração (HH:MM:SS)</label>
                  <Input
                    value={tempoSimulado}
                    onChange={(e) => setTempoSimulado(e.target.value)}
                    placeholder="04:00:00"
                    className="h-10 text-center font-mono font-bold text-xs bg-secondary/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
                  <span className="col-span-6">Disciplina</span>
                  <span className="col-span-3 text-center text-emerald-400">Acertos</span>
                  <span className="col-span-3 text-center text-rose-400">Erros</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {disciplinasDoPlano.map((disc) => (
                    <div
                      key={disc.id}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-secondary/20 border border-border/50"
                    >
                      <span className="col-span-6 font-bold text-foreground truncate pr-2">
                        {disc.title}
                      </span>
                      <div className="col-span-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={notasPorDisciplina[disc.id]?.acertos || ''}
                          onChange={(e) =>
                            setNotasPorDisciplina((prev) => ({
                              ...prev,
                              [disc.id]: {
                                acertos: e.target.value.replace(/\D/g, ''),
                                erros: prev[disc.id]?.erros || '',
                              },
                            }))
                          }
                          className="h-9 w-full text-center font-bold text-sm bg-background border border-border rounded-lg"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={notasPorDisciplina[disc.id]?.erros || ''}
                          onChange={(e) =>
                            setNotasPorDisciplina((prev) => ({
                              ...prev,
                              [disc.id]: {
                                acertos: prev[disc.id]?.acertos || '',
                                erros: e.target.value.replace(/\D/g, ''),
                              },
                            }))
                          }
                          className="h-9 w-full text-center font-bold text-sm bg-background border border-border rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Simulado</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
