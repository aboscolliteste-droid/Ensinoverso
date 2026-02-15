
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Lesson, LessonWithQuestions, Resultado } from '../../types';
import { LessonService } from '../../services/LessonService';
import { UserService } from '../../services/UserService';

export const AlunoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [results, setResults] = useState<Resultado[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithQuestions | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentResult, setCurrentResult] = useState<Resultado | null>(null);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLessons(await LessonService.listForStudent(user.turmas));
    setResults(await LessonService.getResultsByStudent(user.id));
    setAllUsers(await UserService.listAll());
  };

  const openLesson = async (id: string) => {
    const full = await LessonService.getById(id);
    if (full) {
      const existingResult = results.find(r => r.aulaId === id);
      setSelectedLesson(full);
      setFullName(user?.nome || ''); 
      
      if (existingResult) {
        setQuizFinished(true);
        setCurrentResult(existingResult);
      } else {
        setAnswers({});
        setQuizFinished(false);
        setCurrentResult(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = async () => {
    if (!selectedLesson || !user) return;
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      return alert("Por favor, insira seu NOME COMPLETO para enviar a atividade.");
    }

    const detalhes = selectedLesson.questoes.map((q, i) => answers[i] === q.respostaCorreta);
    const scoreValue = detalhes.filter(Boolean).length;
    const result = await LessonService.saveResult(user.id, selectedLesson.id, scoreValue, selectedLesson.questoes.length, detalhes);
    
    setQuizFinished(true);
    setCurrentResult(result);
    await loadData();
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const pendingLessons = lessons.filter(l => !results.some(r => r.aulaId === l.id));
  const completedLessons = lessons.filter(l => results.some(r => r.aulaId === l.id));

  return (
    <div className="relative pb-32 text-white">
      {selectedLesson ? (
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-5xl mx-auto">
          <article className="glass p-12 rounded-[60px] mb-16 shadow-2xl border-white/30">
            <header className="mb-12 text-center">
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <span className="text-[9px] font-black bg-white/20 px-3 py-1 rounded-full uppercase text-white shadow-sm border border-white/10">{selectedLesson.escola}</span>
                <span className="text-[9px] font-black bg-orange-600 px-3 py-1 rounded-full uppercase text-white shadow-sm">{selectedLesson.componenteCurricular}</span>
              </div>
              <h1 className="text-6xl font-extrabold tracking-tighter mb-6 uppercase italic leading-none text-white text-shadow-md">{selectedLesson.titulo}</h1>
              <div className="w-32 h-2 bg-orange-600 mx-auto rounded-full"></div>
            </header>
            <div className="text-xl text-white font-medium leading-[1.8] space-y-8">{selectedLesson.texto.split('\n').map((p, i) => <p key={i}>{p}</p>)}</div>
          </article>

          {quizFinished && currentResult ? (
            <div className="space-y-12 pb-20">
              <div className="glass p-16 rounded-[60px] text-center border-orange-600 border-4 animate-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-3xl font-black uppercase text-white mb-4">Feedback de Desempenho</h3>
                <p className="text-white/70 uppercase font-black text-xs mb-8 tracking-widest">Atividade Concluída</p>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[120px] font-black text-white leading-none text-shadow-lg">
                    {Math.round((currentResult.acertos / currentResult.total) * 100)}%
                  </span>
                  <p className="text-2xl font-bold text-orange-500 mt-4">
                    {currentResult.acertos} de {currentResult.total} ACERTOS
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={() => { setSelectedLesson(null); setCurrentResult(null); }} 
                  className="bg-white text-black px-16 py-6 rounded-3xl text-sm font-black uppercase hover:bg-orange-600 hover:text-white transition-all shadow-xl"
                >
                  VOLTAR PARA O DASHBOARD
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {selectedLesson.questoes.map((q, i) => (
                <div key={q.id} className="glass p-10 rounded-[40px] border-white/30 shadow-xl">
                  <p className="text-2xl font-bold mb-10 leading-snug text-white"><span className="bg-orange-600 text-white px-4 py-1 rounded-2xl mr-4 text-lg font-black">#{i + 1}</span>{q.pergunta}</p>
                  <div className="grid grid-cols-1 gap-4">
                    {q.alternativas.map((alt, altIdx) => (
                      <button 
                        key={altIdx} 
                        onClick={() => setAnswers(prev => ({ ...prev, [i]: altIdx }))} 
                        className={`text-left p-6 rounded-3xl border-2 transition-all text-base font-bold ${answers[i] === altIdx ? "bg-orange-600 border-orange-500 text-white shadow-xl" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}`}
                      >
                        <span className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center float-left mr-5 text-sm font-black uppercase text-white">{String.fromCharCode(65 + altIdx)}</span>{alt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="glass p-12 rounded-[50px] border-white/20 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-widest text-orange-500">Confirmação de Identidade</h3>
                <p className="text-white/60 text-sm font-bold">Para enviar sua atividade e registrar sua nota, digite seu nome completo abaixo:</p>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu Nome Completo *"
                  className="w-full bg-white/5 border-2 border-white/20 p-6 rounded-3xl outline-none focus:border-orange-500 transition-all text-xl font-bold text-white placeholder:text-white/30"
                />
              </div>

              <button 
                disabled={Object.keys(answers).length < selectedLesson.questoes.length || !fullName.trim() || fullName.trim().split(' ').length < 2} 
                onClick={handleFinish} 
                className="w-full bg-white text-black font-black py-8 rounded-[40px] text-lg tracking-[0.3em] uppercase hover:bg-orange-600 hover:text-white transition-all shadow-2xl disabled:opacity-30 mb-20 border-4 border-transparent hover:border-white"
              >
                FINALIZAR E ENVIAR
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-16 animate-in fade-in duration-700">
          <div className="text-center">
            <h2 className="text-6xl font-extrabold tracking-tighter mb-4 uppercase italic text-white text-shadow-md">
              MEU <span className="text-orange-500">APRENDIZADO</span>
            </h2>
          </div>

          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-white/10"></div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-orange-500">Aulas Pendentes</h3>
              <div className="h-[2px] flex-1 bg-white/10"></div>
            </div>
            
            {pendingLessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pendingLessons.map(l => (
                  <div 
                    key={l.id} 
                    className="glass p-10 rounded-[50px] border-white/20 hover:border-orange-500 transition-all cursor-pointer group flex flex-col shadow-2xl relative overflow-hidden" 
                    onClick={() => openLesson(l.id)}
                  >
                    <div className="absolute top-6 right-8">
                      <span className="bg-orange-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase animate-pulse">Pendente</span>
                    </div>
                    <h3 className="font-black text-3xl mb-4 group-hover:text-orange-500 leading-none uppercase italic transition-colors text-white pr-16">{l.titulo}</h3>
                    <p className="text-sm text-white/80 line-clamp-2 mb-8 font-medium">{l.texto}</p>
                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="text-[9px] font-black uppercase text-orange-400">Responder Agora</span>
                      <span className="text-[9px] font-black uppercase text-white/50">{l.componenteCurricular}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass p-12 rounded-[40px] border-dashed border-white/10 text-center">
                <p className="text-white/60 font-black uppercase tracking-widest text-sm">Nenhuma aula pendente por enquanto!</p>
              </div>
            )}
          </section>

          <section className="space-y-8 pb-10">
            <div className="flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-white/10"></div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white/60">Aulas Concluídas</h3>
              <div className="h-[2px] flex-1 bg-white/10"></div>
            </div>

            {completedLessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {completedLessons.map(l => {
                  const result = results.find(r => r.aulaId === l.id);
                  return (
                    <div 
                      key={l.id} 
                      className="glass p-10 rounded-[50px] border-white/10 hover:border-white/40 transition-all cursor-pointer group flex flex-col shadow-xl bg-white/5" 
                      onClick={() => openLesson(l.id)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-black text-2xl group-hover:text-orange-400 leading-none uppercase italic transition-colors text-white/80">{l.titulo}</h3>
                        {result && (
                          <div className="bg-white/10 px-3 py-2 rounded-2xl flex flex-col items-center">
                            <span className="text-[14px] font-black text-white">{Math.round((result.acertos / result.total) * 100)}%</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
                        <span className="text-[9px] font-black uppercase text-white/60">Ver Minhas Respostas</span>
                        <span className="text-[9px] font-black uppercase text-white/50">{l.componenteCurricular}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white/40 font-black uppercase tracking-widest text-xs">Você ainda não concluiu nenhuma atividade.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass p-2 rounded-[32px] flex items-center gap-1 border-white/30 shadow-2xl">
          <button 
            onClick={() => { setSelectedLesson(null); setCurrentResult(null); }} 
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedLesson ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
          >
            Dashboard
          </button>
          <div className="w-[2px] h-8 bg-white/20 mx-2"></div>
          <button 
            onClick={logout} 
            className="w-12 h-12 bg-red-600/30 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center transition shadow-lg border border-red-500/40"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
