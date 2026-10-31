'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type SessaoEstudo, type Revisao } from '@/lib/types';

export interface PlanoAtivoInfo {
  id: number;
  nome: string;
  banca: string | null;
  data_prova: string | null;
  status: string;
  disciplinaIds: number[];
  disciplinaNomes: string[];
}

// Extrai o ID do plano se estiver gravado na sessão (ex: "[PLANO:12]")
export function extrairPlanoIdDaSessao(sessao: {
  diario_de_bordo?: string | null;
  foco_sugerido?: string | null;
}): number | null {
  const texto = `${sessao.diario_de_bordo || ''} ${sessao.foco_sugerido || ''}`;
  const match = texto.match(/\[PLANO:(\d+)\]/);
  return match ? parseInt(match[1], 10) : null;
}

// Remove a tag técnica "[PLANO:12]" apenas na hora de exibir na tela para ficar limpo
export function limparTagPlano(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto.replace(/\[PLANO:\d+\]\s*/g, '').trim();
}

// Verifica se uma sessão pertence ao Plano Ativo selecionado
export function sessaoPertenceAoPlano(
  sessao: SessaoEstudo,
  plano: PlanoAtivoInfo | null
): boolean {
  // Se nenhum plano específico estiver filtrado (Visão Geral), aceita todas
  if (!plano) return true;

  // 1. Se a sessão tem carimbo explícito de um plano
  const planoCarimbado = extrairPlanoIdDaSessao(sessao);
  if (planoCarimbado !== null) {
    return planoCarimbado === plano.id;
  }

  // 2. Se a sessão tem disciplina_id vinculada a este plano
  if (sessao.disciplina_id && plano.disciplinaIds.includes(Number(sessao.disciplina_id))) {
    return true;
  }

  // 3. Se o nome da matéria coincide com uma das disciplinas vinculadas ao plano
  if (sessao.materia_nome?.trim()) {
    const nomeNorm = sessao.materia_nome.trim().toLowerCase();
    if (plano.disciplinaNomes.some((n) => n.toLowerCase() === nomeNorm)) {
      return true;
    }
  }

  return false;
}

// Verifica se uma revisão pertence ao Plano Ativo selecionado
export function revisaoPertenceAoPlano(
  revisao: Revisao,
  plano: PlanoAtivoInfo | null,
  sessoesDoPlano: SessaoEstudo[]
): boolean {
  if (!plano) return true;

  // Verifica pelo nome da matéria ou foco
  if (revisao.materia_nome?.trim()) {
    const nomeNorm = revisao.materia_nome.trim().toLowerCase();
    if (plano.disciplinaNomes.some((n) => n.toLowerCase() === nomeNorm)) {
      return true;
    }
    if (sessoesDoPlano.some((s) => s.materia_nome?.trim().toLowerCase() === nomeNorm)) {
      return true;
    }
  }

  return false;
}

// Hook reativo que sincroniza o Plano Ativo em qualquer tela do Hub
export function usePlanoAtivo() {
  const [planos, setPlanos] = useState<PlanoAtivoInfo[]>([]);
  const [planoAtivoId, setPlanoAtivoId] = useState<number | 'all' | null>(null);
  const [isLoadingPlano, setIsLoadingPlano] = useState(true);
  const supabase = createClient();

  const carregarPlanos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoadingPlano(false);
      return;
    }

    const { data } = await supabase
      .from('concursos')
      .select('id, nome, banca, data_prova, status, concurso_paginas(pagina_id, paginas(id, title))')
      .eq('user_id', user.id)
      .order('ordem', { ascending: true, nullsFirst: false });

    if (data && data.length > 0) {
      const formatados: PlanoAtivoInfo[] = data.map((c: any) => {
        const dIds: number[] = [];
        const dNomes: string[] = [];
        (c.concurso_paginas || []).forEach((cp: any) => {
          if (cp.pagina_id) dIds.push(Number(cp.pagina_id));
          if (cp.paginas?.id && !dIds.includes(Number(cp.paginas.id))) {
            dIds.push(Number(cp.paginas.id));
          }
          if (cp.paginas?.title) {
            dNomes.push(cp.paginas.title.trim());
          }
        });

        return {
          id: c.id,
          nome: c.nome,
          banca: c.banca,
          data_prova: c.data_prova,
          status: c.status,
          disciplinaIds: dIds,
          disciplinaNomes: dNomes,
        };
      });

      setPlanos(formatados);

      const saved = localStorage.getItem('hub_plano_ativo_id');
      if (saved === 'all') {
        setPlanoAtivoId('all');
      } else if (saved && formatados.some((p) => String(p.id) === saved)) {
        setPlanoAtivoId(Number(saved));
      } else {
        const primeiroAtivo = formatados.find((p) => p.status === 'ativo') || formatados[0];
        setPlanoAtivoId(primeiroAtivo.id);
        localStorage.setItem('hub_plano_ativo_id', String(primeiroAtivo.id));
      }
    } else {
      setPlanos([]);
      setPlanoAtivoId('all');
    }
    setIsLoadingPlano(false);
  }, [supabase]);

  useEffect(() => {
    carregarPlanos();

    const handlePlanoChanged = (e: Event) => {
      const custom = e as CustomEvent<{ id: number | 'all' }>;
      if (custom.detail?.id !== undefined) {
        setPlanoAtivoId(custom.detail.id);
      }
      carregarPlanos();
    };

    window.addEventListener('plano-ativo-changed', handlePlanoChanged);
    return () => window.removeEventListener('plano-ativo-changed', handlePlanoChanged);
  }, [carregarPlanos]);

  const alterarPlanoAtivo = (novoId: number | 'all') => {
    setPlanoAtivoId(novoId);
    localStorage.setItem('hub_plano_ativo_id', String(novoId));
    window.dispatchEvent(new CustomEvent('plano-ativo-changed', { detail: { id: novoId } }));
  };

  const planoAtivo =
    planoAtivoId === 'all' || planoAtivoId === null
      ? null
      : planos.find((p) => p.id === planoAtivoId) || null;

  return {
    planos,
    planoAtivo,
    planoAtivoId,
    isLoadingPlano,
    alterarPlanoAtivo,
    recarregarPlanos: carregarPlanos,
  };
}