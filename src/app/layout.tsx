// src/app/layout.tsx - VERSÃO DE TESTE PARA ISOLAR O ERRO

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Temporariamente não vamos importar os componentes para o teste
// import { LogoutButton } from "@/components/LogoutButton";
// import { NavItem } from "@/components/NavItem";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HUB Hélio",
  description: "Sua Plataforma Centralizada para a Aprovação",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">HUB Hélio</h1>
            <p className="text-sm text-gray-400">Sua Plataforma Centralizada para a Aprovação</p>
          </div>
          
          {/* TESTE: Em vez de renderizar o botão, vamos apenas renderizar um texto simples */}
          {session && (
            <div className="text-green-400 font-bold">SESSÃO ATIVA</div>
          )}
        </header>
        
        {/* TESTE: A barra de navegação inteira foi desabilitada temporariamente */}
        {/* {session && (
          <nav className="p-4 border-b border-gray-700">
            <ul className="flex space-x-4 overflow-x-auto">
              <NavItem href="/">Dashboard</NavItem>
              ...
            </ul>
          </nav>
        )} */}

        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}