// src/components/RevisaoCard.tsx
'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateRevisaoStatus } from '@/app/actions';
import { type Revisao } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

export function RevisaoCard({ revisao }: { revisao: Revisao }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (concluida: boolean) => {
    startTransition(async () => {
      const result = await updateRevisaoStatus(revisao.id, concluida);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Revisão ${concluida ? 'concluída' : 'marcada como pendente'}.`);
      }
    });
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case '24h': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case '7 dias': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case '30 dias': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 flex items-start gap-4 transition-opacity hover:bg-secondary/50">
      <Checkbox
        id={`revisao-${revisao.id}`}
        checked={revisao.concluida}
        onCheckedChange={(checked) => handleToggle(!!checked)}
        disabled={isPending}
        className="mt-1"
      />
      <div className="flex-grow">
        <p className="font-semibold">{revisao.materia_nome}</p>
        <p className="text-sm text-muted-foreground">{revisao.foco_sugerido}</p>
      </div>
      <div className={`text-xs font-bold px-2 py-1 rounded-full border ${getBadgeColor(revisao.tipo_revisao)}`}>
        {revisao.tipo_revisao}
      </div>
    </div>
  );
}
