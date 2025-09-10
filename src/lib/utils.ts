import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Node } from '@/lib/types'; // Adicionei a importação do tipo Node aqui

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildTree(nodes: Node[]): Node[] {
  const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [] }]));
  const tree: Node[] = [];

  nodes.forEach(node => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id);
      parent?.children.push(nodeMap.get(node.id)!);
    } else {
      tree.push(nodeMap.get(node.id)!);
    }
  });

  // A ordenação pode ser complexa, vamos manter a lógica de build simples por agora
  return tree;
}

