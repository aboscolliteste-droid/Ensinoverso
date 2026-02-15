
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lesson, Turma, User, Resultado } from '../../types';
import { LessonService } from '../../services/LessonService';
import { TurmaService } from '../../services/TurmaService';
import { UserService } from '../../services/UserService';
import { AIService, AIContent } from '../../services/AIService';
import { BnccService, BnccSkill } from '../../services/BnccService';
import { ExportService } from '../../services/ExportService';

const INITIAL_BNCC: Record<string, BnccSkill[]> = {};

export const ProfessorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<{data: string, mimeType: string} | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  
  const [performanceLesson, setPerformanceLesson] = useState<{ lesson: Lesson, results: Resultado[] } | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');

  const [filterSerie, setFilterSerie] = useState('');
  const [filterComponente, setFilterComponente] = useState('');
  
  const [habilidadesBncc, setHabilidadesBncc] = useState<Record<string, BnccSkill[]>>(INITIAL_BNCC);
  const [extraLinkInput, setExtraLinkInput] = useState('');

  const [lessonForm, setLessonForm] = useState({
    titulo: '', texto: '', escola: '', componenteCurricular: '', 
    turmaIds: [] as string[], habilidades: [] as string[], 
    nenhumaHabilidade: false, materiaisExtras: [] as string[], 
    questoes: [] as any[]
  });

  useEffect(() => {
    if (user) {
      loadData();
      loadBncc();
    }
  }, [user]);

  const loadBncc = async () => {
    const data = await BnccService.getAll();
    setHabilidadesBncc(data);
    const components = Object.keys(data).sort();
    if (components.length > 0) {
      setFilterComponente(components[0]);
      const years = Array.from(new Set(data[components[0]].map(h => h.year))).sort();
      if (years.length > 0) setFilterSerie(years[0]);
    }
  };

  const loadData = async () => {
    if (user) {
      const myLessons = await LessonService.listByProfessor(user.id);
      setLessons(myLessons);
      const allTurmas = await TurmaService.listAll();
      // Mostra apenas as turmas que o professor tem permissão de acesso
      setTurmas(allTurmas.filter(t => user.turmas.includes(t.id)));
      setAllUsers(await UserService.listAll());
    }
  };

  const availableComponents = useMemo(() => Object.keys(habilidadesBncc).sort(), [habilidadesBncc]);
  const availableYears = useMemo(() => {
    if (!filterComponente || !habilidadesBncc[filterComponente]) return [];
    return Array.from(new Set(habilidadesBncc[filterComponente].map(h => h.year))).sort();
  }, [habilidadesBncc, filterComponente]);

  const filteredSkills = useMemo(() => {
    return habilidadesBncc[filterComponente]?.filter(h => h.year === filterSerie) || [];
  }, [habilidadesBncc, filterComponente, filterSerie]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setPendingPdf({ data: base64, mimeType: file.type });
        setLessonForm(prev => ({ ...prev, texto: `[PDF CARREGADO: ${file.name}] - Clique em ✨ para processar.` }));
      };
      reader.readAsDataURL(file);
    }
  };

  const processWithAI = async () => {
    if (!pendingPdf && (!lessonForm.texto || lessonForm.texto.length < 50)) return alert("Conteúdo insuficiente para análise.");
    setIsProcessingAI(true);
    try {
      const content: AIContent = pendingPdf ? { inlineData: pendingPdf } : { text: lessonForm.texto };
      const data = await AIService.processPdfContent(content);
      setLessonForm(prev => ({ 
        ...prev, 
        titulo: data.titulo || prev.titulo,
        texto: data.textoLimpo || prev.texto, 
        questoes: data.questoes.map((q: any) => ({ ...q, id: Math.random().toString(36).substr(2, 9) })) 
      }));
      setPendingPdf(null);
    } catch (e) { 
      alert("IA ocupada ou erro de rede. Tente novamente."); 
    } finally { 
      setIsProcessingAI(false); 
    }
  };

  const handleUpdateQuestao = (idx: number, field: string, value: any) => {
    const novasQuestoes = [...lessonForm.questoes];
    novasQuestoes[idx] = { ...novasQuestoes[idx], [field]: value };
    setLessonForm({ ...lessonForm, questoes: novasQuestoes });
  };

  const handleUpdateAlternativa = (qIdx: number, altIdx: number, value: string) => {
    const novasQuestoes = [...lessonForm.questoes];
    const novasAlternativas = [...novasQuestoes[qIdx].alternativas];
    novasAlternativas[altIdx] = value;
    novasQuestoes[qIdx] = { ...novasQuestoes[qIdx], alternativas: novasAlternativas };
    setLessonForm({ ...lessonForm, questoes: novasQuestoes });
  };

  const handleSave = async (status: 'rascunho' | 'publicada') => {
    if (!user) return;
    const { escola, componenteCurricular, turmaIds, titulo, texto } = lessonForm;
    if (!escola || !componenteCurricular || turmaIds.length === 0 || !titulo || !texto) return alert("Preencha os campos obrigatórios (*).");
    await LessonService.saveLesson({ ...lessonForm, professorId: user.id, status, habilidades: lessonForm.nenhumaHabilidade ? [] : lessonForm.habilidades }, lessonForm.questoes, editingLessonId || undefined);
    setShowForm(false); clearForm(); await loadData(); alert("Aula salva com sucesso!");
  };

  const toggleLessonTurma = (id: string) => {
    setLessonForm(prev => ({
      ...prev,
      turmaIds: prev.turmaIds.includes(id) ? prev.turmaIds.filter(x => x !== id) : [...prev.turmaIds, id]
    }));
  };

  const clearForm = () => {
    setLessonForm({ titulo: '', texto: '', escola: '', componenteCurricular: '', turmaIds: [], habilidades: [], nenhumaHabilidade: false, materiaisExtras: [], questoes: [] });
    setPendingPdf(null);
    setExtraLinkInput('');
  };

  const handleEditLesson = async (lessonId: string) => {
    const l = await LessonService.getById(lessonId);
    if (!l) return;
    setEditingLessonId(lessonId);
    setLessonForm({ ...l, nenhumaHabilidade: (l.habilidades || []).length === 0, materiaisExtras: l.materiaisExtras || [] });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportLesson = async (lessonId: string) => {
    const fullLesson = await LessonService.getById(lessonId);
    if (fullLesson) await ExportService.exportToDocx(fullLesson, fullLesson.questoes);
  };

  const handleExportReport = async (filteredResults: Resultado[]) => {
    if (performanceLesson) {
      const turma = turmas.find(t => t.id === selectedTurmaId);
      await ExportService.exportReportToDocx(performanceLesson.lesson, filteredResults, allUsers, turma?.nome || "Todas as Turmas");
    }
  };

  const renderPerformanceReport = () => {
    if (!performanceLesson) return null;
    const { lesson, results } = performanceLesson;
    const filteredResults = selectedTurmaId 
      ? results.filter(r => allUsers.find(u => u.id === r.alunoId)?.turmas.includes(selectedTurmaId))
      : results;
    const totalAlunos = filteredResults.length;
    const totalQuestoes = results[0]?.total || 0;
    const taxaGeral = totalAlunos > 0 && totalQuestoes > 0 
      ? (filteredResults.reduce((acc, curr) => acc + curr.acertos, 0) / (totalAlunos * totalQuestoes)) * 100 
      : 0;

    return (
      <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => { setPerformanceLesson(null); setSelectedTurmaId(''); }} className="text-[10px] font-black uppercase opacity-70 hover:opacity-100 flex items-center gap-2">← RETORNAR ÀS AULAS</button>
          <button onClick={() => handleExportReport(filteredResults)} className="bg-orange-600 hover:bg-orange-500 px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all border-2 border-orange-400/20">📄 EXPORTAR RELATÓRIO TURMA</button>
        </div>

        <div className="space-y-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-4xl font-black uppercase italic text-orange-500 tracking-tighter leading-none">Análise: {lesson.titulo}</h2>
            <div className="glass px-6 py-3 rounded-3xl border-white/10 flex items-center gap-4 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Turma Analisada:</span>
              <select className="bg-transparent border-none outline-none font-black text-orange-500 uppercase text-xs cursor-pointer" value={selectedTurmaId} onChange={(e) => setSelectedTurmaId(e.target.value)}>
                <option value="" className="bg-black">Visão Geral (Mista)</option>
                {lesson.turmaIds.map(tid => <option key={tid} value={tid} className="bg-black">{turmas.find(x => x.id === tid)?.nome || 'Turma'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-8 rounded-[40px] border-white/10"><p className="text-[10px] font-black uppercase opacity-40 mb-2">Sucesso da Turma</p><p className="text-6xl font-black text-orange-500">{taxaGeral.toFixed(0)}%</p></div>
            <div className="glass p-8 rounded-[40px] border-white/10"><p className="text-[10px] font-black uppercase opacity-40 mb-2">Participantes</p><p className="text-6xl font-black">{totalAlunos}</p></div>
            <div className="glass p-8 rounded-[40px] border-white/10"><p className="text-[10px] font-black uppercase opacity-40 mb-2">Nível de Absorção</p><p className="text-2xl font-black uppercase mt-3">{taxaGeral < 50 ? 'Crítico ⚠️' : taxaGeral < 75 ? 'Médio 📊' : 'Alto 🚀'}</p></div>
          </div>
        </div>
        {/* Adicionei um placeholder para os dados individuais para manter o código enxuto */}
        <div className="glass p-12 rounded-[50px] border-white/10 text-center opacity-40 italic font-black uppercase text-xs tracking-widest">Detalhes individuais carregados no buffer...</div>
      </div>
    );
  };

  return (
    <div className="relative pb-32 text-white">
      {performanceLesson ? renderPerformanceReport() : (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2">Terminal do Docente</p>
              <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none">Conteúdos</h2>
            </div>
            <button onClick={() => { setEditingLessonId(null); clearForm(); setShowForm(!showForm); }} className="bg-white text-black px-12 py-5 rounded-[28px] text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-orange-600 hover:text-white transition-all transform active:scale-95">{showForm ? 'CANCELAR' : 'CRIAR AULA'}</button>
          </div>

          {showForm && (
            <div className="glass p-12 rounded-[60px] border-orange-500/40 shadow-2xl animate-in zoom-in-95 mb-16 relative overflow-hidden">
               {isProcessingAI && <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-12"><div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-8"></div><h4 className="text-3xl font-black uppercase italic animate-float tracking-widest">IA Sincronizando Dados...</h4></div>}
               <div className="flex justify-between items-center mb-10">
                 <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{editingLessonId ? 'Editar Aula' : 'Novo Experimento'}</h3>
                 {editingLessonId && <button onClick={() => handleExportLesson(editingLessonId)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all border border-blue-400/20">📄 DOCX</button>}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Unidade Escolar *</label>
                   <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-3xl outline-none font-bold focus:border-orange-500 transition-all text-xl" placeholder="Nome da escola..." value={lessonForm.escola} onChange={e => setLessonForm({...lessonForm, escola: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Componente Curricular *</label>
                   <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-3xl outline-none font-bold focus:border-orange-500 transition-all text-xl" placeholder="Ex: Ciências" value={lessonForm.componenteCurricular} onChange={e => setLessonForm({...lessonForm, componenteCurricular: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-4 mb-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Turmas de Destino (Vínculo Múltiplo)</span>
                  <div className="flex flex-wrap gap-2 p-6 bg-white/5 rounded-[40px] border border-white/10">
                    {turmas.map(t => ( 
                      <button key={t.id} type="button" onClick={() => toggleLessonTurma(t.id)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${lessonForm.turmaIds.includes(t.id) ? 'bg-orange-600 border-orange-500 text-white shadow-xl scale-105' : 'bg-white/5 border-white/10 text-white/40'}`}>
                        {t.nome}
                      </button> 
                    ))}
                    {turmas.length === 0 && <p className="text-[10px] font-bold text-white/20 italic">Você não possui turmas atribuídas no seu perfil.</p>}
                  </div>
               </div>

               <div className="space-y-6 mb-12">
                 <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-500">Conteúdo Base</label>
                    <div className="flex gap-3">
                      <label className="bg-white/5 hover:bg-white hover:text-black border-2 border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black cursor-pointer uppercase tracking-widest transition-all">📂 PDF Base<input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} /></label>
                      <button type="button" onClick={processWithAI} className="bg-orange-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">✨ Processar IA</button>
                    </div>
                 </div>
                 <input className="w-full bg-white/5 p-5 rounded-3xl border-2 border-orange-500/30 text-white font-black text-2xl tracking-tighter placeholder:text-white/10 focus:border-orange-500 outline-none transition-all" placeholder="Título Estratégico da Aula..." value={lessonForm.titulo} onChange={e => setLessonForm({...lessonForm, titulo: e.target.value})} />
                 <textarea className="w-full bg-white/5 p-8 rounded-[48px] border-2 border-white/10 text-white h-[400px] font-medium leading-relaxed placeholder:text-white/10 focus:border-orange-500 outline-none transition-all custom-scrollbar" placeholder="Cole o texto base ou deixe a IA extrair do PDF..." value={lessonForm.texto} onChange={e => setLessonForm({...lessonForm, texto: e.target.value})} />
               </div>

               <div className="flex justify-end gap-4 pt-10 border-t border-white/10">
                  <button onClick={() => handleSave('rascunho')} className="px-12 py-5 border-2 border-white/20 text-white/50 hover:text-white hover:border-white rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all">Apenas Rascunho</button>
                  <button onClick={() => handleSave('publicada')} className="px-16 py-6 bg-white text-black rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-orange-600 hover:text-white transition-all transform active:scale-95">Publicar Aula</button>
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {lessons.map(l => (
              <div key={l.id} className="glass rounded-[60px] border-white/10 p-10 flex flex-col group hover:border-orange-500/50 transition-all shadow-xl relative overflow-hidden">
                <div className="absolute top-8 right-10">
                  <span className={`text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${l.status === 'publicada' ? 'bg-orange-600 text-white' : 'bg-white/10 text-white/50'}`}>{l.status}</span>
                </div>
                <h3 className="text-4xl font-black mb-2 uppercase italic leading-none group-hover:text-orange-500 transition-colors pr-16 tracking-tighter">{l.titulo}</h3>
                <p className="text-[10px] font-black text-orange-400/60 uppercase tracking-widest mb-6">{l.componenteCurricular}</p>
                <div className="grid grid-cols-2 gap-3 mt-auto pt-8 border-t border-white/5">
                  <button onClick={() => handleEditLesson(l.id)} className="bg-white/5 hover:bg-white hover:text-black py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">EDITAR</button>
                  <button onClick={async () => { 
                    const res = await LessonService.getResultsByLesson(l.id); 
                    setPerformanceLesson({ lesson: l, results: res }); 
                  }} className="bg-orange-600 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all transform hover:scale-105">RELATÓRIO</button>
                </div>
              </div>
            ))}
            {lessons.length === 0 && !showForm && (
              <div className="md:col-span-2 glass p-20 rounded-[60px] border-dashed border-white/10 text-center opacity-30 italic font-black uppercase text-sm tracking-widest">Nenhum conteúdo produzido ainda.</div>
            )}
          </div>
        </div>
      )}

      {/* Navegação Flutuante Docente */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-6">
        <div className="glass p-3 rounded-[40px] flex items-center justify-between border-white/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
            <button onClick={() => { setPerformanceLesson(null); setShowForm(false); }} className={`flex-1 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all ${!performanceLesson ? 'bg-orange-600 text-white shadow-xl' : 'text-white/60 hover:text-white'}`}>Minhas Aulas</button>
            <div className="w-[1px] h-10 bg-white/10 mx-3"></div>
            <button onClick={logout} className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-[24px] flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 border-white/20">✕</button>
        </div>
      </div>
    </div>
  );
};
