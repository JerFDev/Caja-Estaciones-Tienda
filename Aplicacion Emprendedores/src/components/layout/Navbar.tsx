import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, RefreshCw, LogOut, ShieldCheck, User } from 'lucide-react';
import { api } from '../../services/api';
import { Configuracion } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  config: Configuracion | null;
  onConfigChange: (newConfig: Configuracion) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ config, onConfigChange }) => {
  const [time, setTime] = useState(new Date());
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-10 select-none">
      <div className="flex items-center space-x-3.5">
        <img
          src="/logo-muni.png"
          alt="Municipio Bariloche"
          className="w-10 h-10 object-contain rounded-full shadow-xs shrink-0"
        />
        <div>
          <h1 className="font-extrabold text-slate-800 text-lg leading-tight flex items-center space-x-1.5">
            <span>Municipio Bariloche</span>
            <span className="text-orange-500 font-bold">•</span>
            <span className="text-slate-600 font-semibold text-base">{config?.localNombre || 'Tienda Creativa'}</span>
          </h1>
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 mt-0.5">
            {isAdmin ? (
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            )}
            <span>{roleLabel} - {localLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Selector de Turno Rápido */}
        <button
          onClick={toggleTurno}
          disabled={!config}
          title="Haz clic para alternar entre turno Mañana y Tarde"
          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(config?.turnoActual ?? 'MANANA') === 'MANANA' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Mañana</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>Tarde</span>
            </>
          )}
          <RefreshCw className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>

        {/* Reloj en vivo */}
        <div className="text-right pl-2 hidden lg:block border-l border-slate-200">
          <div className="text-sm font-bold text-slate-700 tabular-nums">
            {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[11px] text-slate-400 capitalize">
            {time.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>

        {/* Botón Cerrar Sesión */}
        <div className="pl-2 border-l border-slate-200">
          <button
            onClick={handleLogout}
            title="Cerrar Sesión del Sistema"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-700 border border-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
