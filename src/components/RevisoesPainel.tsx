// src/components/RevisoesPainel.tsx

'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

export default function RevisoesPainel() {
  const [count, setCount] = useState<number | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchRevisoesCount = async () => {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { count, error } = await supabase
        .from('sessoes_estudo')
        .select('*', { count: 'exact', head: true })
        .or(
          `and(data_revisao_1.eq.${hoje},r1_concluida.is.false),and(data_revisao_2.eq.${hoje},r2_concluida.is.false),and(data_revisao_3.eq.${hoje},r3_concluida.is.false)`
        );

      if (error) {
        console.error("Erro ao contar revisões:", error);
        setCount(0);
      } else {
        setCount(count);
      }
    };

    fetchRevisoesCount();
  }, [supabase]);

  if (count === null) {
    return <p className="text-4xl font-bold text-orange-400">...</p>;
  }

  return <p className="text-4xl font-bold text-orange-400">{count}</p>;
}