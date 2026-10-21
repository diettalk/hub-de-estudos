// src/components/NavItem.tsx

'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItemProps = {
  href: string;
  children: React.ReactNode;
};

export function NavItem({ href, children }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li>
      <Link
        href={href}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-gray-700 text-white"
            : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}