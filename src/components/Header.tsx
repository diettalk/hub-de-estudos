// src/components/Header.tsx
import { AuthButton } from './AuthButton';

export function Header() {
  return (
    <header className="flex justify-between items-center mb-10 p-4 md:p-8">
      <div className="text-left">
        <h1 className="text-4xl md:text-5xl font-black text-white">HUB Hélio</h1>
        <p className="text-gray-400 mt-2 text-lg">Sua Plataforma Centralizada para a Aprovação</p>
      </div>
      <div>
        <AuthButton />
      </div>
    </header>
  );
}