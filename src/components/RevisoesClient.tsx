// src/components/RevisoesClient.tsx
'use client';

import { useState } from 'react';
import { type Revisao } from '@/lib/types';
import { RevisaoCard } from './RevisaoCard';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface RevisoesClientProps {
  atrasadas: Revisao[];
  paraHoje: Revisao[];
  proximos7Dias: Revisao[];
  concluidas: Revisao[];
  debug: Revisao[];
}

type Tab = 'atrasadas' | 'hoje' | 'proximos';

export function RevisoesClient({ atrasadas, paraHoje, proximos7Dias, concluidas, debug }: RevisoesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('hoje');

  const tabs: { id: Tab; label: string; data: Revisao[]; count: number }[] = [
    { id: 'atrasadas', label: 'Atrasadas', data: atrasadas, count: atrasadas.length },
    { id: 'hoje', label: 'Para Hoje', data: paraHoje, count: paraHoje.length },
    { id: 'proximos', label: 'Próximos 7 Dias', data: proximos7Dias, count: proximos7Dias.length },
  ];

  const renderContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab)?.data;
    if (!activeTabData || activeTabData.length === 0) {
      return <p className="text-muted-foreground text-center mt-8">Nenhuma revisão nesta categoria.</p>;
    }
    return (
      <div className="space-y-3">
        {activeTabData.map(revisao => <RevisaoCard key={revisao.id} revisao={revisao} />)}
      </div>
    );
  };

  return (
    <div>
      <div className="border-b border-border mb-4">
        <div className="flex space-x-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label} <span className="bg-secondary text-secondary-foreground text-xs font-bold rounded-full px-2 py-0.5 ml-1">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>{renderContent()}</div>

      <Accordion type="single" collapsible className="w-full mt-8">
        <AccordionItem value="concluidas">
          <AccordionTrigger>Revisões Concluídas ({concluidas.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 mt-4">
              {concluidas.length > 0 ? (
                concluidas.map(revisao => <RevisaoCard key={revisao.id} revisao={revisao} />)
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma revisão concluída ainda.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="debug">
          <AccordionTrigger>DEBUG: Todas as Revisões ({debug.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 mt-4">
              {debug.map(revisao => <RevisaoCard key={revisao.id} revisao={revisao} />)}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
