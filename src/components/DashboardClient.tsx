'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DashboardCard } from '@/components/DashboardCard';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { DashboardListItem } from '@/components/ui/DashboardListItem';
import { MetasCard } from '@/components/MetasCard';
import { CalendarioDashboardCard } from '@/components/CalendarioDashboardCard';
import { updateRevisaoStatus, toggleTarefa } from '@/app/actions';
import {
  type SessaoEstudo,
  type Tarefa,
  type Revisao,
  type StudyGoal,
  type Lembrete,
} from '@/lib/types';
import {
  Activity,
  ListChecks,
  CalendarCheck,
  Trophy,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  side: ['metas', 'concluidas', 'progresso', 'pomodoro'],
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const [mainColumnItems, setMainColumnItems] = useState<string[]>(DEFAULT_LAYOUT.main);
  const [sideColumnItems, setSideColumnItems] = useState<string[]>(DEFAULT_LAYOUT.side);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedLayout = localStorage.getItem('dashboardLayout');
    const allValidCardIds = [...DEFAULT_LAYOUT.main, ...DEFAULT_LAYOUT.side];

    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        const filteredMain = (parsedLayout.main || []).filter((id: string) => allValidCardIds.includes(id));
        const filteredSide = (parsedLayout.side || []).filter((id: string) => allValidCardIds.includes(id));
        const allSavedValidKeys = new Set([...filteredMain, ...filteredSide]);

        const isLayoutCompleteAndValid =
          allValidCardIds.length === allSavedValidKeys.size &&
          allValidCardIds.every((id) => allSavedValidKeys.has(id));

        if (isLayoutCompleteAndValid) {
          setMainColumnItems(filteredMain);
          setSideColumnItems(filteredSide);
        } else {
          localStorage.setItem('dashboardLayout', JSON.stringify(DEFAULT_LAYOUT));
        }
      } catch {
        localStorage.setItem('dashboardLayout', JSON.stringify(DEFAULT_LAYOUT));
      }
    }
  }, []);

  const resetLayout = () => {
    setMainColumnItems(DEFAULT_LAYOUT.main);
    setSideColumnItems(DEFAULT_LAYOUT.side);
    localStorage.setItem('dashboardLayout', JSON.stringify(DEFAULT_LAYOUT));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const findColumn = (id: string) => {
      if (mainColumnItems.includes(id)) return 'main';
      if (sideColumnItems.includes(id)) return 'side';
      return null;
    };

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

  // Obter data de hoje formatada em pt-BR
  const hojeFormatado = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const cardComponents: Record<string, React.ReactNode> = {
    // 1. SESSÕES DE HOJE
    sessoes: (
      <DashboardCard id="sessoes">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-none">Sessões de Hoje</h2>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">Ciclo de estudo programado</span>
              </div>
            </div>
            <Badge variant="secondary" className="font-semibold text-xs">
              {data.sessoesDeHoje.length} {data.sessoesDeHoje.length === 1 ? 'sessão' : 'sessões'}
            </Badge>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl font-extrabold tracking-tight text-primary">
              {data.sessoesDeHoje.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">para cumprir hoje</span>
          </div>

          <div className="flex-1 mt-3 space-y-1.5 overflow-y-auto max-h-56 pr-1">
            {data.sessoesDeHoje.length > 0 ? (
              data.sessoesDeHoje.map((s) => (
                <Link
                  key={s.id}
                  href="/ciclo"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary hover:border-border transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {s.materia_nome}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border/80 bg-secondary/10">
                <CheckCheck className="w-8 h-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Nenhuma sessão pendente para hoje.</p>
                <Link href="/ciclo" className="text-xs font-semibold text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                  Ver ciclo de estudos <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </DashboardCard>
    ),

    // 2. REVISÕES PARA HOJE
    revisoes: (
      <DashboardCard id="revisoes">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-none">Revisões para Hoje</h2>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">Revisão espaçada (24h, 7d, 30d)</span>
              </div>
            </div>
            <Badge variant={data.revisoesDeHoje.length > 0 ? "default" : "secondary"} className="font-semibold text-xs">
              {data.revisoesDeHoje.length}
            </Badge>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              {data.revisoesDeHoje.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">acumuladas no dia</span>
          </div>

          <div className="flex-1 mt-3 space-y-1.5 overflow-y-auto max-h-56 pr-1">
            {data.revisoesDeHoje.length > 0 ? (
              data.revisoesDeHoje.map((r) => (
                <DashboardListItem
                  key={r.id}
                  id={r.id}
                  href="/revisoes"
                  type="revisao"
                  action={updateRevisaoStatus}
                >
                  {r.materia_nome}
                </DashboardListItem>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border/80 bg-secondary/10">
                <Sparkles className="w-8 h-8 text-amber-500/60 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Tudo revisado! Nenhuma revisão atrasada.</p>
                <Link href="/revisoes" className="text-xs font-semibold text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                  Abrir painel de revisões <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </DashboardCard>
    ),

    // 3. TAREFAS PENDENTES
    tarefas: (
      <DashboardCard id="tarefas">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <ListChecks className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-none">Tarefas Pendentes</h2>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">Checklist de rotina</span>
              </div>
            </div>
            <Link href="/tarefas">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-secondary">
                Ver todas
              </Badge>
            </Link>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-56 pr-1">
            {data.tarefasPendentes.length > 0 ? (
              data.tarefasPendentes.map((t) => (
                <DashboardListItem
                  key={t.id}
                  id={t.id}
                  href="/tarefas"
                  type="tarefa"
                  action={(id, status) => toggleTarefa(id, status)}
                >
                  {t.title}
                </DashboardListItem>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border/80 bg-secondary/10">
                <CheckCheck className="w-8 h-8 text-emerald-500/60 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Você concluiu todas as tarefas!</p>
                <Link href="/tarefas" className="text-xs font-semibold text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                  Criar nova tarefa <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </DashboardCard>
    ),

    // 4. CALENDÁRIO
    calendario: (
      <DashboardCard id="calendario">
        <CalendarioDashboardCard lembretes={data.lembretes} revisoes={data.revisoes} />
      </DashboardCard>
    ),

    // 5. SESSÕES CONCLUÍDAS (TOTAL)
    concluidas: (
      <DashboardCard id="concluidas">
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-center justify-between mb-4 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-none">Sessões Concluídas</h2>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">Total histórico de foco</span>
              </div>
            </div>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tight text-emerald-500">
              {data.sessoesConcluidasTotal}
            </span>
            <span className="text-xs font-medium text-muted-foreground">blocos finalizados</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Cada sessão concluída aproxima você da fixação a longo prazo. Mantenha o ritmo!
          </p>
        </div>
      </DashboardCard>
    ),

    // 6. PROGRESSO DO CICLO
    progresso: (
      <DashboardCard id="progresso">
        <ProgressoCicloCard sessoes={data.todasSessoes} />
      </DashboardCard>
    ),

    // 7. TIMER POMODORO
    pomodoro: (
      <DashboardCard id="pomodoro">
        <PomodoroTimer />
      </DashboardCard>
    ),

    // 8. METAS DE ESTUDO
    metas: (
      <DashboardCard id="metas">
        <MetasCard goals={data.studyGoals} />
      </DashboardCard>
    ),
  };

  const renderColumn = (items: string[]) => {
    return items
      .filter((id) => cardComponents[id])
      .map((id) => React.cloneElement(cardComponents[id] as React.ReactElement, { key: id }));
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">
            {hojeFormatado}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Bem-vindo ao seu painel. Arraste os cards para organizar seu espaço de estudo.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetLayout}
          className="self-start sm:self-auto text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          title="Restaurar posições originais dos cards"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Layout</span>
        </Button>
      </div>

      {/* ÁREA DRAG AND DROP */}
      {isClient && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA PRINCIPAL (66% no desktop) */}
            <motion.div
              className="lg:col-span-8 space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SortableContext items={mainColumnItems} strategy={rectSortingStrategy}>
                {renderColumn(mainColumnItems)}
              </SortableContext>
            </motion.div>

            {/* COLUNA LATERAL (33% no desktop) */}
            <motion.div
              className="lg:col-span-4 space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <SortableContext items={sideColumnItems} strategy={rectSortingStrategy}>
                {renderColumn(sideColumnItems)}
              </SortableContext>
            </motion.div>
          </div>
        </DndContext>
      )}
    </div>
  );
}