'use client';

import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} // Estado inicial: invisível e um pouco para baixo
      animate={{ opacity: 1, y: 0 }}   // Estado final: totalmente visível e na posição original
      transition={{ duration: 0.5, ease: 'easeInOut' }} // Duração e tipo da transição
    >
      {children}
    </motion.div> // AQUI ESTAVA O ERRO: Corrigido de </motion.doc> para </motion.div>
  );
}