'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function DashboardCard({ id, children, className, headerAction }: DashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col h-full rounded-2xl bg-card border border-border shadow-xs transition-all duration-200',
        'hover:border-border/80 hover:shadow-md',
        isDragging && 'opacity-60 ring-2 ring-primary shadow-2xl scale-[1.01] cursor-grabbing',
        className
      )}
    >
      {/* Alça de Arraste e Ações de Topo */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        {headerAction}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorganizar card"
          className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo Interno */}
      <div className="p-5 sm:p-6 flex-grow flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}