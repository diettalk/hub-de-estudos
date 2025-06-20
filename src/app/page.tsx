// src/app/page.tsx
import { ConcursoCard } from '@/components/ConcursoCard';
import { PrioridadesCard } from '@/components/PrioridadesCard';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna da Esquerda (Informações Gerais) */}
        <div className="lg:col-span-1 space-y-6">
          <ConcursoCard />
          <PrioridadesCard />
        </div>

        {/* Coluna da Direita (Foco e Progresso) */}
        <div className="lg:col-span-2 space-y-6">
          <ProgressoCicloCard />
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white h-64">
            Área de Foco (Pomodoro)
          </div>
        </div>

      </div>
    </div>
  );
}