import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldCheck, ShoppingCart, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth, DEFAULT_USERS } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Si ya tiene sesión activa, redirigir según su rol
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'EMPRENDEDOR') {
        navigate('/ventas', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await login(username, password);
      if (res.success) {
        // Redirigir según rol
        const isEmp = username.trim().toLowerCase() === 'emprendedor';
        if (isEmp) {
          navigate('/ventas', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError(res.error || 'Credenciales incorrectas');
      }
    } catch (err: any) {
      setError('Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Elementos visuales de fondo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera con Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-orange-50 border-2 border-orange-200 rounded-2xl shadow-sm">
            <img
              src="/logo-muni.png"
              alt="Municipio de Bariloche"
              className="w-14 h-14 object-contain"
            />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Municipio de Bariloche
            </h1>
            <p className="text-base font-extrabold text-orange-600">
              Tienda Creativa
            </p>
            <span className="inline-block mt-1 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
              Sistema Offline de Gestión y Caja
            </span>
          </div>
        </div>

        {/* Mensaje de error si falla */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 p-3.5 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                placeholder="ej: emprendedor o admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-13 pl-12 pr-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-13 pl-12 pr-12 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-base rounded-2xl shadow-lg shadow-orange-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Verificando...' : 'INGRESAR AL SISTEMA'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Accesos rápidos para el personal */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <span className="block text-[11px] font-black uppercase text-slate-500 tracking-wider text-center">
            Credenciales de Acceso
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('emprendedor', 'emprendedor2026')}
              className="p-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 group-hover:text-orange-900">
                <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
                <span>Emprendedor</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">emprendedor2026</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'muniadmin2026')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                <span>Administrador</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">muniadmin2026</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
