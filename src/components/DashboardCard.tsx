// src/components/DashboardCard.tsx
'use client';

import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DashboardCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

export function DashboardCard({ id, children, className }: DashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-card border rounded-lg flex flex-col h-full relative ${className}`}
      layout
      variants={itemVariants}
      // ALTERAÇÃO: Adicionar a animação de hover
      whileHover={{ scale: 1.03, zIndex: 10 }}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="p-6 flex-grow flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}