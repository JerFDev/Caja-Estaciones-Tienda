import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Configuracion } from '../../types';

interface LayoutProps {
  config: Configuracion | null;
  onConfigChange: (newConfig: Configuracion) => void;
}

export const Layout: React.FC<LayoutProps> = ({ config, onConfigChange }) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      <Navbar config={config} onConfigChange={onConfigChange} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
