// src/components/DashboardClient.tsx
'use client';

import { useState, useEffect } from 'react';
// 1. IMPORTAR O 'motion'
import { motion } from 'framer-motion';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DashboardCard } from '@/components/DashboardCard';
import { AnotacoesRapidasCard } from '@/components/AnotacoesRapidasCard';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { DashboardListItem } from '@/components/ui/DashboardListItem';
import { Activity, ListChecks, CalendarCheck, CheckCircle } from 'lucide-react';
import { updateRevisaoStatus, toggleTarefa } from '@/app/actions';
import Link from 'next/link';

type DashboardData = {
  todasSessoes: any[];
  tarefasPendentes: any[];
  anotacoes: any[];
  sessoesDeHoje: any[];
  sessoesConcluidasTotal: number;
  revisoesDeHoje: any[];
};

const DEFAULT_LAYOUT = {
    main: ['sessoes', 'revisoes', 'tarefas', 'anotacoes'],
    side: ['concluidas', 'progresso', 'pomodoro']
};

// 2. DEFINIR AS VARIANTES DE ANIMAÇÃO DO CONTAINER
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1 // Atraso de 0.1s entre cada card filho
    }
  }
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const [mainColumnItems, setMainColumnItems] = useState<string[]>([]);
  const [sideColumnItems, setSideColumnItems] = useState<string[]>([]);

  // ... (toda a sua lógica de useEffect, sensors, e handleDragEnd permanece a mesma)
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        const allKeys = [...DEFAULT_LAYOUT.main, ...DEFAULT_LAYOUT.side];
        const savedKeys = [...(parsedLayout.main || []), ...(parsedLayout.side || [])];
        
        if (allKeys.length === savedKeys.length && allKeys.every(k => savedKeys.includes(k))) {
            setMainColumnItems(parsedLayout.main);
            setSideColumnItems(parsedLayout.side);
        } else {
            console.warn("Layout do dashboard salvo é inválido ou obsoleto. Redefinindo para o padrão.");
            localStorage.removeItem('dashboardLayout');
            setMainColumnItems(DEFAULT_LAYOUT.main);
            setSideColumnItems(DEFAULT_LAYOUT.side);
        }
      } catch (error) {
          console.error("Falha ao analisar o layout salvo:", error);
          localStorage.removeItem('dashboardLayout');
          setMainColumnItems(DEFAULT_LAYOUT.main);
          setSideColumnItems(DEFAULT_LAYOUT.side);
      }
    } else {
      setMainColumnItems(DEFAULT_LAYOUT.main);
      setSideColumnItems(DEFAULT_LAYOUT.side);
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;
    
    const findColumn = (id: string) => {
        if (mainColumnItems.includes(id)) return 'main';
        if (sideColumnItems.includes(id)) return 'side';
        return null;
    }
    const sourceColumn = findColumn(activeId);
    let destinationColumn = findColumn(overId);
    if (!destinationColumn) return;

    let newMainItems = [...mainColumnItems];
    let newSideItems = [...sideColumnItems];

    if (sourceColumn === destinationColumn) {
      if (sourceColumn === 'main') {
        const oldIndex = newMainItems.indexOf(activeId);
        const newIndex = newMainItems.indexOf(overId);
        newMainItems = arrayMove(newMainItems, oldIndex, newIndex);
      } else {
        const oldIndex = newSideItems.indexOf(activeId);
        const newIndex = newSideItems.indexOf(overId);
        newSideItems = arrayMove(newSideItems, oldIndex, newIndex);
      }
    } else {
      let itemToMove: string;
      if (sourceColumn === 'main') {
        itemToMove = newMainItems.splice(newMainItems.indexOf(activeId), 1)[0];
      } else {
        itemToMove = newSideItems.splice(newSideItems.indexOf(activeId), 1)[0];
      }
      if (destinationColumn === 'main') {
        const newIndexInMain = newMainItems.indexOf(overId);
        newMainItems.splice(newIndexInMain >= 0 ? newIndexInMain : newMainItems.length, 0, itemToMove);
      } else {
        const newIndexInSide = newSideItems.indexOf(overId);
        newSideItems.splice(newIndexInSide >= 0 ? newIndexInSide : newSideItems.length, 0, itemToMove);
      }
    }
    
    setMainColumnItems(newMainItems);
    setSideColumnItems(newSideItems);
    localStorage.setItem('dashboardLayout', JSON.stringify({ main: newMainItems, side: newSideItems }));
  };


  const cardComponents: { [key: string]: React.ReactNode } = {
    sessoes: (
        <DashboardCard id="sessoes">
          <div className="flex items-center gap-3 mb-4"><Activity className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Sessões de Hoje</h2></div>
          <p className="text-5xl font-bold text-primary mb-2">{data.sessoesDeHoje.length}</p>
          <div className="flex-grow space-y-1 overflow-y-auto">{data.sessoesDeHoje.map(s => <Link key={s.id} href="/ciclo" className="flex items-center p-2 -mx-2 rounded-md hover:bg-secondary group"><span className="text-sm text-muted-foreground truncate"> • {s.materia_nome}</span></Link>)}</div>
        </DashboardCard>
    ),
    revisoes: (
        <DashboardCard id="revisoes">
          <div className="flex items-center gap-3 mb-4"><CalendarCheck className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Revisões para Hoje</h2></div>
          <p className="text-5xl font-bold text-primary mb-2">{data.revisoesDeHoje.length}</p>
          <div className="flex-grow space-y-1 overflow-y-auto">{data.revisoesDeHoje.map(r => <DashboardListItem key={r.id} id={r.id} href="/revisoes" type="revisao" action={updateRevisaoStatus}>{r.materia_nome}</DashboardListItem>)}</div>
        </DashboardCard>
    ),
    tarefas: <DashboardCard id="tarefas"><div className="flex items-center gap-3 mb-4"><ListChecks className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Tarefas Pendentes</h2></div><div className="flex-grow space-y-1 overflow-y-auto">{data.tarefasPendentes.map(t => <DashboardListItem key={t.id} id={t.id} href="/tarefas" type="tarefa" action={(id, status) => toggleTarefa(id, status)}>{t.title}</DashboardListItem>)}</div></DashboardCard>,
    anotacoes: <DashboardCard id="anotacoes"><AnotacoesRapidasCard anotacoes={data.anotacoes} /></DashboardCard>,
    concluidas: <DashboardCard id="concluidas"><div className="flex items-center gap-3 mb-4"><CheckCircle className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Sessões Concluídas (Total)</h2></div><p className="text-5xl font-bold">{data.sessoesConcluidasTotal}</p></DashboardCard>,
    progresso: <DashboardCard id="progresso"><ProgressoCicloCard sessoes={data.todasSessoes} /></DashboardCard>,
    pomodoro: <DashboardCard id="pomodoro"><PomodoroTimer /></DashboardCard>,
  };
  
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
            {/* 3. APLICAR AS VARIANTES DE ANIMAÇÃO ÀS COLUNAS */}
            <motion.div 
              className="lg:col-span-2 space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
                <SortableContext items={mainColumnItems} strategy={rectSortingStrategy}>
                    {mainColumnItems.map(id => cardComponents[id])}
                </SortableContext>
            </motion.div>
            <motion.div 
              className="lg:col-span-1 space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
                <SortableContext items={sideColumnItems} strategy={rectSortingStrategy}>
                    {sideColumnItems.map(id => cardComponents[id])}
                </SortableContext>
            </motion.div>
        </div>
    </DndContext>
  );
}