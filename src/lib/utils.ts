import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Node } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A NOSSA FUNÇÃO CENTRAL PARA CONSTRUIR A ÁRVORE
// Ela é compatível com o seu tipo Node existente.
export const buildTree = (items: Omit<Node, 'children'>[]): Node[] => {
  const map = new Map<number, Node>();
  const roots: Node[] = [];
  
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach(item => {
    const node = map.get(item.id);
    if (node) {
      if (item.parent_id && map.has(item.parent_id)) {
        const parent = map.get(item.parent_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  return roots;
};
