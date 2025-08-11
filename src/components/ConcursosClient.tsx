'use client';

import { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, Edit, Trash2, FileText, Link as LinkIcon, FolderPlus } from "lucide-react";
import { deleteConcurso, updateConcursoStatus, unlinkPastaFromConcurso } from '@/app/actions';
import { ConcursoFormModal } from './ConcursoFormModal'; // Vamos criar a seguir
import { LinkPastaModal } from './LinkPastaModal'; // Vamos criar a seguir
import Link from 'next/link';
import { type Concurso, type Disciplina } from '@/lib/types';

type ConcursosClientProps = {
  ativos: Concurso[];
  previstos: Concurso[];
  arquivados: Concurso[];
  paginasDisponiveis: Disciplina[];
};

const ConcursoCard = ({ concurso, onEdit, onLink }: { concurso: Concurso, onEdit: () => void, onLink: () => void }) => {
  const [, startTransition] = useTransition();

  const handleUnlink = (paginaId: number) => {
    if (confirm('Tem a certeza de que deseja desvincular esta pasta? A pasta em si não será excluída.')) {
      startTransition(() => unlinkPastaFromConcurso(concurso.id, paginaId));
    }
  };

  const dataFormatada = new Date(concurso.data_prova ?? '').toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  return (
    <div className="bg-card p-4 rounded-lg border flex flex-col justify-between h-full">
      <div>
        <h3 className="font-bold text-lg">{concurso.nome}</h3>
        <p className="text-sm text-muted-foreground">{concurso.banca}</p>
        <p className="text-sm text-muted-foreground mt-1">Data da Prova: {dataFormatada}</p>
        
        {concurso.prioridades && concurso.prioridades.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-bold text-foreground/80 mb-1">Prioridades:</h4>
            <ul className="list-disc list-inside space-y-1">
              {concurso.prioridades.map((p, index) => (<li key={index} className="text-xs text-muted-foreground">{p}</li>))}
            </ul>
          </div>
        )}
        
        <div className="mt-4">
          <h4 className="text-xs font-bold text-foreground/80 mb-2">Pastas de Estudo Vinculadas:</h4>
          <div className="space-y-2">
            {concurso.concurso_paginas && concurso.concurso_paginas.length > 0 ? (
              concurso.concurso_paginas.map(({ paginas }) => {
                if (!paginas) return null;
                return (
                  <div key={paginas.id} className="flex justify-between items-center text-sm bg-secondary p-2 rounded-md">
                    <Link href={`/disciplinas?page=${paginas.id}`} className="flex items-center gap-2 hover:text-primary">
                      <span>{paginas.emoji || '📄'}</span> {paginas.title}
                    </Link>
                    <Button onClick={() => handleUnlink(paginas.id)} variant="ghost" size="icon" className="h-6 w-6" title="Desvincular">
                      <LinkIcon className="h-3 w-3 text-muted-foreground"/>
                    </Button>
                  </div>
                )
              })
            ) : <p className="text-xs text-muted-foreground">Nenhuma pasta vinculada.</p>}
          </div>
        </div>

        {concurso.edital_url && (
          <div className="mt-4">
            <a href={concurso.edital_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />Ver Edital</Button>
            </a>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4 border-t pt-4">
        <Button variant="ghost" size="icon" onClick={onLink} title="Vincular Pasta"><FolderPlus className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onEdit} title="Editar"><Edit className="h-4 w-4" /></Button>
        {concurso.status !== 'arquivado' ? (
          <Button variant="ghost" size="icon" onClick={() => startTransition(() => updateConcursoStatus(concurso.id, 'arquivado'))} title="Arquivar"><Archive className="h-4 w-4" /></Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => startTransition(() => updateConcursoStatus(concurso.id, 'ativo'))} title="Desarquivar"><ArchiveRestore className="h-4 w-4" /></Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => {if (confirm(`Tem a certeza?`)) {startTransition(() => deleteConcurso(concurso.id))}}} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
};

export function ConcursosClient({ ativos, previstos, arquivados, paginasDisponiveis }: ConcursosClientProps) {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<Concurso | null>(null);
  
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingConcursoId, setLinkingConcursoId] = useState<number | null>(null);

  const handleOpenAddModal = () => { setEditingConcurso(null); setIsFormModalOpen(true); };
  const handleOpenEditModal = (concurso: Concurso) => { setEditingConcurso(concurso); setIsFormModalOpen(true); };
  const handleOpenLinkModal = (concursoId: number) => { setLinkingConcursoId(concursoId); setIsLinkModalOpen(true); };
  
  const renderGrid = (concursos: Concurso[]) => {
    if (concursos.length === 0) return <p className="text-muted-foreground mt-4 text-center">Nenhum concurso nesta categoria.</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {concursos.map(concurso => 
          <ConcursoCard key={concurso.id} concurso={concurso} onEdit={() => handleOpenEditModal(concurso)} onLink={() => handleOpenLinkModal(concurso.id)} />
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
      
      <ConcursoFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} concurso={editingConcurso} />
      <LinkPastaModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} concursoId={linkingConcursoId} paginasDisponiveis={paginasDisponiveis} />
    </>
  );
}
