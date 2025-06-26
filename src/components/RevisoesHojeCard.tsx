// src/components/RevisoesHojeCard.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// import Link from 'next/link'; // REMOVIDO

export async function RevisoesHojeCard() {
    const supabase = createServerComponentClient({ cookies });
    const today = new Date().toISOString().split('T')[0];
    
    // CORREÇÃO: a variável 'error' foi removida da desestruturação
    const { data: revisoes } = await supabase
        .from('sessoes_estudo')
        .select('id, foco')
        .or(`(data_revisao_1.eq.${today},r1_concluida.is.false),(data_revisao_2.eq.${today},r2_concluida.is.false),(data_revisao_3.eq.${today},r3_concluida.is.false)`);
    return (
        <div className="card bg-gray-800 p-6">
            <h3 className="font-bold text-xl mb-4">
                <i className="fas fa-brain text-yellow-500 mr-2"></i>
                Revisões para Hoje ({revisoes?.length || 0})
            </h3>
            {revisoes && revisoes.length > 0 ? (
                <ul className="space-y-2">
                    {revisoes.map(item => (
                        <li key={item.id} className="text-sm p-2 bg-gray-700/50 rounded-md">
                            {item.foco}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-400">Nenhuma revisão agendada para hoje. Bom trabalho!</p>
            )}
        </div>
    );
}