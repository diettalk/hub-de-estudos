// src/components/ProgressoCicloCard.tsx
'use client';
import { type SessaoEstudo } from "@/lib/types";

export function ProgressoCicloCard({ sessoes }: { sessoes: SessaoEstudo[] }) {
  if (!sessoes || sessoes.length === 0) return null;

  const completedCount = sessoes.filter(s => s.concluido).length;
  const totalCount = sessoes.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="card p-6 bg-gray-800/50">
      <h2 className="text-lg font-semibold mb-2">Progresso do Ciclo</h2>
      <div className="w-full bg-gray-700 rounded-full h-4">
        <div className="bg-blue-600 h-4 rounded-full text-xs font-medium text-blue-100 text-center leading-none" style={{ width: `${percentage}%` }}>
          {percentage > 10 ? `${percentage}%` : ''}
        </div>
      </div>
      <p className="text-xs text-center mt-2 text-gray-400">{completedCount} de {totalCount} sessões concluídas</p>
    </div>
  );
}