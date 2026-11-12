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

export function getHojeBrasilISO(offsetDays = 0): string {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function extrairPlanoIdDaSessao(sessao: {
  diario_de_bordo?: string | null;
  foco_sugerido?: string | null;
}): number | null {
  const texto = `${sessao.diario_de_bordo || ''} ${sessao.foco_sugerido || ''}`;
  const match = texto.match(/\[PLANO:(\d+)\]/);
  return match ? parseInt(match[1], 10) : null;
}

export function limparTagPlano(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto.replace(/\[PLANO:\d+\]\s*/g, '').trim();
}

export function sessaoPertenceAoPlano(
  sessao: SessaoEstudo,
  plano: PlanoAtivoInfo | null
): boolean {
  if (!plano) return true;

  const planoCarimbado = extrairPlanoIdDaSessao(sessao);
  if (planoCarimbado !== null) {
    return planoCarimbado === plano.id;
  }

  if (sessao.disciplina_id && plano.disciplinaIds.includes(Number(sessao.disciplina_id))) {
    return true;
  }

  if (sessao.materia_nome?.trim()) {
    const nomeNorm = sessao.materia_nome.trim().toLowerCase();
    if (plano.disciplinaNomes.some((n) => n.toLowerCase() === nomeNorm)) {
      return true;
    }
  }

  return false;
}

export function revisaoPertenceAoPlano(
  revisao: Revisao,
  plano: PlanoAtivoInfo | null,
  sessoesDoPlano: SessaoEstudo[]
): boolean {
  if (!plano) return true;

  const match = (revisao.foco_sugerido || '').match(/\[PLANO:(\d+)\]/);
  if (match) {
    return parseInt(match[1], 10) === plano.id;
  }

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

let cachedPlanos: PlanoAtivoInfo[] | null = null;
let cachedUserId: string | null = null;
let inflightPromise: Promise<PlanoAtivoInfo[]> | null = null;

export function usePlanoAtivo() {
  const [planos, setPlanos] = useState<PlanoAtivoInfo[]>(cachedPlanos || []);
  const [planoAtivoId, setPlanoAtivoId] = useState<number | 'all' | null>(null);
  const [userId, setUserId] = useState<string>(cachedUserId || 'anon');
  const [isLoadingPlano, setIsLoadingPlano] = useState(!cachedPlanos);
  const supabase = createClient();

  const selecionarPlanoSalvo = useCallback((lista: PlanoAtivoInfo[], uid: string) => {
    if (lista.length === 0) {
      setPlanoAtivoId('all');
      return;
    }
    const storageKey = `hub_plano_ativo_id_${uid}`;
    const saved =
      localStorage.getItem(storageKey) || localStorage.getItem('hub_plano_ativo_id');
    if (saved === 'all') {
      setPlanoAtivoId('all');
    } else if (saved && lista.some((p) => String(p.id) === saved)) {
      setPlanoAtivoId(Number(saved));
    } else {
      const primeiroAtivo = lista.find((p) => p.status === 'ativo') || lista[0];
      setPlanoAtivoId(primeiroAtivo.id);
      localStorage.setItem(storageKey, String(primeiroAtivo.id));
    }
  }, []);

  const carregarPlanos = useCallback(
    async (forceRefresh = false) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingPlano(false);
        return;
      }

      setUserId(user.id);

      if (!forceRefresh && cachedPlanos && cachedUserId === user.id) {
        setPlanos(cachedPlanos);
        selecionarPlanoSalvo(cachedPlanos, user.id);
        setIsLoadingPlano(false);
        return;
      }

      if (!forceRefresh && inflightPromise) {
        const res = await inflightPromise;
        setPlanos(res);
        selecionarPlanoSalvo(res, user.id);
        setIsLoadingPlano(false);
        return;
      }

      inflightPromise = (async () => {
        const [concursosRes, paginasRaizRes] = await Promise.all([
          supabase
            .from('concursos')
            .select(
              'id, nome, banca, data_prova, status, concurso_paginas(pagina_id, paginas(id, title))'
            )
            .eq('user_id', user.id)
            .order('ordem', { ascending: true, nullsFirst: false }),
          supabase
            .from('paginas')
            .select('id, title')
            .eq('user_id', user.id)
            .is('parent_id', null),
        ]);

        const todasRaiz: any[] = paginasRaizRes.data || [];
        const listaConcursos: any[] = concursosRes.data || [];

        const primeiroAtivo: any =
          listaConcursos.find((c: any) => c.status === 'ativo') || listaConcursos[0];

        if (primeiroAtivo && todasRaiz.length > 0) {
          const vinculadasEmAlgumPlano = new Set<number>();
          listaConcursos.forEach((c: any) => {
            (c.concurso_paginas || []).forEach((cp: any) => {
              if (cp.pagina_id) vinculadasEmAlgumPlano.add(Number(cp.pagina_id));
            });
          });

          const orfas = todasRaiz.filter((p) => !vinculadasEmAlgumPlano.has(Number(p.id)));
          if (orfas.length > 0) {
            await supabase.from('concurso_paginas').insert(
              orfas.map((o) => ({
                concurso_id: primeiroAtivo.id,
                pagina_id: o.id,
              }))
            );
            orfas.forEach((o) => {
              primeiroAtivo.concurso_paginas = [
                ...(primeiroAtivo.concurso_paginas || []),
                { pagina_id: o.id, paginas: { id: o.id, title: o.title } } as any,
              ];
            });
          }
        }

        const formatados: PlanoAtivoInfo[] = listaConcursos.map((c: any) => {
          const dIds: number[] = [];
          const dNomes: string[] = [];
          (c.concurso_paginas || []).forEach((cp: any) => {
            if (cp.pagina_id && !dIds.includes(Number(cp.pagina_id))) {
              dIds.push(Number(cp.pagina_id));
            }
            const pagObj = Array.isArray(cp.paginas) ? cp.paginas[0] : cp.paginas;
            if (pagObj?.id && !dIds.includes(Number(pagObj.id))) {
              dIds.push(Number(pagObj.id));
            }
            if (pagObj?.title) {
              dNomes.push(String(pagObj.title).trim());
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

        cachedPlanos = formatados;
        cachedUserId = user.id;
        inflightPromise = null;
        return formatados;
      })();

      const listaFinal = await inflightPromise;
      setPlanos(listaFinal);
      selecionarPlanoSalvo(listaFinal, user.id);
      setIsLoadingPlano(false);
    },
    [supabase, selecionarPlanoSalvo]
  );

  useEffect(() => {
    carregarPlanos(false);

    const handlePlanoChanged = (e: Event) => {
      const custom = e as CustomEvent<{ id: number | 'all'; forceRefresh?: boolean }>;
      if (custom.detail?.id !== undefined) {
        setPlanoAtivoId(custom.detail.id);
      }
      if (custom.detail?.forceRefresh) {
        carregarPlanos(true);
      }
    };

    window.addEventListener('plano-ativo-changed', handlePlanoChanged);
    return () => window.removeEventListener('plano-ativo-changed', handlePlanoChanged);
  }, [carregarPlanos]);

  const alterarPlanoAtivo = (novoId: number | 'all') => {
    setPlanoAtivoId(novoId);
    localStorage.setItem(`hub_plano_ativo_id_${userId}`, String(novoId));
    localStorage.setItem('hub_plano_ativo_id', String(novoId));
    window.dispatchEvent(
      new CustomEvent('plano-ativo-changed', { detail: { id: novoId } })
    );
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
    recarregarPlanos: () => carregarPlanos(true),
  };
}