
import React, { useState, useEffect } from 'react';
import { User, Turma, Lesson, UserRole, Resultado } from '../../types';
import { UserService } from '../../services/UserService';
import { TurmaService } from '../../services/TurmaService';
import { LessonService } from '../../services/LessonService';
import { useAuth } from '../../contexts/AuthContext';
import { BnccService, BnccSkill } from '../../services/BnccService';

type AdminView = 'inicio' | 'turmas' | 'usuarios' | 'config';

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('inicio');
  const [users, setUsers] = useState<User[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  
  const [turmaForm, setTurmaForm] = useState({ nome: '', ano: '', imagemUrl: '', descricao: '' });
  const [userForm, setUserForm] = useState<{nome: string, role: UserRole, turmas: string[], email: string}>({
    nome: '', role: 'aluno', turmas: [], email: ''
  });

  const [habilidadesBncc, setHabilidadesBncc] = useState<Record<string, BnccSkill[]>>({});

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    try {
      const [u, t, l, b] = await Promise.all([
        UserService.listAll(),
        TurmaService.listAll(),
        LessonService.listAll(),
        BnccService.getAll()
      ]);
      setUsers(u);
      setTurmas(t);
      setLessons(l);
      setHabilidadesBncc(b);
    } catch (e) {
      console.error("Erro ao carregar ecossistema Ensinoverso:", e);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.nome.trim()) return alert("O nome é indispensável.");
    
    try {
      // Regra de negócio: Se for novo, gera e-mail automático. Se for edição, mantém o atual.
      const emailDefinitivo = editingUserId 
        ? userForm.email 
        : `${userForm.nome.toLowerCase().trim().replace(/\s+/g, '.')}@ensinoverso.com`;
      
      await UserService.save({ 
        ...userForm, 
        email: emailDefinitivo,
        ativo: true 
      }, editingUserId || undefined);
      
      setUserForm({ nome: '', role: 'aluno', turmas: [], email: '' });
      setEditingUserId(null); 
      await loadData();
      alert(editingUserId ? "Identidade atualizada!" : "Novo usuário integrado ao Ensinoverso.");
    } catch (error) {
      alert("Houve uma falha na sincronização do usuário.");
    }
  };

  const handleEditUser = (u: User) => {
    setEditingUserId(u.id);
    setUserForm({ 
      nome: u.nome, 
      role: u.role, 
      turmas: u.turmas || [], 
      email: u.email 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleUserTurma = (id: string) => {
    setUserForm(prev => ({
      ...prev,
      turmas: prev.turmas.includes(id) 
        ? prev.turmas.filter(x => x !== id) 
        : [...prev.turmas, id]
    }));
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este usuário do sistema?")) {
      await UserService.delete(id);
      loadData();
    }
  };

  return (
    <div className="relative pb-32 text-white">
      <div className="min-h-[70vh]">
        {currentView === 'inicio' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <h2 className="text-5xl font-black uppercase italic text-orange-500 tracking-tighter">Status do Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass p-10 rounded-[50px] border-white/20 group hover:border-orange-500 transition-all cursor-default">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Turmas</p>
                <p className="text-7xl font-black leading-none group-hover:scale-105 transition-transform">{turmas.length}</p>
              </div>
              <div className="glass p-10 rounded-[50px] border-orange-500/30 group hover:border-orange-500 transition-all cursor-default">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Usuários</p>
                <p className="text-7xl font-black leading-none text-orange-500 group-hover:scale-105 transition-transform">{users.length}</p>
              </div>
              <div className="glass p-10 rounded-[50px] border-white/20 group hover:border-orange-500 transition-all cursor-default">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Aulas</p>
                <p className="text-7xl font-black leading-none group-hover:scale-105 transition-transform">{lessons.length}</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'turmas' && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
             <div className="flex justify-between items-end">
               <h2 className="text-5xl font-black uppercase italic text-orange-500 tracking-tighter">Turmas</h2>
               <p className="text-[10px] font-black uppercase opacity-40">Gestão de Coletividades</p>
             </div>

             <form onSubmit={async (e) => { 
                e.preventDefault(); 
                if (editingTurmaId) await TurmaService.update(editingTurmaId, turmaForm); 
                else await TurmaService.create(turmaForm); 
                setEditingTurmaId(null); 
                setTurmaForm({nome:'', ano:'', imagemUrl:'', descricao:''}); 
                await loadData(); 
              }} className="glass p-10 rounded-[50px] border-white/20 space-y-8 max-w-4xl shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Identificação</label>
                    <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-3xl outline-none focus:border-orange-500 font-bold text-xl transition-all" placeholder="Nome da Turma *" value={turmaForm.nome} onChange={e => setTurmaForm({...turmaForm, nome: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Ano Letivo</label>
                    <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-3xl outline-none focus:border-orange-500 font-bold text-xl transition-all" placeholder="Ex: 2024" value={turmaForm.ano} onChange={e => setTurmaForm({...turmaForm, ano: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-white text-black py-6 rounded-[32px] font-black text-xs uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all transform active:scale-95 shadow-xl">
                  {editingTurmaId ? 'Sincronizar Alterações' : 'Fundar Nova Turma'}
                </button>
             </form>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {turmas.map(t => (
                 <div key={t.id} className="glass rounded-[50px] p-8 flex flex-col justify-between border-white/10 hover:border-orange-500/50 transition-all group">
                   <div>
                     <span className="text-[8px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2 block">{t.ano}</span>
                     <h3 className="text-3xl font-black uppercase italic group-hover:text-orange-500 transition-colors leading-none">{t.nome}</h3>
                   </div>
                   <div className="flex gap-3 mt-10">
                     <button onClick={() => { setEditingTurmaId(t.id); setTurmaForm({nome:t.nome, ano:t.ano, imagemUrl:t.imagemUrl||'', descricao:t.descricao||''}); }} className="flex-1 bg-white/5 hover:bg-white hover:text-black py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">EDITAR</button>
                     <button onClick={async () => { if(confirm("Extinguir turma?")) { await TurmaService.delete(t.id); loadData(); } }} className="w-14 h-14 bg-red-600/10 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center transition-all border border-red-500/20">🗑️</button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentView === 'usuarios' && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-5xl font-black uppercase italic text-orange-500 tracking-tighter">Mentes & Perfis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              
              <div className="glass p-12 rounded-[60px] border-white/20 shadow-2xl space-y-10">
                 <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black uppercase italic leading-none">Configurar Identidade</h3>
                    {editingUserId && (
                      <button onClick={() => { setEditingUserId(null); setUserForm({nome:'', role:'aluno', turmas:[], email:''}); }} className="text-[8px] font-black uppercase bg-white/10 px-4 py-2 rounded-xl hover:bg-red-600 transition-colors">Abortar Edição</button>
                    )}
                 </div>
                 
                 <form onSubmit={handleUserSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Nome Completo</label>
                      <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-3xl outline-none font-bold text-xl focus:border-orange-500 transition-all" placeholder="Nome do integrante..." value={userForm.nome} onChange={e => setUserForm({...userForm, nome: e.target.value})} required />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Nível de Acesso (Cargo)</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['aluno', 'professor'] as UserRole[]).map(role => (
                          <button 
                            key={role}
                            type="button"
                            onClick={() => setUserForm({...userForm, role})}
                            className={`py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border-2 ${userForm.role === role ? 'bg-orange-600 border-orange-500 text-white shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'}`}
                          >
                            {role === 'aluno' ? '🎓 Acadêmico' : '👨‍🏫 Docente'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-2">Turmas Autorizadas</label>
                      <div className="flex flex-wrap gap-2 p-6 bg-white/5 rounded-[40px] border-2 border-white/10 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {turmas.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleUserTurma(t.id)}
                            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${userForm.turmas.includes(t.id) ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-white/10 border-white/5 text-white/30 hover:border-white/20'}`}
                          >
                            {t.nome}
                          </button>
                        ))}
                        {turmas.length === 0 && <p className="text-[10px] font-bold text-white/20 italic p-2">Sem turmas registradas no banco.</p>}
                      </div>
                      <p className="text-[9px] font-bold text-white/30 ml-4 italic">* Selecione múltiplas turmas para acesso expandido.</p>
                    </div>

                    <button type="submit" className="w-full bg-white text-black py-7 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 hover:text-white transition-all transform active:scale-95">
                      {editingUserId ? 'Confirmar Atualização' : 'Efetivar Cadastro'}
                    </button>
                 </form>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-4">
                  <h3 className="text-xl font-black uppercase tracking-widest opacity-60 italic">Banco de Memória</h3>
                  <span className="bg-orange-600 px-3 py-1 rounded-full text-[8px] font-black">{users.length} ATIVOS</span>
                </div>
                <div className="max-h-[750px] overflow-y-auto custom-scrollbar space-y-4 pr-4">
                  {users.sort((a,b) => a.nome.localeCompare(b.nome)).map(u => ( 
                    <div key={u.id} className="glass p-6 rounded-[40px] flex justify-between items-center border-white/5 hover:border-orange-500/30 transition-all group shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 ${u.role === 'admin' ? 'border-purple-500 text-purple-500' : u.role === 'professor' ? 'border-blue-500 text-blue-500' : 'border-orange-500 text-orange-500'}`}>
                          {u.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-lg uppercase leading-none mb-1 group-hover:text-orange-500 transition-colors">{u.nome}</p>
                          <div className="flex gap-2 items-center">
                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-600' : u.role === 'professor' ? 'bg-blue-600' : 'bg-orange-600'}`}>{u.role}</span>
                            <span className="text-[8px] font-bold text-white/40">{u.turmas?.length || 0} vínculos</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEditUser(u)} className="bg-white/10 hover:bg-orange-600 p-4 rounded-2xl transition-all">✏️</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="bg-red-600/10 hover:bg-red-600 p-4 rounded-2xl transition-all">🗑️</button>
                      </div>
                    </div> 
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'config' && (
          <div className="space-y-12 animate-in slide-in-from-right-8">
            <h2 className="text-5xl font-black uppercase italic text-orange-500 tracking-tighter">Infraestrutura</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-12 rounded-[50px] border-white/10 text-center space-y-8">
                <h3 className="text-3xl font-black uppercase italic">Nuvem BNCC</h3>
                <div className="p-8 bg-white/5 rounded-[40px] border border-white/10">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">Habilidades Mapeadas</p>
                  <p className="text-6xl font-black text-orange-500">{Object.values(habilidadesBncc).flat().length}</p>
                </div>
                <button className="w-full bg-orange-600/20 hover:bg-orange-600 p-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all border border-orange-500/30">Atualizar Banco de Dados</button>
              </div>

              <div className="glass p-12 rounded-[50px] border-white/10 text-center flex flex-col justify-center items-center space-y-6">
                <div className="w-20 h-20 bg-orange-600/20 rounded-full flex items-center justify-center text-4xl border-2 border-orange-500/40 animate-pulse">⚙️</div>
                <h3 className="text-2xl font-black uppercase italic">Sistema Operacional</h3>
                <p className="text-[10px] font-bold opacity-40 uppercase leading-relaxed max-w-xs">Plataforma Ensinoverso rodando em ambiente GitHub nativo. Sincronização em tempo real habilitada.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navegação Inferior Customizada */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-6">
        <div className="glass p-3 rounded-[40px] flex items-center justify-between border-white/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
           <div className="flex items-center gap-1 flex-1">
             {(['inicio', 'turmas', 'usuarios', 'config'] as AdminView[]).map(v => (
               <button key={v} onClick={() => { setCurrentView(v); }} className={`flex-1 py-4 rounded-[28px] text-[9px] font-black uppercase tracking-wider transition-all ${currentView === v ? 'bg-orange-600 text-white shadow-xl' : 'text-white/50 hover:text-white'}`}>
                 {v === 'usuarios' ? 'Mentes' : v}
               </button>
             ))}
           </div>
           <div className="w-[1px] h-10 bg-white/10 mx-3"></div>
           <button onClick={logout} className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-[24px] flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 border-white/20">✕</button>
        </div>
      </div>
    </div>
  );
};
