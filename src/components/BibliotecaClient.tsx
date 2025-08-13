'use client';

import { updateResourceContent } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText } from 'lucide-react';

interface Resource {
  id: number;
  title: string;
  type: 'link' | 'pdf' | 'folder';
  content: {
    url?: string;
    description?: string;
    pdf_url?: string;
  };
}

interface BibliotecaClientProps {
  resource: Resource | null;
}

// CORREÇÃO: A palavra-chave 'default' é essencial para que a importação na página funcione corretamente.
export default function BibliotecaClient({ resource }: BibliotecaClientProps) {
  
  if (!resource || resource.type === 'folder') {
    return (
      <div className="flex items-center justify-center h-full bg-card border rounded-lg">
        <p className="text-muted-foreground">Selecione um recurso para ver os detalhes.</p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newContent = {
      url: formData.get('url') as string,
      description: formData.get('description') as string,
      pdf_url: resource.content?.pdf_url || '',
    };
    await updateResourceContent(resource.id, newContent);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {resource.type === 'link' ? <ExternalLink size={20} /> : <FileText size={20} />}
          {resource.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {resource.type === 'link' && (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-muted-foreground mb-1">URL do Link</label>
              <Input
                id="url"
                name="url"
                defaultValue={resource.content?.url || ''}
                placeholder="https://exemplo.com"
              />
            </div>
          )}
          {resource.type === 'pdf' && resource.content?.pdf_url && (
             <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Ficheiro PDF:</p>
                <a href={resource.content.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {resource.content.pdf_url.split('/').pop()}
                </a>
             </div>
          )}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">Descrição</label>
            <Textarea
              id="description"
              name="description"
              defaultValue={resource.content?.description || ''}
              placeholder="Adicione uma breve descrição sobre este recurso..."
              rows={5}
            />
          </div>
          <Button type="submit">Guardar Alterações</Button>
        </form>
      </CardContent>
    </Card>
  );
}
