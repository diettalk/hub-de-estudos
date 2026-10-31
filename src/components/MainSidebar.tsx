'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { usePlanoAtivo } from '@/lib/plano-ativo';
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  Recycle,
  RotateCcw,
  Calendar,
  BrainCircuit,
  NotebookPen,
  ListTodo,
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ChevronsUpDown,
  Check,
  PlusCircle,
  Globe,
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Planos', href: '/guia-estudos', icon: FolderKanban },
  { name: 'Disciplinas', href: '/disciplinas', icon: Layers },
  { name: 'Planejamento / Ciclo', href: '/ciclo', icon: Recycle },
  { name: 'Revisões', href: '/revisoes', icon: RotateCcw },
  { name: 'Caderno de Erros', href: '/caderno-erros', icon: NotebookPen },
  { name: 'Gerador Anki', href: '/anki', icon: BrainCircuit },
  { name: 'Tarefas', href: '/tarefas', icon: ListTodo },
  { name: 'Calendário', href: '/calendario', icon: Calendar },
];

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface MainSidebarProps {
  user: User;
  profile: Profile | null;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function MainSidebar({ user, profile, isMobile = false, onNavigate }: MainSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { planos, planoAtivo, planoAtivoId, alterarPlanoAtivo } = usePlanoAtivo();

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const collapsed = isMobile ? false : isCollapsed;

  const getInitials = () => {
    if (profile?.full_name?.trim()) {
      const names = profile.full_name.trim().split(/\s+/);
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    return user.email?.[0].toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={`relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out select-none ${
        isMobile ? 'w-full border-r-0' : collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. TOPO: LOGO */}
      <div
        className={`flex items-center h-14 px-4 border-b border-sidebar-border ${
          collapsed ? 'justify-center' : 'justify-start gap-3'
        }`}
      >
        <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <GraduationCap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-extrabold text-sm tracking-tight text-sidebar-foreground">
              HUB de Estudos
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500">
              Alta Performance
            </span>
          </div>
        )}
      </div>

      {/* 2. SELETOR DO PLANO ATIVO */}
      <div className="p-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={planoAtivo ? `Plano Ativo: ${planoAtivo.nome}` : 'Visão Geral (Todos os Planos)'}
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-xl border border-sidebar-border bg-secondary/40 hover:bg-sidebar-accent transition-all text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
                collapsed && 'justify-center p-1.5'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm flex-shrink-0">
                {planoAtivo ? '🎯' : '🌐'}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-sidebar-foreground block truncate">
                      {planoAtivo ? planoAtivo.nome : 'Todos os Planos'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {planoAtivo
                        ? `${planoAtivo.disciplinaIds.length} disciplinas no plano`
                        : 'Visão Geral Unificada'}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-64 p-1.5 shadow-xl border-border">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
              Selecione o Plano de Estudo
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {planos.map((pl) => {
              const isSelected = planoAtivoId === pl.id;
              return (
                <DropdownMenuItem
                  key={pl.id}
                  onClick={() => {
                    alterarPlanoAtivo(pl.id);
                    toast.success(`Foco alterado para: ${pl.nome}`);
                  }}
                  className={cn(
                    'cursor-pointer flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg text-xs',
                    isSelected && 'bg-emerald-500/10 text-emerald-400 font-bold'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>🎯</span>
                    <div className="min-w-0">
                      <span className="block truncate">{pl.nome}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {pl.disciplinaIds.length} disciplinas • {pl.banca || pl.status}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                alterarPlanoAtivo('all');
                toast.success('Exibindo Visão Geral de todos os planos.');
              }}
              className={cn(
                'cursor-pointer flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg text-xs',
                planoAtivoId === 'all' && 'bg-emerald-500/10 text-emerald-400 font-bold'
              )}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Todos os Planos (Geral)</span>
              </div>
              {planoAtivoId === 'all' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <Link href="/guia-estudos" onClick={onNavigate}>
              <DropdownMenuItem className="cursor-pointer gap-2 text-xs py-2 text-emerald-500 font-semibold">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Gerenciar / Criar Planos</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 3. MENU DE NAVEGAÇÃO */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.name : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive
                    ? 'text-emerald-400'
                    : 'text-muted-foreground group-hover:text-sidebar-foreground'
                }`}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 4. RODAPÉ: PERFIL + TEMA */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar/50 space-y-2 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center w-full gap-2.5 p-1.5 rounded-xl transition-all hover:bg-sidebar-accent group focus:outline-none ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar className="h-8 w-8 border border-sidebar-border">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Avatar'} />
                <AvatarFallback className="bg-emerald-500/15 text-emerald-400 font-bold text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col text-left overflow-hidden min-w-0">
                  <span className="font-semibold text-xs truncate text-sidebar-foreground">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    @{user.email?.split('@')[0]}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 p-1.5 shadow-lg border-border">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5">
              Conectado como <strong className="text-foreground block truncate">{user.email}</strong>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/perfil" onClick={onNavigate}>
              <DropdownMenuItem className="cursor-pointer gap-2 text-xs py-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span>Gerenciar Perfil</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSignOut}
              className="cursor-pointer gap-2 text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da Conta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className={`flex items-center pt-1 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!collapsed && <span className="text-[11px] text-muted-foreground">Tema</span>}
          <ThemeSwitcher />
        </div>
      </div>

      {!isMobile && (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          className="hidden lg:flex absolute -right-3 top-6 z-40 items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-foreground hover:bg-accent shadow-sm transition-transform hover:scale-105"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}
    </aside>
  );
}