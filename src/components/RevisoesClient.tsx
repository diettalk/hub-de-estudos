// src/components/RevisoesClient.tsx

'use client';

import { useTransition } from 'react';
import { updateRevisaoStatus } from '@/app/actions';
// CORREÇÃO: Caminho de importação ajustado para usar o atalho '@/'
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export type EventoRevisao = {
  id: number;
  title: string;
  type: 'R1' | 'R7' | 'R30';
  completed: boolean;
  color: string;
  data: string;
};

type RevisoesClientProps = {
  atrasadas: EventoRevisao[];
  hoje: EventoRevisao[];
  proximos7Dias: EventoRevisao[];
};

const RevisaoCard = ({ revisao }: { revisao: EventoRevisao }) => {
  const [isPending, startTransition] = useTransition();
  const dataFormatada = new Date(revisao.data + 'T03:00:00').toLocaleDateString('pt-BR');

  const handleToggle = () => {
    startTransition(() => {
      updateRevisaoStatus(revisao.id, revisao.type, !revisao.completed);
    });
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border-l-4 transition-opacity ${revisao.completed ? 'opacity-40' : 'bg-gray-800'}`} style={{ borderColor: revisao.color }}>
      <Checkbox
        id={`revisao-${revisao.id}-${revisao.type}`}
        checked={revisao.completed}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="h-5 w-5"
      />
      <div className="flex-grow">
        <label htmlFor={`revisao-${revisao.id}-${revisao.type}`} className={`font-medium cursor-pointer ${revisao.completed ? 'line-through text-gray-500' : ''}`}>
          {revisao.title}
        </label>
        <p className="text-xs text-gray-400">{dataFormatada}</p>
      </div>
      <Badge style={{ backgroundColor: revisao.color, color: 'white' }}>{revisao.type}</Badge>
    </div>
  );
};

export function RevisoesClient({ atrasadas, hoje, proximos7Dias }: RevisoesClientProps) {
  const renderColuna = (titulo: string, revisoes: EventoRevisao[], corTitulo: string = 'text-white') => (
    <div className="bg-gray-900/50 p-4 rounded-lg flex-1 min-w-[300px]">
      <h2 className={`text-xl font-bold mb-4 pb-2 border-b border-gray-700 ${corTitulo}`}>
        {titulo} <span className="text-sm font-normal text-gray-400">({revisoes.length})</span>
      </h2>
      <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
        {revisoes.length > 0 ? (
          revisoes.map(revisao => <RevisaoCard key={`${revisao.id}-${revisao.type}`} revisao={revisao} />)
        ) : (
          <p className="text-gray-500 text-center pt-8">Nenhuma revisão nesta categoria.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {renderColuna('Atrasadas', atrasadas, 'text-red-400')}
      {renderColuna('Para Hoje', hoje, 'text-blue-400')}
      {renderColuna('Próximos 7 Dias', proximos7Dias, 'text-yellow-400')}
    </div>
  );
}