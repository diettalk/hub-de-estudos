// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";
import { NavItem } from "@/components/NavItem";

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

  console.log(
    `--- LAYOUT --- Sessão encontrada:`,
    session ? `UserID: ${session.user.id}` : "null"
  );

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">HUB Hélio</h1>
            <p className="text-sm text-gray-400">Sua Plataforma Centralizada para a Aprovação</p>
          </div>
          {session && <LogoutButton />}
        </header>
        
        {session && (
          <nav className="p-4 border-b border-gray-700">
            <ul className="flex space-x-4 overflow-x-auto">
              <NavItem href="/">Dashboard</NavItem>
              <NavItem href="/guia-estudos">Guia de Estudos</NavItem>
              <NavItem href="/disciplinas">Disciplinas</NavItem>
              <NavItem href="/ciclo">Ciclo de Estudos</NavItem>
              <NavItem href="/revisoes">Revisões</NavItem>
              <NavItem href="/documentos">Documentos</NavItem>
              <NavItem href="/tarefas">Tarefas</NavItem>
              {/* CORREÇÃO AQUI: A tag estava fechada como </aram> */}
              <NavItem href="/calendario">Calendário</NavItem>
            </ul>
          </nav>
        )}

        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}