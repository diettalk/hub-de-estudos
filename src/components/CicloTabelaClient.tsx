'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { addSessaoCiclo, deleteSessoesEmMassa } from '@/app/actions';
import { type SessaoEstudo, type Node as DisciplinaNode } from '@/lib/types';
import { CicloTableRow } from '@/components/CicloTableRow';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

interface CicloTabelaClientProps {
  sessoesIniciais: SessaoEstudo[];
  disciplinaTree: DisciplinaNode[];
}

export function CicloTabelaClient({
  sessoesIniciais,
  disciplinaTree,
}: CicloTabelaClientProps) {
  // Estado para controlar as sessoes (necessário para re-renderização)
  const [sessoes, setSessoes] = useState(sessoesIniciais);
  // Estado para os IDs das linhas selecionadas
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  // Atualiza as sessoes se a prop inicial mudar
  React.useEffect(() => {
    setSessoes(sessoesIniciais);
  }, [sessoesIniciais]);

  // Adiciona ou remove um ID da lista de selecionados
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Seleciona ou deseleciona todas as linhas visíveis
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sessoes.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Chama a nova Server Action para exclusão em massa
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.info('Nenhuma sessão selecionada para excluir.');
      return;
    }

    if (
      window.confirm(
        `Tem certeza de que deseja excluir ${selectedIds.length} sessões?`
      )
    ) {
      startTransition(async () => {
        const result = await deleteSessoesEmMassa(selectedIds);
        if (result?.error) {
          toast.error(`Falha ao excluir: ${result.error}`);
        } else {
          // Remove as sessoes excluídas do estado local para UI imediata
          setSessoes((prev) =>
            prev.filter((s) => !selectedIds.includes(s.id))
          );
          setSelectedIds([]); // Limpa a seleção
          toast.success(`${selectedIds.length} sessões foram excluídas.`);
        }
      });
    }
  };

  const isAllSelected =
    sessoes.length > 0 && selectedIds.length === sessoes.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < sessoes.length;

  return (
    <div className="bg-card border rounded-lg shadow-lg overflow-hidden mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
            <tr>
              {/* Coluna do Checkbox "Selecionar Tudo" */}
              <th className="p-3 w-12 text-center">
                <Checkbox
                  checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
                  onCheckedChange={handleToggleSelectAll}
                  aria-label="Selecionar todas as linhas"
                  disabled={isPending}
                />
              </th>
              <th className="p-3">OK</th>
              <th className="p-3">Finalizada</th>
              <th className="p-3">Hora</th>
              <th className="p-3">Matéria</th>
              <th className="p-3 min-w-[350px]">Foco Sugerido</th>
              <th className="p-3 min-w-[250px]">Diário de Bordo</th>
              <th className="p-3 min-w-[200px]">Questões</th>
              <th className="p-3 min-w-[150px]">Data Estudo</th>
              <th className="text-center p-3">R1 (24h)</th>
              <th className="text-center p-3">R7 (7d)</th>
              <th className="text-center p-3">R30 (30d)</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessoes.map((sessao) => (
              <CicloTableRow
                key={sessao.id}
                sessao={sessao as SessaoEstudo}
                disciplinaTree={disciplinaTree}
                // Novas props para seleção
                isSelected={selectedIds.includes(sessao.id)}
                onToggleSelect={() => handleToggleSelect(sessao.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-between items-center border-t border-border">
        {/* Botão de Excluir em Massa */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={isPending || selectedIds.length === 0}
          className="ml-2"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir Selecionadas ({selectedIds.length})
        </Button>
        
        {/* Botão de Adicionar Linha */}
        <form action={addSessaoCiclo}>
          <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
            + Adicionar Linha ao Ciclo
          </Button>
        </form>
      </div>
    </div>
  );
}
