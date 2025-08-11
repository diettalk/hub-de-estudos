'use client';

import { useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/app/actions'; // Vamos criar esta action a seguir
import { toast } from 'sonner';
import Image from 'next/image';
import { type Profile } from '@/lib/types';

interface ProfileFormProps {
  user: User;
  profile: Profile | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const supabase = createClientComponentClient();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);

  // Função para lidar com o upload do avatar
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você precisa de selecionar uma imagem para o upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }
      
      // Obtém a URL pública da imagem recém-enviada
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      toast.success('Avatar atualizado! Salve o perfil para confirmar.');

    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Erro no upload do avatar: ${error.message}`);
      } else {
        toast.error('Ocorreu um erro desconhecido durante o upload.');
      }
    } finally {
      setUploading(false);
    }
  };
  
  // Função para salvar o perfil completo
  const handleUpdateProfile = () => {
    startTransition(async () => {
      const result = await updateProfile({
        id: user.id,
        fullName,
        avatarUrl,
      });

      if (result?.error) {
        toast.error(`Falha ao atualizar perfil: ${result.error}`);
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="relative">
            <Image
                src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.email}`}
                alt="Avatar"
                width={80}
                height={80}
                className="rounded-full bg-secondary object-cover"
            />
        </div>
        <div>
            <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary hover:underline">
                {uploading ? 'A enviar...' : 'Alterar foto'}
            </Label>
            <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
            />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={user.email ?? ''} disabled />
        <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome de Exibição</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <Button onClick={handleUpdateProfile} disabled={isPending}>
          {isPending ? 'A salvar...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}
