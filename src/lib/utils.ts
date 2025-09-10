import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina nomes de classes do Tailwind CSS de forma inteligente,
 * prevenindo conflitos de estilo. Esta é a função base para
 * todos os componentes do shadcn/ui.
 * @param inputs - As classes a serem combinadas.
 * @returns Uma string com as classes combinadas e otimizadas.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Constrói uma árvore hierárquica a partir de uma lista plana de nós.
 * Usado para preparar os dados para os componentes de sidebar.
 * @param nodes - A lista de nós vinda da base de dados.
 * @returns Um array de nós de nível raiz, com os seus filhos aninhados.
 */
export function buildTree(nodes: any[]): any[] {
  const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [] }]));
  const tree: any[] = [];

  nodes.forEach(node => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id);
      parent?.children.push(nodeMap.get(node.id));
    } else {
      tree.push(nodeMap.get(node.id));
    }
  });

  // Garante a ordenação dos filhos em cada nível
  const sortChildren = (nodes: any[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };
  
  sortChildren(tree);

  return tree;
}
