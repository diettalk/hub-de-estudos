'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toggleConclusaoSessao, linkPastaToConcurso } from '@/app/actions';
import { usePlanoAtivo } from '@/lib/plano-ativo';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Folder,
  Layers,
  Clock,
  FileText,
  BookOpen,
  HelpCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginaItem {
  id: number;
  parent_id: number | null;
  title: string;
}

const CATEGORIAS = [
  'Teoria',
  'Questões',
  'Revisão',
  'Lei Seca',
  'Jurisprudência',
  'Simulado',
  'Videoaula',
];

export function RegistroEstudoModal() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { planoAtivo, recarregarPlanos } = usePlanoAtivo();

  const [paginas, setPaginas] = useState<PaginaItem[]>([]);

  const [datePreset, setDatePreset] = useState<'hoje' | 'ontem' | 'outro'>('hoje');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [categoria, setCategoria] = useState('Teoria');
  const [disciplinaId, setDisciplinaId] = useState<string>('');
  const [novaDisciplinaNome, setNovaDisciplinaNome] = useState('');
  const [tempoEstudo, setTempoEstudo] = useState('00:45:00');

  const [topico, setTopico] = useState('');
  const [material, setMaterial] = useState('');

  const [programarRevisoes, setProgramarRevisoes] = useState(true);
  const [contabilizarPlanejamento, setContabilizarPlanejamento] = useState(true);

  const [questoesAcertos, setQuestoesAcertos] = useState<string>('');
  const [questoesErros, setQuestoesErros] = useState<string>('');

  const [paginaInicio, setPaginaInicio] = useState<string>('');
  const [paginaFim, setPaginaFim] = useState<string>('');

  const [videoTitulo, setVideoTitulo] = useState('');
  const [videoInicio, setVideoInicio] = useState('00:00:00');
  const [videoFim, setVideoFim] = useState('00:00:00');

  const [comentarios, setComentarios] = useState('');

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tempoFormatado?: string;
        disciplinaId?: string;
        topico?: string;
      }>;
      if (customEvent.detail?.tempoFormatado) {
        setTempoEstudo(customEvent.detail.tempoFormatado);
      }
      if (customEvent.detail?.disciplinaId) {
        setDisciplinaId(customEvent.detail.disciplinaId);
      }
      if (customEvent.detail?.topico) {
        setTopico(customEvent.detail.topico);
      }
      setOpen(true);
    };

    window.addEventListener('open-registro-estudo', handleOpen);
    return () => window.removeEventListener('open-registro-estudo', handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    async function fetchPaginas() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('paginas')
        .select('id, parent_id, title')
        .eq('user_id', user.id)
        .order('title', { ascending: true });
      if (data) setPaginas(data);
    }
    fetchPaginas();
  }, [open, supabase]);

  // Se houver um Plano Ativo com disciplinas vinculadas, exibe apenas as disciplinas daquele plano (ou todas se o plano ainda estiver vazio)
  const disciplinasRaiz = useMemo(() => {
    const todasRaiz = paginas.filter((p) => p.parent_id === null);
    if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
      return todasRaiz.filter((p) => planoAtivo.disciplinaIds.includes(p.id));
    }
    return todasRaiz;
  }, [paginas, planoAtivo]);

  const topicosDaDisciplina = useMemo(() => {
    if (!disciplinaId || disciplinaId === 'nova') return [];
    const numId = Number(disciplinaId);
    return paginas.filter((p) => p.parent_id === numId);
  }, [paginas, disciplinaId]);

  const getSelectedDateISO = () => {
    const now = new Date();
    if (datePreset === 'hoje') return now.toISOString().split('T')[0];
    if (datePreset === 'ontem') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    return customDate || now.toISOString().split('T')[0];
  };

  const handleOnlyNumbers = (val: string, setter: (v: string) => void) => {
    setter(val.replace(/\D/g, '').slice(0, 5));
  };

  const handleTimeFormat = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 2) setter(digits);
    else if (digits.length <= 4) setter(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    else setter(`${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`);
  };

  const resetForm = () => {
    setCategoria('Teoria');
    setDisciplinaId('');
    setNovaDisciplinaNome('');
    setTempoEstudo('00:45:00');
    setTopico('');
    setMaterial('');
    setQuestoesAcertos('');
    setQuestoesErros('');
    setPaginaInicio('');
    setPaginaFim('');
    setVideoTitulo('');
    setVideoInicio('00:00:00');
    setVideoFim('00:00:00');
    setComentarios('');
  };

  const acertosNum = parseInt(questoesAcertos) || 0;
  const errosNum = parseInt(questoesErros) || 0;
  const totalQuestoesCalc = acertosNum + errosNum;
  const percAcertoCalc = totalQuestoesCalc > 0 ? Math.round((acertosNum / totalQuestoesCalc) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const discObj = paginas.find((p) => String(p.id) === disciplinaId);
    const nomeMateria =
      disciplinaId === 'nova'
        ? novaDisciplinaNome.trim()
        : discObj?.title || '';

    if (!nomeMateria) {
      toast.error('Selecione uma disciplina ou digite o nome de uma nova.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      let finalDisciplinaId: number | null =
        disciplinaId !== 'nova' && disciplinaId ? Number(disciplinaId) : null;

      if (disciplinaId === 'nova' && novaDisciplinaNome.trim()) {
        const { data: createdPage, error: pageErr } = await supabase
          .from('paginas')
          .insert({
            user_id: user.id,
            title: novaDisciplinaNome.trim(),
            parent_id: null,
          })
          .select('id')
          .single();

        if (!pageErr && createdPage) {
          finalDisciplinaId = createdPage.id;
          // Se houver um Plano Ativo, já vincula a nova disciplina a ele automaticamente!
          if (planoAtivo) {
            await linkPastaToConcurso(planoAtivo.id, createdPage.id);
          }
        }
      }

      const dataEstudoISO = getSelectedDateISO();

      const partesFoco: string[] = [];
      if (categoria) partesFoco.push(`[${categoria}]`);
      if (topico.trim()) partesFoco.push(topico.trim());
      if (material.trim()) partesFoco.push(`(${material.trim()})`);
      const focoFinal = partesFoco.join(' ') || 'Estudo Geral';

      // Carimba o ID do Plano Ativo para isolamento absoluto entre planos
      const partesDiario: string[] = [];
      if (planoAtivo) {
        partesDiario.push(`[PLANO:${planoAtivo.id}]`);
      }
      const tempoLimpo = tempoEstudo.trim() || '00:45:00';
      partesDiario.push(`⏱️ ${tempoLimpo}`);

      const pIni = parseInt(paginaInicio) || 0;
      const pFim = parseInt(paginaFim) || 0;
      if (pIni > 0 || pFim > 0) {
        partesDiario.push(`📄 Págs: ${pIni} a ${pFim}`);
      }

      if (videoTitulo.trim()) {
        partesDiario.push(`🎥 Vídeo: ${videoTitulo.trim()} (${videoInicio} - ${videoFim})`);
      }

      if (comentarios.trim()) {
        partesDiario.push(comentarios.trim());
      }

      const diarioFinal = partesDiario.join(' | ');

      const baseDate = new Date(dataEstudoISO + 'T12:00:00Z');
      const r1 = new Date(baseDate);
      r1.setDate(baseDate.getDate() + 1);
      const r7 = new Date(baseDate);
      r7.setDate(baseDate.getDate() + 7);
      const r30 = new Date(baseDate);
      r30.setDate(baseDate.getDate() + 30);

      const r1ISO = r1.toISOString().split('T')[0];
      const r7ISO = r7.toISOString().split('T')[0];
      const r30ISO = r30.toISOString().split('T')[0];

      let targetSessionId: number | null = null;

      if (contabilizarPlanejamento) {
        const { data: pendentes } = await supabase
          .from('ciclo_sessoes')
          .select('id, diario_de_bordo, foco_sugerido')
          .eq('user_id', user.id)
          .eq('concluida', false)
          .eq('materia_nome', nomeMateria)
          .order('ordem', { ascending: true });

        if (pendentes && pendentes.length > 0) {
          // Procura sessão pendente do mesmo plano ativo
          const doMesmoPlano = planoAtivo
            ? pendentes.find(
                (p) =>
                  `${p.diario_de_bordo || ''} ${p.foco_sugerido || ''}`.includes(
                    `[PLANO:${planoAtivo.id}]`
                  ) || !`${p.diario_de_bordo || ''} ${p.foco_sugerido || ''}`.includes('[PLANO:')
              )
            : pendentes[0];

          if (doMesmoPlano) targetSessionId = doMesmoPlano.id;
        }
      }

      if (targetSessionId) {
        await supabase
          .from('ciclo_sessoes')
          .update({
            disciplina_id: finalDisciplinaId,
            materia_nome: nomeMateria,
            foco_sugerido: focoFinal,
            diario_de_bordo: diarioFinal,
            questoes_acertos: acertosNum,
            questoes_total: totalQuestoesCalc,
            concluida: true,
            data_estudo: dataEstudoISO,
            data_revisao_1: programarRevisoes ? r1ISO : null,
            data_revisao_2: programarRevisoes ? r7ISO : null,
            data_revisao_3: programarRevisoes ? r30ISO : null,
          })
          .eq('id', targetSessionId);
      } else {
        const { data: ultimas } = await supabase
          .from('ciclo_sessoes')
          .select('ordem')
          .eq('user_id', user.id)
          .order('ordem', { ascending: false })
          .limit(1);

        const novaOrdem = ultimas && ultimas.length > 0 ? (ultimas[0].ordem || 0) + 1 : 1;

        const { data: inserida, error: insertError } = await supabase
          .from('ciclo_sessoes')
          .insert({
            user_id: user.id,
            ordem: novaOrdem,
            disciplina_id: finalDisciplinaId,
            materia_nome: nomeMateria,
            foco_sugerido: focoFinal,
            diario_de_bordo: diarioFinal,
            questoes_acertos: acertosNum,
            questoes_total: totalQuestoesCalc,
            concluida: true,
            materia_finalizada: false,
            data_estudo: dataEstudoISO,
            data_revisao_1: programarRevisoes ? r1ISO : null,
            data_revisao_2: programarRevisoes ? r7ISO : null,
            data_revisao_3: programarRevisoes ? r30ISO : null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        targetSessionId = inserida?.id || null;
      }

      if (programarRevisoes && targetSessionId) {
        await toggleConclusaoSessao(targetSessionId, true);
      }

      toast.success(
        planoAtivo
          ? `Estudo registrado no plano "${planoAtivo.nome}"!`
          : 'Estudo registrado com sucesso!'
      );
      recarregarPlanos();
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar registro de estudo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-[880px] max-h-[92vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-border/60 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Registro de estudo
              </h2>
              {planoAtivo && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-bold">
                  🎯 {planoAtivo.nome}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Preencha os detalhes para registrar seu tempo e avanço neste plano
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border">
              <div className="px-2.5 text-muted-foreground">
                <Calendar className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setDatePreset('hoje')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  datePreset === 'hoje'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('ontem')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  datePreset === 'ontem'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Ontem
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('outro')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  datePreset === 'outro'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Outro
              </button>
            </div>

            {datePreset === 'outro' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-10 px-3 text-sm bg-background border border-border rounded-xl text-foreground"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Categoria</label>
              <div className="relative flex items-center">
                <Folder className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-secondary/30 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat} className="bg-card text-foreground">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-6 space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Disciplina {planoAtivo ? `(do plano ${planoAtivo.nome})` : ''}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Layers className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                  <select
                    value={disciplinaId}
                    onChange={(e) => {
                      setDisciplinaId(e.target.value);
                      setTopico('');
                    }}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-secondary/30 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" className="bg-card text-muted-foreground">
                      Selecione ou crie uma nova...
                    </option>
                    {disciplinasRaiz.map((d) => (
                      <option key={d.id} value={String(d.id)} className="bg-card text-foreground">
                        {d.title}
                      </option>
                    ))}
                    <option value="nova" className="bg-card text-primary font-bold">
                      + Criar nova disciplina neste plano...
                    </option>
                  </select>
                </div>

                {disciplinaId === 'nova' && (
                  <input
                    type="text"
                    placeholder="Nome da matéria..."
                    value={novaDisciplinaNome}
                    onChange={(e) => setNovaDisciplinaNome(e.target.value)}
                    className="h-11 px-3 flex-1 text-sm rounded-xl bg-background border border-border text-foreground"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Tempo de estudo</label>
              <div className="relative flex items-center">
                <Clock className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={tempoEstudo}
                  onChange={(e) => handleTimeFormat(e.target.value, setTempoEstudo)}
                  placeholder="00:00:00"
                  className="w-full h-11 pl-9 pr-3 text-base font-mono font-bold text-foreground rounded-xl bg-secondary/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Tópico</label>
              <div className="relative flex items-center">
                <FileText className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  list="topicos-sugeridos"
                  value={topico}
                  onChange={(e) => setTopico(e.target.value)}
                  placeholder="Selecione ou crie um novo..."
                  className="w-full h-11 pl-9 pr-3 text-sm rounded-xl bg-secondary/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {topicosDaDisciplina.length > 0 && (
                  <datalist id="topicos-sugeridos">
                    {topicosDaDisciplina.map((t) => (
                      <option key={t.id} value={t.title} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Material <span className="text-muted-foreground font-normal italic">(opcional)</span>
              </label>
              <div className="relative flex items-center">
                <BookOpen className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Ex.: Aula 01"
                  className="w-full h-11 pl-9 pr-3 text-sm rounded-xl bg-secondary/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-foreground">
              <Checkbox
                checked={programarRevisoes}
                onCheckedChange={(v) => setProgramarRevisoes(Boolean(v))}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span>Programar revisões (24h, 7d, 30d)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-foreground">
              <Checkbox
                checked={contabilizarPlanejamento}
                onCheckedChange={(v) => setContabilizarPlanejamento(Boolean(v))}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span>Contabilizar no planejamento</span>
              <span title="Vincula e conclui o bloco no Ciclo de Estudos deste plano">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-emerald-500/40 bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Questões <span className="text-xs font-normal text-muted-foreground italic">(opcional)</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">Acertos / Erros</p>
                  </div>
                  {totalQuestoesCalc > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                      {totalQuestoesCalc} q • {percAcertoCalc}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-400 block mb-1">
                      Acertos
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={questoesAcertos}
                      onChange={(e) => handleOnlyNumbers(e.target.value, setQuestoesAcertos)}
                      placeholder="0"
                      style={{ padding: '0 12px', fontSize: '18px' }}
                      className="h-11 w-full text-center font-extrabold text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-rose-400 block mb-1">
                      Erros
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={questoesErros}
                      onChange={(e) => handleOnlyNumbers(e.target.value, setQuestoesErros)}
                      placeholder="0"
                      style={{ padding: '0 12px', fontSize: '18px' }}
                      className="h-11 w-full text-center font-extrabold text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-500/40 bg-secondary/20 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Páginas <span className="text-xs font-normal text-muted-foreground italic">(opcional)</span>
                  </h4>
                  <p className="text-xs text-muted-foreground">Início / Fim</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Página Inicial
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paginaInicio}
                      onChange={(e) => handleOnlyNumbers(e.target.value, setPaginaInicio)}
                      placeholder="0"
                      style={{ padding: '0 12px', fontSize: '18px' }}
                      className="h-11 w-full text-center font-extrabold text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Página Final
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paginaFim}
                      onChange={(e) => handleOnlyNumbers(e.target.value, setPaginaFim)}
                      placeholder="0"
                      style={{ padding: '0 12px', fontSize: '18px' }}
                      className="h-11 w-full text-center font-extrabold text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-secondary/20 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Videoaulas <span className="text-xs font-normal text-muted-foreground italic">(opcional)</span>
                </h4>
                <p className="text-xs text-muted-foreground">Título / Início / Fim</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Nome da Videoaula
                  </label>
                  <input
                    type="text"
                    value={videoTitulo}
                    onChange={(e) => setVideoTitulo(e.target.value)}
                    placeholder="Ex.: Aula 01 - Direito Constitucional"
                    className="h-11 w-full px-3.5 text-sm font-medium text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1 text-center">
                    Início (HH:MM:SS)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={videoInicio}
                    onChange={(e) => handleTimeFormat(e.target.value, setVideoInicio)}
                    placeholder="00:00:00"
                    style={{ padding: '0 10px', fontSize: '16px' }}
                    className="h-11 w-full text-center font-mono font-bold text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1 text-center">
                    Fim (HH:MM:SS)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={videoFim}
                    onChange={(e) => handleTimeFormat(e.target.value, setVideoFim)}
                    placeholder="00:00:00"
                    style={{ padding: '0 10px', fontSize: '16px' }}
                    className="h-11 w-full text-center font-mono font-bold text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Comentários <span className="text-muted-foreground font-normal italic">(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Adicione observações sobre o seu estudo..."
              className="w-full rounded-2xl border border-border bg-secondary/30 p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="h-10 px-5 text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 text-xs font-bold gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Registro</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}