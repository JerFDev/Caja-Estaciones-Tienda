import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wallet,
  Download,
  UploadCloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  highlight?: boolean;
  adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { to: '/', label: 'Dashboards', icon: LayoutDashboard, adminOnly: true },
  { to: '/ventas', label: 'Caja (POS)', icon: ShoppingCart, highlight: true },
  { to: '/emprendimientos', label: 'Emprendimientos', icon: Users },
  { to: '/saldos', label: 'Saldos Disponibles', icon: Wallet, adminOnly: true },
  { to: '/municipal', label: 'Gestión Municipal', icon: Landmark, adminOnly: true },
  { to: '/exportar', label: 'Exportar Datos', icon: Download },
  { to: '/importar', label: 'Importar / Consolidar', icon: UploadCloud },
  { to: '/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_pinned') === 'true';
  });

  const isExpanded = isPinned || isHovered;

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_pinned', String(next));
      return next;
    });
  };

  const visibleItems = allNavItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] select-none transition-all duration-300 ease-in-out z-20 ${
        isExpanded ? 'w-64 shadow-2xl' : 'w-[72px]'
      }`}
    >
      {/* Lista de navegación */}
      <div className="py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={!isExpanded ? item.label : undefined}
              className={({ isActive }) => `
                flex items-center rounded-xl text-sm font-semibold transition-all group relative
                ${isExpanded ? 'px-3.5 py-3 space-x-3' : 'justify-center py-3 px-0'}
                ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-950/30'
                    : item.highlight
                    ? 'bg-slate-800/80 text-orange-400 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isExpanded ? (
                <>
                  <span className="truncate whitespace-nowrap animate-in fade-in duration-200">
                    {item.label}
                  </span>
                  {item.highlight && (
                    <span className="ml-auto text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded shrink-0 animate-in fade-in duration-200">
                      POS
                    </span>
                  )}
                </>
              ) : null}
            </NavLink>
          );
        })}
      </div>

      {/* Botón para fijar / contraer */}
      <div className="p-2 border-t border-slate-800/80">
        <button
          onClick={togglePin}
          title={isPinned ? 'Desfijar menú (se colapsa al sacar el cursor)' : 'Fijar menú siempre abierto'}
          className={`w-full flex items-center py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer ${
            isExpanded ? 'px-3 space-x-3' : 'justify-center px-0'
          }`}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform ${isPinned ? 'text-orange-400' : 'text-slate-400'}`} />
              <span className="truncate whitespace-nowrap">
                {isPinned ? 'Fijado abierto' : 'Fijar menú'}
              </span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
};
