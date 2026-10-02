import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wallet,
  Download,
  UploadCloud,
  Settings,
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
  { to: '/exportar', label: 'Exportar Datos', icon: Download },
  { to: '/importar', label: 'Importar / Consolidar', icon: UploadCloud },
  { to: '/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const visibleItems = allNavItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] select-none">
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `
                flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all
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
              <span>{item.label}</span>
              {item.highlight && (
                <span className="ml-auto text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                  POS
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};
