'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  BookOpen,
  PenSquare,
  Recycle,
  ListTodo,
  Calendar,
  BrainCircuit,
  NotebookPen,
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap
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

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Guia de Estudos', href: '/guia-estudos', icon: BookOpen },
  { name: 'Disciplinas', href: '/disciplinas', icon: PenSquare },
  { name: 'Ciclo de Estudos', href: '/ciclo', icon: Recycle },
  { name: 'Revisões', href: '/revisoes', icon: ListTodo },
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
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // No mobile, a sidebar nunca fica em formato ícone colapsado
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
      {/* TOPO: LOGO DO HUB */}
      <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed ? 'justify-center' : 'justify-start gap-3'}`}>
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm flex-shrink-0">
          <GraduationCap className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm tracking-tight text-sidebar-foreground">HUB de Estudos</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Plataforma</span>
          </div>
        )}
      </div>

      {/* PERFIL DO USUÁRIO */}
      <div className={`p-3 border-b border-sidebar-border bg-sidebar/50`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center w-full gap-3 p-2 rounded-xl transition-all hover:bg-sidebar-accent group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar className="h-9 w-9 border border-sidebar-border shadow-xs">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Avatar'} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col text-left overflow-hidden min-w-0">
                  <span className="font-medium text-xs truncate text-sidebar-foreground group-hover:text-primary transition-colors">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {user.email}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56 p-1.5 shadow-lg border-border">
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
      </div>

      {/* NAVEGAÇÃO DOS MÓDULOS */}
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
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'
                }`}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}

              {/* Indicador sutil de página ativa */}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/80 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* RODAPÉ: THEME SWITCHER */}
      <div className={`p-3 border-t border-sidebar-border mt-auto flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="text-xs text-muted-foreground pl-1">Tema da Interface</span>}
        <ThemeSwitcher />
      </div>

      {/* BOTÃO DE COLAPSAR (Apenas no desktop) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          className="hidden lg:flex absolute -right-3 top-8 z-40 items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-foreground hover:bg-accent shadow-sm transition-transform hover:scale-105"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}
    </aside>
  );
}