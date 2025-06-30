// src/components/ProgressoCicloCard.tsx
'use client';
import { Progress } from "@/components/ui/progress";
import { type SessaoEstudo } from '@/lib/types';

export function ProgressoCicloCard({ sessoes }: { sessoes: SessaoEstudo[] }) {
  const sessoesConcluidas = sessoes.filter(s => s.concluida).length;
  const totalSessoes = sessoes.length > 0 ? sessoes.length : 38; // Mostra 38 se ainda não foi criado
  const progresso = totalSessoes > 0 ? Math.round((sessoesConcluidas / totalSessoes) * 100) : 0;
  
  return (
    <div className="card bg-gray-800 p-6 rounded-lg">
      <h3 className="font-bold text-lg mb-2">Progresso do Ciclo</h3>
      <Progress value={progresso} className="w-full [&>div]:bg-blue-500" />
      <p className="text-right text-sm text-gray-400 mt-2">
        {sessoesConcluidas} de {totalSessoes} sessões concluídas
      </p>
    </div>
  );
}