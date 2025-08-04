// src/components/MainSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
// ADICIONE O ÍCONE BrainCircuit
import { LayoutDashboard, BookOpen, PenSquare, Recycle, ListTodo, Calendar, ChevronsLeft, ChevronsRight, FileText, BrainCircuit } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LogoutButton } from './LogoutButton';

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Guia de Estudos', href: '/guia-estudos', icon: BookOpen },
    { name: 'Disciplinas', href: '/disciplinas', icon: PenSquare },
    { name: 'Ciclo de Estudos', href: '/ciclo', icon: Recycle },
    // ADICIONE A NOVA LINHA AQUI
    { name: 'Gerador Anki', href: '/anki', icon: BrainCircuit },
    { name: 'Revisões', href: '/revisoes', icon: ListTodo },
    { name: 'Documentos', href: '/documentos', icon: FileText },
    { name: 'Tarefas', href: '/tarefas', icon: ListTodo },
    { name: 'Calendário', href: '/calendario', icon: Calendar },
];

export function MainSidebar() {
  // ... (o resto do seu componente MainSidebar continua igual)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`relative flex flex-col h-screen bg-[oklch(var(--sidebar))] border-r border-border transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center h-16 px-6 border-b border-border ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <span className={`font-bold text-lg whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>HUB Hélio</span>
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

      <div className={`p-4 border-t border-border mt-auto flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={isCollapsed ? 'hidden' : ''}><LogoutButton /></div>
        <ThemeSwitcher />
      </div>

       <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-8 bg-secondary hover:bg-primary text-secondary-foreground hover:text-primary-foreground rounded-full p-1.5 border">
          {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
       </button>
    </aside>
  );
}
