// src/components/Navbar.tsx

'use client'; // 1. Ordem principal: "Este componente roda no navegador".

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // 2. Importamos a ferramenta para ler a URL.

const tabs = [
  // Atenção: Mudei o link do Dashboard para a página inicial "/"
  { name: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
  { name: 'Guia de Estudos', href: '/materiais', icon: 'fas fa-hdd' },
  { name: 'Ciclo de Estudos', href: '/ciclo', icon: 'fas fa-sync-alt' },
  { name: 'Revisões', href: '/revisoes', icon: 'fas fa-brain' },
  { name: 'Documentos', href: '/documentos', icon: 'fas fa-book-open' },
];

export function Navbar() {
  // 3. Usamos a ferramenta para pegar a URL atual. Ex: '/ciclo'
  const pathname = usePathname(); 

  return (
    <div className="border-b border-gray-700">
      <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
        {tabs.map((tab) => {
          // 4. Verificamos se o link da aba é o mesmo da URL atual.
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              // 5. A mágica acontece aqui!
              // Usamos uma lógica para mudar a cor se a aba estiver ativa.
              className={
                isActive
                  ? 'text-blue-400 border-blue-400 py-4 px-6 border-b-2 font-bold text-sm'
                  : 'text-gray-400 hover:text-white hover:border-gray-300 py-4 px-6 border-b-2 font-medium text-sm transition-colors'
              }
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}