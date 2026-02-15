
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, isPendingApproval, logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegistering) {
      if (!nome.trim()) {
        setError("O nome é obrigatório.");
        setLoading(false);
        return;
      }
      const result = await register(nome, email, password);
      if (!result.success) setError(result.message || "Erro no cadastro.");
    } else {
      const result = await login(email, password);
      if (!result.success) setError(result.message || "Erro no acesso.");
    }
    setLoading(false);
  };

  if (isPendingApproval) {
    return (
      <div className="h-screen w-screen bg-ensinoverso flex items-center justify-center overflow-hidden">
        <div className="glass p-12 rounded-[50px] w-full max-w-lg border border-orange-500/40 shadow-2xl text-center animate-in zoom-in-95">
          <div className="w-24 h-24 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-orange-500/50">
            <span className="text-4xl animate-pulse">⏳</span>
          </div>
          <h2 className="text-4xl font-black uppercase italic text-white mb-4 tracking-tighter">Acesso Restrito</h2>
          <p className="text-orange-500 font-black uppercase text-xs tracking-[0.2em] mb-8">Aguardando liberação do administrador</p>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
            <p className="text-white/70 text-sm leading-relaxed">Sua conta foi criada com sucesso, mas por questões de segurança, um administrador precisa validar sua identidade antes do primeiro acesso.</p>
          </div>
          <button 
            onClick={logout}
            className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-orange-500 transition-colors"
          >
            ← Sair e tentar outro e-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-ensinoverso flex items-center justify-center overflow-hidden">
      <div className="glass p-12 rounded-[40px] w-full max-w-md border border-white/40 shadow-2xl shadow-black/50 transition-all duration-500">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tighter mb-2 text-shadow-md text-white uppercase italic">
            ENSINO<span className="text-orange-500">VERSO</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
            {isRegistering ? 'Criação de Identidade' : 'Terminal de Acesso'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/70 ml-1">Nome Completo</label>
              <input 
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                className="w-full bg-black/40 border-2 border-white/20 p-4 rounded-2xl outline-none focus:border-orange-500 transition-all text-sm font-bold text-white"
                placeholder="Como você quer ser chamado?"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/70 ml-1">E-mail</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-black/40 border-2 border-white/20 p-4 rounded-2xl outline-none focus:border-orange-500 transition-all text-sm font-bold text-white"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/70 ml-1">Senha de Acesso</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-black/40 border-2 border-white/20 p-4 rounded-2xl outline-none focus:border-orange-500 transition-all text-sm font-bold text-white"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <div className="bg-red-600/30 border-2 border-red-500 p-3 rounded-xl animate-bounce">
              <p className="text-white text-[9px] font-black uppercase text-center tracking-widest">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-900/40 transition-all active:scale-[0.98] tracking-widest border-2 border-orange-400/20 disabled:opacity-50"
          >
            {loading ? 'PROCESSANDO...' : isRegistering ? 'CRIAR CONTA' : 'INICIAR SESSÃO'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
          >
            {isRegistering ? 'Já tenho uma conta. Entrar' : 'Não tem conta? Registre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};
