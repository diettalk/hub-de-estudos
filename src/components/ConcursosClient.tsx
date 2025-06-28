// src/components/ConcursosClient.tsx

'use client';

import { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, Edit, Trash2, FileText } from "lucide-react";
import { deleteConcurso, updateConcursoStatus } from '@/app/actions';
import { ConcursoFormModal } from './ConcursoFormModal';

// O tipo Concurso agora inclui o campo prioridades
type Concurso = {
  id: number;
  nome: string;
  banca: string;
  data_prova: string;
  status: 'ativo' | 'previsto' | 'arquivado';
  edital_url: string | null;
  prioridades: string[] | null; // Adicionado
};

type ConcursosClientProps = {
  ativos: Concurso[];
  previstos: Concurso[];
  arquivados: Concurso[];
};

const ConcursoCard = ({ concurso, onEdit }: { concurso: Concurso, onEdit: () => void }) => {
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => startTransition(() => updateConcursoStatus(concurso.id, 'arquivado'));
  const handleUnarchive = () => startTransition(() => updateConcursoStatus(concurso.id, 'ativo'));
  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o concurso "${concurso.nome}" permanentemente?`)) {
      startTransition(() => deleteConcurso(concurso.id));
    }
  };

  const dataFormatada = new Date(concurso.data_prova + 'T03:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg">{concurso.nome}</h3>
        <p className="text-sm text-gray-400">{concurso.banca}</p>
        <p className="text-sm text-gray-400 mt-1">Data da Prova: {dataFormatada}</p>
        
        {/* EXIBIÇÃO DAS PRIORIDADES ADICIONADA AQUI */}
        {concurso.prioridades && concurso.prioridades.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-bold text-gray-300 mb-1">Prioridades:</h4>
            <ul className="list-disc list-inside space-y-1">
              {concurso.prioridades.map((p, index) => (
                <li key={index} className="text-xs text-gray-400">{p}</li>
              ))}
            </ul>
          </div>
        )}
        
        {concurso.edital_url && (
          <div className="mt-4">
            <a href={concurso.edital_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Ver Edital
              </Button>
            </a>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4 border-t border-gray-700 pt-4">
        <Button variant="ghost" size="icon" disabled={isPending} onClick={onEdit} title="Editar"><Edit className="h-4 w-4" /></Button>
        {concurso.status !== 'arquivado' ? (
          <Button variant="ghost" size="icon" disabled={isPending} onClick={handleArchive} title="Arquivar"><Archive className="h-4 w-4" /></Button>
        ) : (
          <Button variant="ghost" size="icon" disabled={isPending} onClick={handleUnarchive} title="Desarquivar"><ArchiveRestore className="h-4 w-4" /></Button>
        )}
        <Button variant="ghost" size="icon" disabled={isPending} onClick={handleDelete} title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    </div>
  );
};


export function ConcursosClient({ ativos, previstos, arquivados }: ConcursosClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<Concurso | null>(null);

  const handleOpenAddModal = () => {
    setEditingConcurso(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (concurso: Concurso) => {
    setEditingConcurso(concurso);
    setIsModalOpen(true);
  };
  
  const renderGrid = (concursos: Concurso[]) => {
    if (concursos.length === 0) {
      return <p className="text-gray-500 mt-4">Nenhum concurso nesta categoria.</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {concursos.map(concurso => 
          <ConcursoCard key={concurso.id} concurso={concurso} onEdit={() => handleOpenEditModal(concurso)} />
        )}
      </div>
    );
  };
  
  return (
    <>
      <Tabs defaultValue="ativos" className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="ativos">Ativos</TabsTrigger>
            <TabsTrigger value="previstos">Previstos</TabsTrigger>
            <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
          </TabsList>
          <Button onClick={handleOpenAddModal}>+ Adicionar Concurso</Button>
        </div>
        <TabsContent value="ativos">{renderGrid(ativos)}</TabsContent>
        <TabsContent value="previstos">{renderGrid(previstos)}</TabsContent>
        <TabsContent value="arquivados">{renderGrid(arquivados)}</TabsContent>
      </Tabs>
      
      <ConcursoFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        concurso={editingConcurso} 
      />
    </>
  );
}