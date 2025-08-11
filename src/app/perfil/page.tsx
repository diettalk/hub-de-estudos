import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/ProfileForm'; // Vamos criar este componente a seguir
import { type Profile } from '@/lib/types'; // Vamos precisar de um tipo para o perfil

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
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, o que é normal para um novo usuário
    console.error('Erro ao buscar perfil:', error.message);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Seu Perfil</h1>
      <div className="max-w-2xl mx-auto">
        {/* Passamos os dados do usuário e do perfil para o formulário */}
        <ProfileForm user={user} profile={profile as Profile | null} />
      </div>
    </div>
  );
}
