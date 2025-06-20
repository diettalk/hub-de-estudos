// src/app/ciclo/page.tsx
import { CicloTable } from '@/components/CicloTable';

export default function CicloPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Ciclo de Estudos</h1>
      <CicloTable />
    </div>
  );
}