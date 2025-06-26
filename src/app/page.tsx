// src/app/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateAnotacoesRapidas } from '@/app/actions';

// --- COMPONENTES DO DASHBOARD ---

function ProximaMissaoCard() {
  const [missao, setMissao] = useState<{ hora_no_ciclo: number, foco: string } | null>(null);
  const supabase = createClientComponentClient();
  useEffect(() => {
    const getMissao = async () => {
      const { data } = await supabase.from('sessoes_estudo').select('hora_no_ciclo, foco').eq('concluido', false).order('hora_no_ciclo').limit(1).single();
      setMissao(data);
    };
    getMissao();
  }, [supabase]);

  return (
    <div className="card bg-blue-900/50 border border-blue-800 p-6 h-full">
      <h3 className="font-bold text-xl text-blue-300 mb-2"><i className="fas fa-bullseye mr-2"></i>Sua Próxima Missão</h3>
      {missao ? (
        <>
          <p className="text-lg text-white"><strong>Hora {missao.hora_no_ciclo}:</strong> {missao.foco}</p>
          <a href="/ciclo"><Button className="mt-4">Ir para o Ciclo</Button></a>
        </>
      ) : <p className="text-lg text-green-400">Parabéns, ciclo concluído!</p>}
    </div>
  );
}

function RevisoesHojeCard() {
  const [revisoes, setRevisoes] = useState<any[]>([]);
  const supabase = createClientComponentClient();
  useEffect(() => {
    const getRevisoes = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('sessoes_estudo').select('id, foco').or(`(data_revisao_1.eq.${today},r1_concluida.is.false),(data_revisao_2.eq.${today},r2_concluida.is.false),(data_revisao_3.eq.${today},r3_concluida.is.false)`);
      setRevisoes(data || []);
    };
    getRevisoes();
  }, [supabase]);

  return (
    <div className="card bg-gray-800 p-6">
      <h3 className="font-bold text-xl mb-4"><i className="fas fa-brain text-yellow-500 mr-2"></i>Revisões para Hoje ({revisoes.length})</h3>
      {revisoes.length > 0 ? (
        <ul className="space-y-2">{revisoes.map(item => <li key={item.id} className="text-sm p-2 bg-gray-700/50 rounded-md">{item.foco}</li>)}</ul>
      ) : <p className="text-sm text-gray-400">Nenhuma revisão agendada para hoje. Bom trabalho!</p>}
    </div>
  );
}

function AnotacoesRapidasCard() {
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();
  
  useEffect(() => {
      const getNotes = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if(user) {
            const { data: perfil } = await supabase.from('perfis').select('anotações_rapidas').eq('id', user.id).single();
            setContent(perfil?.anotações_rapidas || '');
          }
      };
      getNotes();
  }, [supabase]);

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => { updateAnotacoesRapidas(content); });
    }, 1500);
    return () => { clearTimeout(handler); };
  }, [content]);

  return (
    <div className="card bg-gray-800 p-6">
      <h3 className="text-xl font-bold mb-4">Anotações Rápidas</h3>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md h-24 border-gray-600" placeholder="Anote seus insights e eles serão salvos automaticamente..."/>
    </div>
  );
}

function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialTime, setInitialTime] = useState(25);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            if(interval) clearInterval(interval);
            setIsActive(false);
            alert("Pomodoro concluído!");
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      setIsActive(false);
    }
    return () => { if(interval) clearInterval(interval); };
  }, [isActive, seconds, minutes]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setMinutes(initialTime); setSeconds(0); };
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10);
    if (!isNaN(newTime) && newTime > 0) { setInitialTime(newTime); setMinutes(newTime); }
  }

  return (
    <div className="card bg-gray-800 p-6 flex flex-col items-center justify-center">
      <h3 className="text-xl font-bold mb-4">Área de Foco (Pomodoro)</h3>
      <div className="text-6xl text-center font-bold p-6 bg-red-800/80 rounded-lg w-full">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="flex gap-4 mt-4">
        <Button onClick={toggleTimer}>{isActive ? 'Pausar' : 'Iniciar'}</Button>
        <Button onClick={resetTimer} variant="secondary">Resetar</Button>
        <Button onClick={() => setIsEditing(!isEditing)} variant="ghost" size="icon"><i className="fas fa-cog"></i></Button>
      </div>
      {isEditing && (
        <div className="flex items-center gap-2 mt-4">
          <Input type="number" value={initialTime} onChange={handleTimeChange} className="w-24 bg-gray-700"/>
          <Label>minutos</Label>
        </div>
      )}
    </div>
  );
}

// --- PÁGINA PRINCIPAL DO DASHBOARD ---
export default function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <ProximaMissaoCard />
        <RevisoesHojeCard />
        <AnotacoesRapidasCard />
      </div>
      <div className="lg:col-span-1 space-y-8">
        <div className="card text-center bg-gray-800 p-6">
            <h3 className="text-xl font-bold mb-2">🔥 Ofensiva</h3>
            <p className="text-5xl font-black text-orange-500">0</p>
            <p className="text-sm text-gray-500">dias de estudo seguidos</p>
        </div>
        <PomodoroTimer />
      </div>
    </div>
  );
}