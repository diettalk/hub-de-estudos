import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Node } from '@/lib/types'; // Adicionei a importação do tipo Node aqui

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildTree(nodes: Node[]): Node[] {
  const nodeMap = new Map<number, Node>();
  nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [] }));
  const tree: Node[] = [];

  nodes.forEach(node => {
    const current = nodeMap.get(node.id);
    const parent = node.parent_id ? nodeMap.get(node.parent_id) : undefined;
    if (parent && current) {
      parent.children.push(current);
    } else if (current) {
      tree.push(current);
    }
  });

  // A ordenação pode ser complexa, vamos manter a lógica de build simples por agora
  return tree;
}
