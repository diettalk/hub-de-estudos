// src/components/RevisoesClient.tsx (VERSÃO DE DEBUG)

'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateRevisaoStatus } from '@/app/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { type EventoRevisao } from '@/lib/types';

// Adicionamos a nova propriedade opcional 'todasAsRevisoes'
type RevisoesClientProps = {
  atrasadas: EventoRevisao[];
  hoje: EventoRevisao[];
  proximos7Dias: EventoRevisao[];
  todasAsRevisoes?: EventoRevisao[]; // O '?' torna a propriedade opcional
};

const RevisaoCard = ({ revisao }: { revisao: EventoRevisao }) => {
  const [isPending, startTransition] = useTransition();
  const dataFormatada = new Date(revisao.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  const handleToggle = (isChecked: boolean) => {
    startTransition(async () => {
      const result = await updateRevisaoStatus(revisao.id, isChecked);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border-l-4 transition-opacity ${revisao.completed ? 'opacity-40' : 'bg-gray-800'}`} style={{ borderColor: revisao.color }}>
      <Checkbox
        id={`revisao-${revisao.id}`}
        checked={revisao.completed}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="h-5 w-5"
      />
      <div className="flex-grow">
        <label htmlFor={`revisao-${revisao.id}`} className={`font-medium cursor-pointer ${revisao.completed ? 'line-through text-gray-500' : ''}`}>
          {revisao.title}
        </label>
        <p className="text-xs text-gray-400">{dataFormatada}</p>
      </div>
      <Badge style={{ backgroundColor: revisao.color, color: 'white' }}>{revisao.type}</Badge>
    </div>
  );
};

export function RevisoesClient({ atrasadas, hoje, proximos7Dias, todasAsRevisoes }: RevisoesClientProps) {
  const renderColuna = (titulo: string, revisoes: EventoRevisao[], corTitulo: string = 'text-white') => (
    <div className="bg-gray-900/50 p-4 rounded-lg flex-1 min-w-[300px]">
      <h2 className={`text-xl font-bold mb-4 pb-2 border-b border-gray-700 ${corTitulo}`}>
        {titulo} <span className="text-sm font-normal text-gray-400">({revisoes.length})</span>
      </h2>
      <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
        {revisoes.length > 0 ? (
          revisoes.map(revisao => <RevisaoCard key={revisao.id} revisao={revisao} />)
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
      
      {/* A COLUNA DO "SUPER-ESPIÃO" */}
      {/* Ela só aparece se a lista 'todasAsRevisoes' for passada como propriedade */}
      {todasAsRevisoes && renderColuna('DEBUG: Todas as Revisões', todasAsRevisoes, 'text-purple-400')}
    </div>
  );
}