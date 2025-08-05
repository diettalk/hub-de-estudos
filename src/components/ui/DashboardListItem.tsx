// src/components/ui/DashboardListItem.tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight } from 'lucide-react';

interface DashboardListItemProps {
  id: number;
  href: string;
  type: 'revisao' | 'tarefa';
  action: (id: number, status: boolean) => Promise<any>;
  children: React.ReactNode;
}

export function DashboardListItem({ id, href, type, action, children }: DashboardListItemProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Esta função é chamada quando a checkbox é marcada
  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      // 1. Chama a Server Action para atualizar o item no banco de dados
      const result = await action(id, checked);
      if (result?.error) {
        toast.error(result.error);
      } else {
        // 2. Mostra uma notificação de sucesso
        toast.success(`${type === 'revisao' ? 'Revisão' : 'Tarefa'} concluída!`);
        // 3. Atualiza a página para remover o item da lista
        router.refresh(); 
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-secondary group">
      <div className="flex items-center gap-3 flex-grow truncate">
        {/* A Checkbox que aciona a ação */}
        <Checkbox onCheckedChange={handleToggle} disabled={isPending} />
        <Link href={href} className="flex-grow truncate">
          <span className="text-sm">{children}</span>
        </Link>
      </div>
      <Link href={href} className="pl-2">
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </div>
  );
}
