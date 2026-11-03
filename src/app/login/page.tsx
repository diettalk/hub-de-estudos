'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  Github,
  Sparkles,
  ShieldCheck,
  BarChart3,
  BrainCircuit,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Informe o seu e-mail.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/perfil`,
        });
        if (error) throw error;
        toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setMode('login');
        return;
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          setIsLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim() || email.split('@')[0],
            updated_at: new Date().toISOString(),
          });
        }

        toast.success('Conta criada com sucesso! Bem-vindo ao HUB de Estudos.');
        router.push('/');
        router.refresh();
        return;
      }

      // Modo Login
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Falha na autenticação. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-background text-foreground">
      {/* COLUNA ESQUERDA: APRESENTAÇÃO DA PLATAFORMA */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 bg-card border-r border-border relative overflow-hidden">
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight block leading-none">
              HUB de Estudos
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">
              Plataforma de Alta Performance
            </span>
          </div>
        </div>

        <div className="space-y-8 max-w-xl z-10 my-auto">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Ambiente Individual & 100% Privado
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Planeje, estude, revise e acompanhe sua evolução até a aprovação.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada estudante possui seu próprio espaço isolado com planos de estudo, ciclos inteligentes, caderno de resumos, flashcards com IA e estatísticas em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1.5">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xs font-bold">Planos, Ciclos & Estatísticas</h3>
              <p className="text-[11px] text-muted-foreground">
                Distribuição automática por peso das matérias e revisões escalonadas até a prova.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1.5">
              <BrainCircuit className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xs font-bold">Cadernos, Erros & Anki IA</h3>
              <p className="text-[11px] text-muted-foreground">
                Transforme seus resumos em flashcards automaticamente e domine suas falhas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground z-10">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Protegido com criptografia e isolamento individual de dados (Row Level Security).</span>
        </div>
      </div>

      {/* COLUNA DIREITA: CARD DE LOGIN E CADASTRO */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Logo visível no mobile */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg">HUB de Estudos</span>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xl space-y-6">
            {/* Abas Entrar vs Criar Conta */}
            {mode !== 'forgot' ? (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-secondary/60 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={cn(
                    'py-2 rounded-lg font-bold transition-all',
                    mode === 'login'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Entrar na Conta
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={cn(
                    'py-2 rounded-lg font-bold transition-all',
                    mode === 'signup'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Criar Nova Conta
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-extrabold">Recuperar Senha</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Informe seu e-mail para receber o link de redefinição.
                </p>
              </div>
            )}

            {/* Formulário de E-mail e Senha */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Seu Nome</label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex.: Hélio Tavares"
                      className="h-10 pl-10 text-xs bg-secondary/30 rounded-xl"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold block">E-mail</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-10 pl-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold">Senha</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-emerald-500 hover:underline font-medium"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 pl-10 text-xs bg-secondary/30 rounded-xl"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2 shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Acessar Plataforma'
                        : mode === 'signup'
                        ? 'Criar Minha Conta'
                        : 'Enviar Link de Recuperação'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {mode === 'forgot' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('login')}
                  className="w-full h-9 text-xs rounded-xl"
                >
                  Voltar para o Login
                </Button>
              )}
            </form>

            {mode !== 'forgot' && (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-border w-full" />
                  <span className="bg-card px-3 text-[11px] text-muted-foreground uppercase font-semibold">
                    ou continue com
                  </span>
                  <div className="border-t border-border w-full" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleOAuthLogin('google')}
                    className="h-10 rounded-xl text-xs font-bold gap-2 bg-secondary/20"
                  >
                    <Mail className="w-4 h-4 text-rose-400" />
                    <span>Google</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleOAuthLogin('github')}
                    className="h-10 rounded-xl text-xs font-bold gap-2 bg-secondary/20"
                  >
                    <Github className="w-4 h-4" />
                    <span>GitHub</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
