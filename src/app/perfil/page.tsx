import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Busca os dados da tabela 'profiles' que criamos
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    // ALTERAÇÃO: Trocado .single() por .maybeSingle()
    // .maybeSingle() retorna o registro se existir, ou null se não existir, mas NUNCA causa um erro.
    .maybeSingle();

  // Com .maybeSingle(), este erro específico não deve mais acontecer,
  // mas deixamos o log para capturar outros possíveis problemas de banco de dados.
  if (error) {
    console.error('Erro ao buscar perfil:', error.message);
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Seu Perfil</h1>
      <div className="bg-card border rounded-lg p-6">
        {/* Passamos os dados do usuário e do perfil para o formulário */}
        <ProfileForm user={user} profile={profile} />
      </div>
    </div>
  );
}