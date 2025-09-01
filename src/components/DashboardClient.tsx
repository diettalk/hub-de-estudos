'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DashboardCard } from '@/components/DashboardCard';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { DashboardListItem } from '@/components/ui/DashboardListItem';
import { Activity, ListChecks, CalendarCheck, CheckCircle } from 'lucide-react';
import { updateRevisaoStatus, toggleTarefa } from '@/app/actions';
import Link from 'next/link';
import { type SessaoEstudo, type Tarefa, type Revisao, type StudyGoal, type Lembrete } from '@/lib/types';
import { MetasCard } from './MetasCard';
import { CalendarioDashboardCard } from './CalendarioDashboardCard';

type DashboardData = {
  todasSessoes: SessaoEstudo[];
  tarefasPendentes: Tarefa[];
  revisoes: Revisao[];
  lembretes: Lembrete[];
  sessoesDeHoje: SessaoEstudo[];
  sessoesConcluidasTotal: number;
  revisoesDeHoje: Revisao[];
  studyGoals: StudyGoal[];
};

const DEFAULT_LAYOUT = {
    main: ['sessoes', 'revisoes', 'tarefas', 'calendario'],
    side: ['metas', 'concluidas', 'progresso', 'pomodoro'] 
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const [mainColumnItems, setMainColumnItems] = useState<string[]>([]);
  const [sideColumnItems, setSideColumnItems] = useState<string[]>([]);

  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayout');
    const allValidCardIds = [...DEFAULT_LAYOUT.main, ...DEFAULT_LAYOUT.side];

    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        
        const filteredMain = (parsedLayout.main || []).filter((id: string) => allValidCardIds.includes(id));
        const filteredSide = (parsedLayout.side || []).filter((id: string) => allValidCardIds.includes(id));
        const allSavedValidKeys = new Set([...filteredMain, ...filteredSide]);
        
        const isLayoutCompleteAndValid = allValidCardIds.length === allSavedValidKeys.size && allValidCardIds.every(id => allSavedValidKeys.has(id));

        if (isLayoutCompleteAndValid) {
          setMainColumnItems(filteredMain);
          setSideColumnItems(filteredSide);
        } else {
          localStorage.setItem('dashboardLayout', JSON.stringify(DEFAULT_LAYOUT));
          setMainColumnItems(DEFAULT_LAYOUT.main);
          setSideColumnItems(DEFAULT_LAYOUT.side);
        }
      } catch (error) {
        localStorage.setItem('dashboardLayout', JSON.stringify(DEFAULT_LAYOUT));
        setMainColumnItems(DEFAULT_LAYOUT.main);
        setSideColumnItems(DEFAULT_LAYOUT.side);
      }
    } else {
      localStorage.setItem('dashboardLayout', JSON.stringify(DEFAULT_LAYOUT));
      setMainColumnItems(DEFAULT_LAYOUT.main);
      setSideColumnItems(DEFAULT_LAYOUT.side);
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const findColumn = (id: string) => {
        if (mainColumnItems.includes(id)) return 'main';
        if (sideColumnItems.includes(id)) return 'side';
        return null;
    }
    const sourceColumn = findColumn(activeId);
    const destinationColumn = findColumn(overId);

    if (!sourceColumn || !destinationColumn) return;

    let newMainItems = [...mainColumnItems];
    let newSideItems = [...sideColumnItems];

    if (sourceColumn === destinationColumn) {
      if (sourceColumn === 'main') {
        newMainItems = arrayMove(newMainItems, newMainItems.indexOf(activeId), newMainItems.indexOf(overId));
      } else {
        newSideItems = arrayMove(newSideItems, newSideItems.indexOf(activeId), newSideItems.indexOf(overId));
      }
    } else {
      let itemToMove: string;
      if (sourceColumn === 'main') {
        itemToMove = newMainItems.splice(newMainItems.indexOf(activeId), 1)[0];
      } else {
        itemToMove = newSideItems.splice(newSideItems.indexOf(activeId), 1)[0];
      }
      if (destinationColumn === 'main') {
        newMainItems.splice(newMainItems.indexOf(overId), 0, itemToMove);
      } else {
        newSideItems.splice(newSideItems.indexOf(overId), 0, itemToMove);
      }
    }
    setMainColumnItems(newMainItems);
    setSideColumnItems(newSideItems);
    localStorage.setItem('dashboardLayout', JSON.stringify({ main: newMainItems, side: newSideItems }));
  };

  const cardComponents: { [key: string]: React.ReactNode } = {
    sessoes: (<DashboardCard id="sessoes"><div><div className="flex items-center gap-3 mb-4"><Activity className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Sessões de Hoje</h2></div><p className="text-5xl font-bold text-primary mb-2">{data.sessoesDeHoje.length}</p><div className="flex-grow space-y-1 overflow-y-auto">{data.sessoesDeHoje.map(s => <Link key={s.id} href="/ciclo" className="flex items-center p-2 -mx-2 rounded-md hover:bg-secondary group"><span className="text-sm text-muted-foreground truncate"> • {s.materia_nome}</span></Link>)}</div></div></DashboardCard>),
    revisoes: (<DashboardCard id="revisoes"><div><div className="flex items-center gap-3 mb-4"><CalendarCheck className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Revisões para Hoje</h2></div><p className="text-5xl font-bold text-primary mb-2">{data.revisoesDeHoje.length}</p><div className="flex-grow space-y-1 overflow-y-auto">{data.revisoesDeHoje.map(r => <DashboardListItem key={r.id} id={r.id} href="/revisoes" type="revisao" action={updateRevisaoStatus}>{r.materia_nome}</DashboardListItem>)}</div></div></DashboardCard>),
    tarefas: (<DashboardCard id="tarefas"><div><div className="flex items-center gap-3 mb-4"><ListChecks className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Tarefas Pendentes</h2></div><div className="flex-grow space-y-1 overflow-y-auto">{data.tarefasPendentes.map(t => <DashboardListItem key={t.id} id={t.id} href="/tarefas" type="tarefa" action={(id, status) => toggleTarefa(id, status)}>{t.title}</DashboardListItem>)}</div></div></DashboardCard>),
    calendario: <DashboardCard id="calendario"><CalendarioDashboardCard lembretes={data.lembretes} revisoes={data.revisoes} /></DashboardCard>,
    concluidas: (<DashboardCard id="concluidas"><div><div className="flex items-center gap-3 mb-4"><CheckCircle className="w-5 h-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Sessões Concluídas (Total)</h2></div><p className="text-5xl font-bold">{data.sessoesConcluidasTotal}</p></div></DashboardCard>),
    progresso: <DashboardCard id="progresso"><ProgressoCicloCard sessoes={data.todasSessoes} /></DashboardCard>,
    pomodoro: <DashboardCard id="pomodoro"><PomodoroTimer /></DashboardCard>,
    metas: <DashboardCard id="metas"><MetasCard goals={data.studyGoals} /></DashboardCard>,
  };
  
  const renderColumn = (items: string[]) => {
    return items
      .filter(id => cardComponents[id]) 
      .map(id => cardComponents[id]);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        {/* A MUDANÇA ESTÁ AQUI: Trocamos a grelha rígida por um flexbox responsivo */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* E AQUI: Definimos larguras flexíveis para as colunas */}
            <motion.div className="w-full lg:w-2/3 space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                <SortableContext items={mainColumnItems} strategy={rectSortingStrategy}>
                    {renderColumn(mainColumnItems)}
                </SortableContext>
            </motion.div>
            {/* E AQUI: A coluna lateral também se adapta */}
            <motion.div className="w-full lg:w-1/3 space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                <SortableContext items={sideColumnItems} strategy={rectSortingStrategy}>
                    {renderColumn(sideColumnItems)}
                </SortableContext>
            </motion.div>
        </div>
    </DndContext>
  );
}
