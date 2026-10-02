import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPOSPage } from './pages/SalesPOSPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockPage } from './pages/StockPage';
import { VenturesPage } from './pages/VenturesPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { BalancesPage } from './pages/BalancesPage';
import { ExportPage } from './pages/ExportPage';
import { ImportPage } from './pages/ImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { api } from './services/api';
import { Configuracion } from './types';

export const App: React.FC = () => {
  const [config, setConfig] = useState<Configuracion | null>(null);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pantalla pública de inicio de sesión */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas que requieren sesión activa */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout config={config} onConfigChange={setConfig} />}>
              {/* Dashboard: Solo para ADMIN */}
              <Route
                index
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Caja (POS): Accesible para EMPRENDEDOR y ADMIN */}
              <Route path="ventas" element={<SalesPOSPage config={config} />} />

              {/* Emprendimientos: Accesible para ambos (acciones restringidas por rol) */}
              <Route path="emprendimientos" element={<VenturesPage />} />

              {/* Saldos Generales: Solo para ADMIN */}
              <Route
                path="saldos"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <BalancesPage />
                  </ProtectedRoute>
                }
              />

              {/* Exportar e Importar: Accesible para ambos */}
              <Route path="exportar" element={<ExportPage />} />
              <Route path="importar" element={<ImportPage />} />

              {/* Configuración: Solo para ADMIN */}
              <Route
                path="configuracion"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <SettingsPage config={config} onConfigChange={setConfig} />
                  </ProtectedRoute>
                }
              />

              {/* Redirecciones de rutas obsoletas hacia la gestión en emprendimientos */}
              <Route path="productos" element={<Navigate to="/emprendimientos" replace />} />
              <Route path="stock" element={<Navigate to="/emprendimientos" replace />} />
              <Route path="retiros" element={<Navigate to="/emprendimientos" replace />} />

              <Route path="*" element={<Navigate to="/ventas" replace />} />
            </Route>
          </Route>

          {/* Cualquier otra ruta redirige a /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
