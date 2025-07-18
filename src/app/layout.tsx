// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/LogoutButton";
import { NavItem } from "@/components/NavItem";
import { Toaster } from "sonner";

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
  // CORREÇÃO: Usando getUser() que é mais seguro e recomendado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        {/* Usamos a existência do 'user' para controlar a exibição */}
        {user && (
          <>
            <header className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">HUB Hélio</h1>
                <p className="text-sm text-gray-400">Sua Plataforma Centralizada para a Aprovação</p>
              </div>
              <LogoutButton />
            </header>
            
            <nav className="p-4 border-b border-gray-700">
              <ul className="flex space-x-4 overflow-x-auto">
                <NavItem href="/">Dashboard</NavItem>
                <NavItem href="/guia-estudos">Guia de Estudos</NavItem>
                <NavItem href="/disciplinas">Disciplinas</NavItem>
                <NavItem href="/ciclo">Ciclo de Estudos</NavItem>
                <NavItem href="/revisoes">Revisões</NavItem>
                <NavItem href="/documentos">Documentos</NavItem>
                <NavItem href="/tarefas">Tarefas</NavItem>
                <NavItem href="/calendario">Calendário</NavItem>
              </ul>
            </nav>
          </>
        )}

        <main className="p-6">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}