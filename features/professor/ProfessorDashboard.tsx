
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

  // Estado para material extra
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
    const finalData = Object.keys(data).length > 0 ? data : JSON.parse(localStorage.getItem('ev_v4_bncc') || '{}');
    
    if (Object.keys(finalData).length > 0) {
      setHabilidadesBncc(finalData);
      const components = Object.keys(finalData).sort();
      if (components.length > 0) {
        setFilterComponente(components[0]);
        const years = Array.from(new Set(finalData[components[0]].map(h => h.year))).sort();
        if (years.length > 0) setFilterSerie(years[0]);
      }
    }
  };

  const loadData = async () => {
    if (user) {
      setLessons(await LessonService.listByProfessor(user.id));
      const allExistents = await TurmaService.listAll();
      setTurmas(allExistents.filter(t => user.turmas.includes(t.id)));
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
    if (!pendingPdf && (!lessonForm.texto || lessonForm.texto.length < 50)) return alert("Conteúdo insuficiente para IA.");
    setIsProcessingAI(true);
    try {
      const content: AIContent = pendingPdf ? { inlineData: pendingPdf } : { text: lessonForm.texto };
      const data = await AIService.processPdfContent(content);
      setLessonForm(prev => ({ 
        ...prev, 
        titulo: data.titulo || prev.titulo,
        texto: data.textoLimpo || data.textoClean || prev.texto, 
        questoes: data.questoes.map((q: any) => ({ ...q, id: Math.random().toString(36).substr(2, 9) })) 
      }));
      setPendingPdf(null);
    } catch (e) { alert("Erro na IA."); } finally { setIsProcessingAI(false); }
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

  const handleAddExtraMaterial = () => {
    if (!extraLinkInput.trim()) return;
    if (!extraLinkInput.startsWith('http')) return alert("Insira uma URL válida (http:// ou https://)");
    setLessonForm(prev => ({
      ...prev,
      materiaisExtras: [...prev.materiaisExtras, extraLinkInput.trim()]
    }));
    setExtraLinkInput('');
  };

  const handleRemoveExtraMaterial = (idx: number) => {
    setLessonForm(prev => ({
      ...prev,
      materiaisExtras: prev.materiaisExtras.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async (status: 'rascunho' | 'publicada') => {
    if (!user) return;
    const { escola, componenteCurricular, turmaIds, titulo, texto } = lessonForm;
    if (!escola || !componenteCurricular || turmaIds.length === 0 || !titulo || !texto) return alert("Preencha todos os campos.");
    await LessonService.saveLesson({ ...lessonForm, professorId: user.id, status, habilidades: lessonForm.nenhumaHabilidade ? [] : lessonForm.habilidades }, lessonForm.questoes, editingLessonId || undefined);
    setShowForm(false); clearForm(); await loadData(); alert("Sucesso!");
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
    if (fullLesson) {
      await ExportService.exportToDocx(fullLesson, fullLesson.questoes);
    }
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

    // Filtra os resultados pela turma selecionada se houver uma selecionada
    const filteredResults = selectedTurmaId 
      ? results.filter(r => allUsers.find(u => u.id === r.alunoId)?.turmas.includes(selectedTurmaId))
      : results;

    const totalAlunos = filteredResults.length;
    const totalQuestoes = results[0]?.total || (lessonForm.questoes.length > 0 ? lessonForm.questoes.length : 0);

    // Estatísticas por questão contextuais à turma selecionada
    const acertosPorQuestao = new Array(totalQuestoes).fill(0);
    filteredResults.forEach(r => {
      if (r.detalhes) {
        r.detalhes.forEach((acertou, idx) => {
          if (acertou && idx < totalQuestoes) acertosPorQuestao[idx]++;
        });
      }
    });

    const taxaGeral = totalAlunos > 0 && totalQuestoes > 0 
      ? (filteredResults.reduce((acc, curr) => acc + curr.acertos, 0) / (totalAlunos * totalQuestoes)) * 100 
      : 0;

    return (
      <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500 pb-20 text-white">
        <div className="flex items-center justify-between">
          <button onClick={() => { setPerformanceLesson(null); setSelectedTurmaId(''); }} className="text-[10px] font-black uppercase opacity-70 hover:opacity-100 flex items-center gap-2">← VOLTAR ÀS AULAS</button>
          <div className="flex gap-4">
            <button onClick={() => handleExportReport(filteredResults)} className="bg-orange-600 hover:bg-orange-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all">EXPORTAR RELATÓRIO DA TURMA (DOCX)</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-4xl font-black uppercase italic text-orange-500 leading-tight">RELATÓRIO: {lesson.titulo}</h2>
            
            <div className="flex items-center gap-3 glass px-4 py-2 rounded-2xl border-white/10">
              <span className="text-[10px] font-black uppercase opacity-60 whitespace-nowrap">TURMA:</span>
              <select 
                className="bg-transparent border-none outline-none font-black text-orange-500 uppercase text-xs cursor-pointer outline-none"
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
              >
                <option value="" className="bg-black text-white">Geral (Misto)</option>
                {lesson.turmaIds.map(tid => {
                  const t = turmas.find(x => x.id === tid);
                  return <option key={tid} value={tid} className="bg-black text-white">{t?.nome || 'Turma'}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass p-6 rounded-[32px] border-white/10">
              <p className="text-[10px] font-black uppercase opacity-50 mb-1">Taxa de Acerto (Filtro)</p>
              <p className="text-5xl font-black text-orange-500">{taxaGeral.toFixed(1)}%</p>
            </div>
            <div className="glass p-6 rounded-[32px] border-white/10">
              <p className="text-[10px] font-black uppercase opacity-50 mb-1">Alunos Identificados</p>
              <p className="text-5xl font-black text-white">{totalAlunos}</p>
            </div>
            <div className="glass p-6 rounded-[32px] border-white/10">
              <p className="text-[10px] font-black uppercase opacity-50 mb-1">Status da Turma</p>
              <p className="text-2xl font-black uppercase mt-2">{taxaGeral < 50 ? 'ATENÇÃO 🔴' : taxaGeral < 75 ? 'ESTÁVEL 🟡' : 'EXCELENTE 🟢'}</p>
            </div>
          </div>
        </div>

        {totalAlunos > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Lista de Alunos */}
            <div className="lg:col-span-2 glass p-8 rounded-[40px] border-white/10 space-y-6">
              <h3 className="text-xl font-black uppercase italic text-orange-500 border-b border-white/10 pb-4">Performance Individual</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredResults.sort((a,b) => b.acertos - a.acertos).map(r => {
                  const aluno = allUsers.find(u => u.id === r.alunoId);
                  const perc = (r.acertos / r.total) * 100;
                  return (
                    <div key={r.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5 group hover:border-orange-500/30 transition-all">
                      <div>
                        <p className="font-bold text-sm group-hover:text-orange-400 transition-colors">{aluno?.nome || 'Estudante'}</p>
                        <p className="text-[8px] font-black uppercase opacity-40">{new Date(r.data).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-white text-lg leading-none">{r.acertos}/{r.total}</p>
                        <p className={`text-[10px] font-black uppercase ${perc >= 70 ? 'text-green-500' : perc >= 40 ? 'text-yellow-500' : 'text-red-600'}`}>{perc.toFixed(0)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Análise por Questão */}
            <div className="lg:col-span-3 glass p-8 rounded-[40px] border-white/10 space-y-6">
              <h3 className="text-xl font-black uppercase italic text-orange-500 border-b border-white/10 pb-4">Taxa de Acerto por Questão</h3>
              <div className="space-y-6">
                {acertosPorQuestao.map((count, idx) => {
                  const perc = totalAlunos > 0 ? (count / totalAlunos) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">Q{idx+1}</span>
                          <span className="text-[10px] font-black uppercase text-white/70">Respostas Corretas</span>
                        </div>
                        <span className="text-xs font-black text-white">{count} de {totalAlunos} ({perc.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ${perc >= 70 ? 'bg-green-500' : perc >= 40 ? 'bg-orange-500' : 'bg-red-600'}`}
                          style={{ width: `${perc}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-32 text-center glass rounded-[40px] border-white/5 italic">
            <p className="text-2xl font-black uppercase opacity-20">Nenhum dado registrado para esta turma.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative pb-32 text-white">
      {performanceLesson ? renderPerformanceReport() : (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-center">
            <h2 className="text-5xl font-extrabold italic uppercase text-orange-500 leading-none">Docente</h2>
            <button onClick={() => { setEditingLessonId(null); clearForm(); setShowForm(!showForm); }} className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-orange-600 transition-all">{showForm ? 'CANCELAR' : '+ NOVA AULA'}</button>
          </div>
          {showForm && (
            <div className="glass p-12 rounded-[50px] border-orange-500/50 shadow-2xl animate-in zoom-in-95 mb-12 relative overflow-hidden">
              {isProcessingAI && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-center text-white"><div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div><h4 className="text-2xl font-black uppercase mt-6 text-shadow-lg">IA em ação...</h4></div>}
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black uppercase italic text-white">{editingLessonId ? 'Editar Aula' : 'Novo Conteúdo'}</h3>
                {editingLessonId && (
                  <button onClick={() => handleExportLesson(editingLessonId)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all">📄 BAIXAR DOCX</button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <input className="w-full bg-white/10 p-4 rounded-2xl border border-white/20 text-white font-bold placeholder:text-white/30" placeholder="Escola *" value={lessonForm.escola} onChange={e => setLessonForm({...lessonForm, escola: e.target.value})} />
                <input className="w-full bg-white/10 p-4 rounded-2xl border border-white/20 text-white font-bold placeholder:text-white/30" placeholder="Matéria *" value={lessonForm.componenteCurricular} onChange={e => setLessonForm({...lessonForm, componenteCurricular: e.target.value})} />
              </div>

              <div className="space-y-4 mb-8">
                 <span className="text-[10px] font-black uppercase text-orange-500">Turmas Destino *</span>
                 <div className="flex flex-wrap gap-2">
                   {turmas.map(t => ( <button key={t.id} type="button" onClick={() => toggleLessonTurma(t.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${lessonForm.turmaIds.includes(t.id) ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40'}`}>{t.nome}</button> ))}
                 </div>
              </div>

              <div className="glass p-8 rounded-[40px] border-white/20 space-y-6 mb-8">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase text-orange-500">Filtros BNCC Inteligentes (Sinc Cloud)</span>
                   <label className="flex items-center gap-2 cursor-pointer bg-white/10 p-2 rounded-xl">
                      <input type="checkbox" checked={lessonForm.nenhumaHabilidade} onChange={e => setLessonForm({...lessonForm, nenhumaHabilidade: e.target.checked})} className="accent-orange-500" />
                      <span className="text-[9px] font-black uppercase text-white">Sem BNCC</span>
                   </label>
                </div>
                {!lessonForm.nenhumaHabilidade && (
                   <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                             <label className="text-[8px] font-black uppercase text-white/40 ml-2">Matéria</label>
                             <select className="w-full bg-white/10 p-3 rounded-xl text-[10px] font-black uppercase border-none text-white focus:bg-orange-600 transition-colors outline-none" value={filterComponente} onChange={e => setFilterComponente(e.target.value)}>
                                <option value="" disabled className="bg-black">Selecione...</option>
                                {availableComponents.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                             </select>
                         </div>
                         <div className="space-y-1">
                             <label className="text-[8px] font-black uppercase text-white/40 ml-2">Ano / Série</label>
                             <select className="w-full bg-white/10 p-3 rounded-xl text-[10px] font-black uppercase border-none text-white focus:bg-orange-600 transition-colors outline-none" value={filterSerie} onChange={e => setFilterSerie(e.target.value)}>
                                <option value="" disabled className="bg-black">Selecione...</option>
                                {availableYears.map(y => <option key={y} value={y} className="bg-black">{y}</option>)}
                             </select>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar text-white">
                         {filteredSkills.length > 0 ? filteredSkills.map(h => (
                           <button key={h.code} type="button" onClick={() => setLessonForm(prev => ({ ...prev, habilidades: prev.habilidades.includes(h.code) ? prev.habilidades.filter(x => x !== h.code) : [...prev.habilidades, h.code] }))} className={`p-4 rounded-2xl text-[10px] border-2 transition-all text-left flex flex-col gap-1 ${lessonForm.habilidades.includes(h.code) ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-white/10 border-white/20 text-white/80'}`}>
                              <div className="flex justify-between items-center">
                                 <span className="font-black text-xs text-orange-400">{h.code}</span>
                                 <span className="text-[8px] opacity-70 uppercase text-white">{h.year}</span>
                              </div>
                              <p className="font-bold text-white text-[11px] mt-1">{h.description}</p>
                           </button>
                         )) : (
                            <div className="p-10 text-center opacity-40 uppercase font-black text-[10px] tracking-widest text-white border-2 border-dashed border-white/10 rounded-3xl">Selecione Ano e Matéria para listar.</div>
                         )}
                      </div>
                   </div>
                )}
              </div>

              <div className="glass p-8 rounded-[40px] border-white/20 space-y-4 mb-8">
                 <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Material Extra (Links Externos)</h4>
                 <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-white/10 p-4 rounded-xl border border-white/20 text-white font-bold text-xs outline-none focus:border-orange-500" 
                      placeholder="https://youtube.com/..." 
                      value={extraLinkInput}
                      onChange={e => setExtraLinkInput(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddExtraMaterial}
                      className="bg-white text-black px-6 rounded-xl font-black text-[10px] uppercase hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                    >
                      ADICIONAR
                    </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {lessonForm.materiaisExtras.map((link, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 pl-4 pr-2 py-2 rounded-xl flex items-center gap-3">
                         <span className="text-[10px] font-bold text-white/70 truncate max-w-[200px]">{link}</span>
                         <button type="button" onClick={() => handleRemoveExtraMaterial(idx)} className="text-red-500 hover:text-red-400 text-xs p-1">✕</button>
                      </div>
                    ))}
                    {lessonForm.materiaisExtras.length === 0 && <p className="text-[10px] font-bold text-white/30 uppercase">Nenhum recurso extra ainda.</p>}
                 </div>
              </div>

              <div className="space-y-4 mb-8 text-white">
                 <div className="flex justify-between items-center">
                   <label className="text-[11px] font-black uppercase">Conteúdo Principal</label>
                   <div className="flex gap-2">
                     <label className="bg-white/20 hover:bg-white text-black px-6 py-2 rounded-xl text-[11px] font-black cursor-pointer uppercase transition-all">📄 PDF<input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} /></label>
                     <button type="button" onClick={processWithAI} className="bg-orange-600 text-white px-6 py-2 rounded-xl text-[11px] font-black uppercase shadow-lg transition-all">✨ IA</button>
                   </div>
                 </div>
                 <input className="w-full bg-white/10 p-4 rounded-2xl border-2 border-orange-500/30 text-white font-black text-lg placeholder:text-white/20" placeholder="Título da Aula *" value={lessonForm.titulo} onChange={e => setLessonForm({...lessonForm, titulo: e.target.value})} />
                 <textarea className="w-full bg-white/10 p-6 rounded-[32px] border border-white/20 text-white h-64 font-medium leading-relaxed placeholder:text-white/20" placeholder="Conteúdo textual..." value={lessonForm.texto} onChange={e => setLessonForm({...lessonForm, texto: e.target.value})} />
              </div>

              {lessonForm.questoes.length > 0 && (
                <div className="space-y-6 mb-8 animate-in slide-in-from-bottom-4 duration-500 text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-white/20"></div>
                    <h4 className="text-[11px] font-black uppercase text-orange-500 tracking-[0.2em]">Atividades (Editáveis)</h4>
                    <div className="h-[1px] flex-1 bg-white/20"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lessonForm.questoes.map((q, idx) => (
                      <div key={q.id || idx} className="glass p-8 rounded-[40px] border-white/10 relative hover:border-orange-500/40 transition-all">
                        <span className="absolute top-6 right-8 text-[8px] font-black text-white/30 uppercase tracking-widest">Q{idx + 1}</span>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[8px] font-black uppercase text-orange-500/70 mb-1 block">Enunciado da Questão</label>
                            <textarea className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-orange-500 h-20 resize-none" value={q.pergunta} onChange={(e) => handleUpdateQuestao(idx, 'pergunta', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-orange-500/70 mb-1 block">Alternativas</label>
                            {q.alternativas.map((alt: string, aIdx: number) => (
                              <div key={aIdx} className="flex items-center gap-3">
                                <button type="button" onClick={() => handleUpdateQuestao(idx, 'respostaCorreta', aIdx)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all border ${q.respostaCorreta === aIdx ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40'}`}>{String.fromCharCode(65 + aIdx)}</button>
                                <input className={`flex-1 bg-white/5 border p-2 rounded-lg text-[10px] font-medium text-white outline-none transition-all ${q.respostaCorreta === aIdx ? 'border-orange-500/50 bg-orange-600/5' : 'border-white/10'}`} value={alt} onChange={(e) => handleUpdateAlternativa(idx, aIdx, e.target.value)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 border-t border-white/10 pt-10 mt-10">
                 <button onClick={() => handleSave('rascunho')} className="px-10 py-5 border-2 border-white text-white rounded-2xl text-[11px] font-black uppercase">Rascunho</button>
                 <button onClick={() => handleSave('publicada')} className="px-12 py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase shadow-2xl transition-all hover:bg-orange-600 hover:text-white">PUBLICAR</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
            {lessons.map(l => (
              <div key={l.id} className="glass rounded-[40px] border-white/20 p-8 flex flex-col group hover:border-orange-500 transition-all shadow-xl">
                <h3 className="text-4xl font-black mb-3 uppercase italic leading-none group-hover:text-orange-500 transition-colors">{l.titulo}</h3>
                <p className="text-[10px] font-black text-orange-400 uppercase mb-4">{l.componenteCurricular}</p>
                <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
                  <button onClick={() => handleEditLesson(l.id)} className="bg-white/10 py-3 rounded-xl text-[8px] font-black uppercase hover:bg-white hover:text-black transition-all">EDITAR</button>
                  <button onClick={() => handleExportLesson(l.id)} className="bg-blue-600/20 hover:bg-blue-600 py-3 rounded-xl text-[8px] font-black uppercase border border-blue-500/30 transition-all">EXPORTAR DOCX</button>
                  <button onClick={async () => { 
                    const res = await LessonService.getResultsByLesson(l.id); 
                    setPerformanceLesson({ lesson: l, results: res }); 
                  }} className="bg-orange-600 py-3 rounded-xl text-[8px] font-black uppercase col-span-2 shadow-lg border border-orange-500/30 hover:scale-[1.02] transition-all">RELATÓRIO</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
        <div className="glass p-2 rounded-[32px] flex items-center gap-1 border-2 border-white/40 shadow-2xl">
            <button onClick={() => { setPerformanceLesson(null); setShowForm(false); }} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md transition-all ${!performanceLesson ? 'bg-orange-600 text-white' : 'text-white/60'}`}>Aulas</button>
            <div className="w-[2px] h-8 bg-white/20 mx-2"></div>
            <button onClick={logout} className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center transition border-2 border-white shadow-lg">✕</button>
        </div>
      </div>
    </div>
  );
};
