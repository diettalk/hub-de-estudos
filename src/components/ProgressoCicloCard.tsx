// src/components/ProgressoCicloCard.tsx
'use client';

import { type SessaoEstudo } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

export function ProgressoCicloCard({ sessoes }: { sessoes: SessaoEstudo[] }) {
  const totalSessoes = sessoes.length;
  const sessoesConcluidas = sessoes.filter(s => s.concluida).length;
  const progresso = totalSessoes > 0 ? (sessoesConcluidas / totalSessoes) * 100 : 0;

  return (
    <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4">Progresso do Ciclo</h2>
        <div className="flex-grow flex flex-col justify-center">
            <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">{sessoesConcluidas} de {totalSessoes} sessões</span>
                <span className="text-lg font-bold text-primary">{progresso.toFixed(0)}%</span>
            </div>
            <Progress value={progresso} className="w-full" />
        </div>
    </div>
  );
}
