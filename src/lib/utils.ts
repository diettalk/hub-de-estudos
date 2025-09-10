import { type Node } from '@/lib/types';

// A sua função existente para construir a árvore
export const buildTree = (items: Node[]): Node[] => {
    const map = new Map<number | string, Node>();
    const roots: Node[] = [];
    
    // Primeiro, cria um mapa de todos os itens e inicializa a propriedade 'children'
    items.forEach(item => {
        map.set(item.id, { ...item, children: [] });
    });

    // Agora, constrói a árvore
    items.forEach(item => {
        const node = map.get(item.id);
        if (node) {
            if (item.parent_id && map.has(item.parent_id)) {
                const parent = map.get(item.parent_id)!;
                // Garante que o array de filhos exista antes de adicionar
                if (Array.isArray(parent.children)) {
                    parent.children.push(node);
                } else {
                    parent.children = [node];
                }
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

// NOVO: Função para encontrar o caminho de um nó na árvore
export function findNodePath(nodes: Node[], nodeId: string | number): Node[] {
  const targetId = String(nodeId);
  
  function search(currentPath: Node[], currentNodes: Node[]): Node[] | null {
    for (const node of currentNodes) {
      const newPath = [...currentPath, node];
      if (String(node.id) === targetId) {
        return newPath;
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        const foundPath = search(newPath, node.children);
        if (foundPath) {
          return foundPath;
        }
      }
    }
    return null;
  }
  
  return search([], nodes) || [];
}
