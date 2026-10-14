import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  ShieldCheck,
  User,
  Clock,
  Store,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { Configuracion } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  config: Configuracion | null;
  onConfigChange: (newConfig: Configuracion) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ config, onConfigChange }) => {
  const [time, setTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleTurno = async () => {
    if (!config) return;
    const nuevoTurno = config.turnoActual === 'MANANA' ? 'TARDE' : 'MANANA';
    try {
      const updated = await api.updateConfig({ turnoActual: nuevoTurno });
      onConfigChange(updated);
    } catch (e) {
      console.error('Error al cambiar turno:', e);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Confirma que desea cerrar la sesión actual?')) {
      logout();
      navigate('/login');
    }
  };

  const localLabel = config?.localCodigo
    ? config.localCodigo.replace('_', ' ').replace(/local/i, 'Local')
    : 'Local 01';

  const roleLabel = isAdmin ? 'Administrador' : 'Emprendedor';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-20 select-none relative">
      {/* Título de la aplicación sin subtítulo */}
      <div className="flex items-center space-x-3.5">
        <img
          src="/logo-muni.png"
          alt="Municipio Bariloche"
          className="w-10 h-10 object-contain rounded-full shadow-xs shrink-0"
        />
        <div>
          <h1 className="font-extrabold text-slate-800 text-lg leading-tight flex items-center space-x-2">
            <span>Municipio Bariloche</span>
            <span className="text-orange-500 font-bold">•</span>
            <span className="text-slate-600 font-semibold text-base">
              {config?.localNombre || 'Tienda Creativa'}
            </span>
          </h1>
        </div>
      </div>

      {/* Menú de Perfil de Usuario */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Menú de Usuario y Turno"
          className={`w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 flex items-center justify-center text-white shadow-md shadow-orange-500/30 transition-all cursor-pointer focus:outline-hidden border-2 border-orange-400/80 ${
            isMenuOpen ? 'ring-4 ring-orange-200' : ''
          }`}
          aria-expanded={isMenuOpen}
        >
          <User className="w-5 h-5 text-white" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Encabezado: Rol y Local */}
            <div className="px-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                  {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : 'bg-sky-100 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1 truncate">
                    <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {config?.localNombre || 'Tienda Creativa'} ({localLabel})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Turno y Hora */}
            <div className="px-4 py-3 space-y-3 bg-slate-50/70 border-b border-slate-100 text-xs">
              {/* Hora actual */}
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Hora y fecha:</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800 tabular-nums">
                    {time.toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {time.toLocaleDateString('es-AR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
              </div>

              {/* Turno con selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-slate-600">Turno de caja:</span>
                <button
                  onClick={toggleTurno}
                  disabled={!config}
                  title="Haz clic para alternar turno"
                  className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {(config?.turnoActual ?? 'MANANA') === 'MANANA' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mañana</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tarde</span>
                    </>
                  )}
                  <RefreshCw className="w-3 h-3 text-slate-400 ml-1" />
                </button>
              </div>
            </div>

            {/* Cerrar sesión */}
            <div className="px-2 pt-2">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
