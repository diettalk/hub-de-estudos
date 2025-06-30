'use client';
import { Progress } from "./ui/progress";
import { type SessaoEstudo } from '@/lib/types';

export function ProgressoCicloCard({ sessoes }: { sessoes: SessaoEstudo[] }) {
  const sessoesConcluidas = sessoes.filter(s => s.concluido).length;
  const totalSessoes = sessoes.length;
  const progresso = totalSessoes > 0 ? (sessoesConcluidas / totalSessoes) * 100 : 0;
  
  return (
    <div className="card bg-gray-800 p-6 rounded-lg">
      <h3 className="font-bold text-lg mb-2">Progresso do Ciclo</h3>
      <Progress value={progresso} className="w-full" />
      <p className="text-right text-sm text-gray-400 mt-2">{sessoesConcluidas} de {totalSessoes} sessões concluídas</p>
    </div>
  );
}