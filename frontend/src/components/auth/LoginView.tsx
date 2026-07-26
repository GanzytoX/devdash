import React, { useState } from "react";
import { useDashboard } from "../../hooks/useDashboard";
import { Zap, Lock, User, AlertCircle, Eye } from "lucide-react";

export const LoginView: React.FC = () => {
  const { login, loginAsDemo } = useDashboard();
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<'credentials' | 'demo' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      setErrorMsg("Por favor, ingresa el usuario y la contraseña.");
      return;
    }

    setErrorMsg(null);
    setLoading('credentials');

    const success = await login(usernameInput.trim(), passwordInput);
    if (!success) {
      setErrorMsg("Usuario o contraseña incorrectos.");
      setLoading(null);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg(null);
    setLoading('demo');
    const success = await loginAsDemo();
    if (!success) {
      setErrorMsg('El modo demostración no está disponible temporalmente.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#040815] relative overflow-hidden px-4 select-none">
      {/* Decorative gradient background lights */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-brand-blue-700/10 blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-violet-700/10 blur-[120px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-[420px] animate-fade-in relative z-10">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-blue-700 to-brand-blue-600 flex items-center justify-center shadow-lg shadow-brand-blue-700/30 mb-4 animate-bounce-slow">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-sans text-slate-100 tracking-tight leading-none mb-1">
            DevDash
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Panel de Acceso
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel border border-white/5 rounded-2xl p-8 bg-slate-950/40 relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Usuario
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/5 hover:border-white/10 focus:border-brand-blue-500 focus:outline-none rounded-xl text-slate-200 font-sans text-xs transition-colors"
                  placeholder="usuario"
                  autoComplete="username"
                  disabled={loading !== null}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/5 hover:border-white/10 focus:border-brand-blue-500 focus:outline-none rounded-xl text-slate-200 font-sans text-xs transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading !== null}
                />
              </div>
            </div>

            {/* Verification Error Alert */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] flex items-center gap-2 font-mono">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading !== null}
              className="w-full py-3 bg-gradient-to-r from-brand-blue-600 to-brand-blue-500 hover:from-brand-blue-500 hover:to-brand-blue-400 text-white font-mono text-xs font-bold rounded-xl transition-all duration-300 shadow-md shadow-brand-blue-600/25 hover:shadow-brand-blue-500/40 transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading === 'credentials' ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">o explora sin modificar datos</span>
            <span className="h-px flex-1 bg-white/5" />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading !== null}
            className="w-full py-3 border border-brand-blue-500/20 bg-brand-blue-500/10 hover:bg-brand-blue-500/15 text-brand-blue-200 font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {loading === 'demo' ? (
              <div className="h-4 w-4 border-2 border-brand-blue-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Entrar en modo demostración
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] font-mono text-slate-500">
          Alojado en CubePath
        </p>
      </div>
    </div>
  );
};
