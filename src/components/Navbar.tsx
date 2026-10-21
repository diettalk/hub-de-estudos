// src/components/Navbar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { name: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
    { name: 'Guia de Estudos', href: '/materiais', icon: 'fas fa-book-open' },
    { name: 'Disciplinas', href: '/disciplinas', icon: 'fas fa-sitemap' },
    { name: 'Ciclo de Estudos', href: '/ciclo', icon: 'fas fa-sync-alt' },
    { name: 'Revisões', href: '/revisoes', icon: 'fas fa-brain' },
    { name: 'Documentos', href: '/documentos', icon: 'fas fa-folder-open' },
    { name: 'Tarefas', href: '/tarefas', icon: 'fas fa-tasks' }, // NOVO
    { name: 'Calendário', href: '/calendario', icon: 'fas fa-calendar-alt' }, // NOVO
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <div className="border-b border-gray-700">
      <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link key={tab.name} href={tab.href} className={ isActive ? 'text-blue-400 border-blue-400 py-4 px-6 border-b-2 font-bold text-sm' : 'text-gray-400 hover:text-white hover:border-gray-300 py-4 px-6 border-b-2 font-medium text-sm transition-colors'}>
              <i className={`${tab.icon} mr-2`}></i>{tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}