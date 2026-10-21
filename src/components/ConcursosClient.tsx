'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion } from 'framer-motion'; // Para o efeito de hover
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'; // Para o drag-and-drop
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, Edit, Trash2, FileText, Link as LinkIcon, FolderPlus, GripVertical } from "lucide-react";
import { deleteConcurso, updateConcursoStatus, unlinkPastaFromConcurso, updateConcursosOrdem } from '@/app/actions';
import { ConcursoFormModal } from './ConcursoFormModal';
import { LinkPastaModal } from './LinkPastaModal';
import Link from 'next/link';
import { type Concurso, type Disciplina } from '@/lib/types';
import { toast } from 'sonner';

// O Card de Concurso agora é um componente "sortable" e "animável"
const SortableConcursoCard = ({ concurso, onEdit, onLink }: { concurso: Concurso, onEdit: () => void, onLink: () => void }) => {
  const [, startTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: concurso.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleUnlink = (paginaId: number) => {
    if (confirm('Tem a certeza de que deseja desvincular esta pasta?')) {
      startTransition(() => unlinkPastaFromConcurso(concurso.id, paginaId));
    }
  };

  const dataFormatada = new Date(concurso.data_prova ?? '').toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout // Anima as mudanças de layout
      whileHover={{ scale: 1.02 }} // Efeito de "levantar"
      className="bg-card p-4 rounded-lg border flex flex-col justify-between h-full relative"
    >
      {/* Handle para arrastar */}
      <div {...attributes} {...listeners} className="absolute top-3 right-3 cursor-grab active:cursor-grabbing text-muted-foreground">
        <GripVertical className="w-5 h-5" />
      </div>

      <div>
        <h3 className="font-bold text-lg pr-8">{concurso.nome}</h3>
        <p className="text-sm text-muted-foreground">{concurso.banca}</p>
        <p className="text-sm text-muted-foreground mt-1">Data da Prova: {dataFormatada}</p>
        
        {concurso.prioridades && concurso.prioridades.length > 0 && (
          <div className="mt-3"><h4 className="text-xs font-bold text-foreground/80 mb-1">Prioridades:</h4><ul className="list-disc list-inside space-y-1">{concurso.prioridades.map((p, index) => (<li key={index} className="text-xs text-muted-foreground">{p}</li>))}</ul></div>
        )}
        
        <div className="mt-4">
          <h4 className="text-xs font-bold text-foreground/80 mb-2">Pastas Vinculadas:</h4>
          <div className="space-y-2">
            {concurso.concurso_paginas && concurso.concurso_paginas.length > 0 ? (
              concurso.concurso_paginas.map(({ paginas }) => {
                if (!paginas) return null;
                return (
                  <div key={paginas.id} className="flex justify-between items-center text-sm bg-secondary p-2 rounded-md">
                    <Link href={`/disciplinas?page=${paginas.id}`} className="flex items-center gap-2 hover:text-primary">
                      <span>{paginas.emoji || '📄'}</span> {paginas.title}
                    </Link>
                    <Button onClick={() => handleUnlink(paginas.id)} variant="ghost" size="icon" className="h-6 w-6" title="Desvincular"><LinkIcon className="h-3 w-3 text-muted-foreground"/></Button>
                  </div>
                )
              })
            ) : <p className="text-xs text-muted-foreground">Nenhuma pasta vinculada.</p>}
          </div>
        </div>

        {concurso.edital_url && (
          <div className="mt-4"><a href={concurso.edital_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />Ver Edital</Button></a></div>
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
    </motion.div>
  );
};

type ConcursosClientProps = {
  ativos: Concurso[];
  previstos: Concurso[];
  arquivados: Concurso[];
  paginasDisponiveis: Disciplina[];
};

export function ConcursosClient({ ativos: initialAtivos, previstos: initialPrevistos, arquivados: initialArquivados, paginasDisponiveis }: ConcursosClientProps) {
  const [ativos, setAtivos] = useState(initialAtivos);
  const [previstos, setPrevistos] = useState(initialPrevistos);
  const [arquivados, setArquivados] = useState(initialArquivados);

  useEffect(() => setAtivos(initialAtivos), [initialAtivos]);
  useEffect(() => setPrevistos(initialPrevistos), [initialPrevistos]);
  useEffect(() => setArquivados(initialArquivados), [initialArquivados]);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<Concurso | null>(null);
  
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingConcursoId, setLinkingConcursoId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const reorder = (list: Concurso[], oldIndex: number, newIndex: number) => arrayMove(list, oldIndex, newIndex);

    const activeId = active.id as number;
    const overId = over.id as number;

    let updatedList: Concurso[] | null = null;
    let listType: 'ativos' | 'previstos' | 'arquivados' | null = null;

    if (ativos.some(c => c.id === activeId)) {
        listType = 'ativos';
        const oldIndex = ativos.findIndex(c => c.id === activeId);
        const newIndex = ativos.findIndex(c => c.id === overId);
        updatedList = reorder(ativos, oldIndex, newIndex);
        setAtivos(updatedList);
    } else if (previstos.some(c => c.id === activeId)) {
        listType = 'previstos';
        const oldIndex = previstos.findIndex(c => c.id === activeId);
        const newIndex = previstos.findIndex(c => c.id === overId);
        updatedList = reorder(previstos, oldIndex, newIndex);
        setPrevistos(updatedList);
    } // Adicionar lógica para 'arquivados' se também for reordenável

    if (updatedList) {
        const orderedIds = updatedList.map(c => c.id);
        updateConcursosOrdem(orderedIds).then(result => {
            if (result?.error) toast.error("Falha ao salvar a nova ordem.");
        });
    }
  };

  const handleOpenAddModal = () => { setEditingConcurso(null); setIsFormModalOpen(true); };
  const handleOpenEditModal = (concurso: Concurso) => { setEditingConcurso(concurso); setIsFormModalOpen(true); };
  const handleOpenLinkModal = (concursoId: number) => { setLinkingConcursoId(concursoId); setIsLinkModalOpen(true); };
  
  const renderGrid = (concursos: Concurso[]) => {
    if (concursos.length === 0) return <p className="text-muted-foreground mt-4 text-center">Nenhum concurso nesta categoria.</p>;
    return (
      <SortableContext items={concursos.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {concursos.map(concurso => 
            <SortableConcursoCard key={concurso.id} concurso={concurso} onEdit={() => handleOpenEditModal(concurso)} onLink={() => handleOpenLinkModal(concurso.id)} />
          )}
        </div>
      </SortableContext>
    );
  };
  
  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Tabs defaultValue="ativos" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList><TabsTrigger value="ativos">Ativos</TabsTrigger><TabsTrigger value="previstos">Previstos</TabsTrigger><TabsTrigger value="arquivados">Arquivados</TabsTrigger></TabsList>
            <Button onClick={handleOpenAddModal}>+ Adicionar Concurso</Button>
          </div>
          <TabsContent value="ativos">{renderGrid(ativos)}</TabsContent>
          <TabsContent value="previstos">{renderGrid(previstos)}</TabsContent>
          <TabsContent value="arquivados">{renderGrid(arquivados)}</TabsContent>
        </Tabs>
      </DndContext>
      
      <ConcursoFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} concurso={editingConcurso} />
      <LinkPastaModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} concursoId={linkingConcursoId} paginasDisponiveis={paginasDisponiveis} />
    </>
  );
}
