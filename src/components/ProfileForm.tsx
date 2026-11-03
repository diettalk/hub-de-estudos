'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  Camera,
  Lock,
  Check,
  Loader2,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function ProfileForm({
  user,
  profile,
}: {
  user: User;
  profile: Profile | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);

  // Alteração de senha
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl);
        toast.success('Foto carregada! Clique em Salvar Perfil para confirmar.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({
        id: user.id,
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Perfil atualizado com sucesso!');
        router.refresh();
      }
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com segurança!');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar a senha.');
    } finally {
      setChangingPassword(false);
    }
  };

  const displayAvatar =
    avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.email}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Meu Perfil & Segurança
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Gerencie seus dados pessoais, foto de exibição e credenciais de acesso
        </p>
      </div>

      {/* CARD 1: DADOS DO PERFIL E FOTO */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-border/60">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-secondary flex-shrink-0">
            {/* Usamos img nativo para aceitar qualquer URL do Supabase ou externa sem erro de next/image */}
            <img
              src={displayAvatar}
              alt="Avatar do Usuário"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-foreground">
                {fullName || user.email?.split('@')[0]}
              </h2>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                Conta Privada Ativa
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </p>
            <div className="pt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold cursor-pointer transition-colors">
                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                <span>{uploading ? 'Enviando foto...' : 'Enviar Nova Foto'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAvatar}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome Completo / Exibição</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome..."
              className="h-10 text-xs bg-secondary/30 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL de Avatar (Opcional)</Label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="h-10 text-xs bg-secondary/30 rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || uploading}
            className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Salvar Perfil</span>
          </Button>
        </div>
      </form>

      {/* CARD 2: ALTERAR SENHA E SEGURANÇA */}
      <form
        onSubmit={handleUpdatePassword}
        className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>Segurança & Senha de Acesso</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina ou atualize sua senha para entrar direto com seu e-mail
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3 pt-2">
          <div className="w-full sm:flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Nova Senha (mínimo 6 caracteres)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha..."
              className="h-10 text-xs bg-secondary/30 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={changingPassword || !newPassword}
            variant="outline"
            className="h-10 px-5 text-xs font-bold rounded-xl"
          >
            {changingPassword ? 'Atualizando...' : 'Atualizar Senha'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProfileForm;
