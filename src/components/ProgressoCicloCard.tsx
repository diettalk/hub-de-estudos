'use client';

import { type SessaoEstudo } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProgressoCicloCard({ sessoes }: { sessoes: SessaoEstudo[] }) {
  const totalSessoes = sessoes.length;
  const sessoesConcluidas = sessoes.filter((s) => s.concluida).length;
  const progresso = totalSessoes > 0 ? (sessoesConcluidas / totalSessoes) * 100 : 0;

  // Cálculo de acertos totais em questões no ciclo
  const totalQuestoes = sessoes.reduce((acc, s) => acc + (Number(s.questoes_total) || 0), 0);
  const totalAcertos = sessoes.reduce((acc, s) => acc + (Number(s.questoes_acertos) || 0), 0);
  const percAcertoGlobal = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : null;

  const isCompleted = totalSessoes > 0 && sessoesConcluidas === totalSessoes;

  return (
    <div className="flex flex-col h-full justify-between">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-4 pr-7">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-2 rounded-xl transition-colors',
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-primary/10 text-primary'
            )}
          >
            {isCompleted ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none">Progresso do Ciclo</h2>
            <span className="text-xs text-muted-foreground mt-0.5 inline-block">
              {isCompleted ? 'Ciclo 100% finalizado! Parabéns 🎉' : 'Acompanhamento de blocos de estudo'}
            </span>
          </div>
        </div>
      </div>

      {/* MÉTRICA CENTRAL */}
      <div className="my-2">
        <div className="flex justify-between items-baseline mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              {progresso.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground font-medium">concluído</span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {sessoesConcluidas} de {totalSessoes} sessões
          </span>
        </div>

        <Progress value={progresso} className="h-2.5 w-full bg-secondary" />
      </div>

      {/* FOOTER COM RENDIMENTO GERAL DE QUESTÕES */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
        <span>Rendimento em questões:</span>
        {percAcertoGlobal !== null ? (
          <span
            className={cn(
              'font-bold px-2 py-0.5 rounded-md text-[11px]',
              percAcertoGlobal >= 80
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : percAcertoGlobal >= 60
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            )}
          >
            {percAcertoGlobal}% ({totalAcertos}/{totalQuestoes})
          </span>
        ) : (
          <span className="text-muted-foreground/70">Sem dados</span>
        )}
      </div>
    </div>
  );
}