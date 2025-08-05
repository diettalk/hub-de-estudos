// src/components/MainSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

// 1. IMPORTAR OS NOVOS COMPONENTES E ÍCONES NECESSÁRIOS
import {
    LayoutDashboard, BookOpen, PenSquare, Recycle, ListTodo, Calendar,
    ChevronsLeft, ChevronsRight, FileText, BrainCircuit, User as UserIcon, LogOut
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from './ui/button';


// O array de navegação principal continua o mesmo
const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Guia de Estudos', href: '/guia-estudos', icon: BookOpen },
    { name: 'Disciplinas', href: '/disciplinas', icon: PenSquare },
    { name: 'Ciclo de Estudos', href: '/ciclo', icon: Recycle },
    { name: 'Revisões', href: '/revisoes', icon: ListTodo },
    { name: 'Documentos', href: '/documentos', icon: FileText },
    { name: 'Gerador Anki', href: '/anki', icon: BrainCircuit },
    { name: 'Tarefas', href: '/tarefas', icon: ListTodo },
    { name: 'Calendário', href: '/calendario', icon: Calendar },
];

// 2. DEFINIR AS PROPS E A ESTRUTURA DOS DADOS DO PERFIL
interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface MainSidebarProps {
  user: User;
  profile: Profile | null;
}

export function MainSidebar({ user, profile }: MainSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    // Função para pegar as iniciais do nome ou email
    const getInitials = () => {
        if (profile?.full_name) {
            const names = profile.full_name.split(' ');
            return names.map(n => n[0]).join('').toUpperCase();
        }
        return user.email?.[0].toUpperCase() || 'U';
    };

    return (
        <aside className={`relative flex flex-col h-screen bg-[oklch(var(--sidebar))] border-r border-border transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            
            {/* 3. SUBSTITUIR O CABEÇALHO ANTIGO PELO NOVO MENU DE PERFIL */}
            <div className={`flex items-center h-20 px-4 border-b border-border`}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={`flex items-center w-full gap-3 text-left p-2 rounded-lg transition-colors hover:bg-[oklch(var(--sidebar-accent))]`}>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Avatar'} />
                                <AvatarFallback>{getInitials()}</AvatarFallback>
                            </Avatar>
                            <div className={`flex flex-col overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                                <span className="font-semibold text-sm truncate">{profile?.full_name || user.email}</span>
                                <span className="text-xs text-muted-foreground">Ver perfil</span>
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/perfil">
                            <DropdownMenuItem className="cursor-pointer">
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Gerenciar Perfil</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <form action="/auth/sign-out" method="post" className="w-full">
                           <DropdownMenuItem asChild>
                             <button type="submit" className="w-full cursor-pointer">
                               <LogOut className="mr-2 h-4 w-4" />
                               <span>Sair</span>
                             </button>
                           </DropdownMenuItem>
                        </form>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <nav className="flex-grow p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href} title={item.name}
                            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-[oklch(var(--sidebar-primary))] text-[oklch(var(--sidebar-primary-foreground))]' : 'text-muted-foreground hover:text-foreground hover:bg-[oklch(var(--sidebar-accent))]'}`}
                        >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* 4. REMOVER A SEÇÃO DE PERFIL E LOGOUT ANTIGA DO RODAPÉ */}
            <div className={`p-4 border-t border-border mt-auto flex ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
                <ThemeSwitcher />
            </div>

            <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-8 bg-secondary hover:bg-primary text-secondary-foreground hover:text-primary-foreground rounded-full p-1.5 border">
                {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
        </aside>
    );
}