import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  Scale,
  RefreshCw,
  Users,
  ArrowRight,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Venta,
  Emprendimiento,
  Producto,
  MovimientoStock,
  Retiro,
  SesionCaja,
} from '../types';
import { formatCurrency } from '../utils/formatters';

// Sub-dashboards
import { DashboardFilters, DashboardFilterState } from '../components/dashboards/DashboardFilters';
import { GeneralSummaryDashboard } from '../components/dashboards/GeneralSummaryDashboard';
import { HistoricalEvolutionDashboard } from '../components/dashboards/HistoricalEvolutionDashboard';
import { CashRegisterDashboard } from '../components/dashboards/CashRegisterDashboard';

type DashboardTab = 'RESUMEN' | 'HISTORICO' | 'CAJA';

const TABS: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'RESUMEN', label: '1. Resumen General', icon: LayoutDashboard },
  { id: 'HISTORICO', label: '2. Evolución Histórica', icon: CalendarRange },
  { id: 'CAJA', label: '3. Caja', icon: Scale },
];

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('RESUMEN');

  // Raw data from server
  const [sales, setSales] = useState<Venta[]>([]);
  const [ventures, setVentures] = useState<Emprendimiento[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [stockMovements, setStockMovements] = useState<MovimientoStock[]>([]);
  const [withdrawals, setWithdrawals] = useState<Retiro[]>([]);
  const [cashSessions, setCashSessions] = useState<SesionCaja[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global shared filters
  const [filters, setFilters] = useState<DashboardFilterState>({
    year: 'TODOS',
    dateFrom: '',
    dateTo: '',
    ventureId: 'TODOS',
    productId: 'TODOS',
  });

  // Modal para anular venta (conservado para administración)
  const [voidingSale, setVoidingSale] = useState<Venta | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [salesData, venturesData, productsData, movementsData, withdrawalsData, sessionsData] =
        await Promise.all([
          api.getSales(),
          api.getEntrepreneurs(true),
          api.getProducts({ inactivos: true }),
          api.getStockMovements(),
          api.getWithdrawals(),
          api.getCashRegisterHistory().catch(() => []),
        ]);

      setSales(salesData);
      setVentures(venturesData);
      setProducts(productsData);
      setStockMovements(movementsData);
      setWithdrawals(withdrawalsData);
      setCashSessions(sessionsData);
      setError(null);
    } catch (e: any) {
      console.error('Error cargando datos de los dashboards:', e);
      setError('No se pudieron cargar los datos del sistema. Verifica la conexión con el servidor local.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      year: 'TODOS',
      dateFrom: '',
      dateTo: '',
      ventureId: 'TODOS',
      productId: 'TODOS',
    });
  };

  const handleConfirmVoidSale = async () => {
    if (!voidingSale || !voidReason.trim()) return;
    try {
      setIsVoiding(true);
      await api.voidSale(voidingSale.id, voidReason.trim());
      setFeedbackMessage({
        type: 'success',
        text: `Venta anulada con éxito. Se restituyeron ${voidingSale.cantidad} unidad(es) al stock del producto.`,
      });
      setVoidingSale(null);
      setVoidReason('');
      await loadAllData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error al anular la venta.',
      });
    } finally {
      setIsVoiding(false);
    }
  };

  // Available years across sales and movements
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    sales.forEach((s) => years.add(new Date(s.fecha).getFullYear()));
    stockMovements.forEach((m) => years.add(new Date(m.fecha).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, stockMovements]);

  // Reactive filtering of sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.fecha);
      if (filters.year !== 'TODOS' && d.getFullYear() !== Number(filters.year)) return false;
      if (filters.dateFrom && new Date(s.fecha) < new Date(filters.dateFrom + 'T00:00:00')) return false;
      if (filters.dateTo && new Date(s.fecha) > new Date(filters.dateTo + 'T23:59:59')) return false;
      if (filters.ventureId !== 'TODOS' && s.emprendimientoId !== filters.ventureId) return false;
      if (filters.productId !== 'TODOS' && s.productoId !== filters.productId) return false;
      return true;
    });
  }, [sales, filters]);

  // Reactive filtering of products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.ventureId !== 'TODOS' && p.emprendimientoId !== filters.ventureId) return false;
      if (filters.productId !== 'TODOS' && p.id !== filters.productId) return false;
      return true;
    });
  }, [products, filters]);

  // Reactive filtering of movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const d = new Date(m.fecha);
      if (filters.year !== 'TODOS' && d.getFullYear() !== Number(filters.year)) return false;
      if (filters.dateFrom && new Date(m.fecha) < new Date(filters.dateFrom + 'T00:00:00')) return false;
      if (filters.dateTo && new Date(m.fecha) > new Date(filters.dateTo + 'T23:59:59')) return false;
      if (filters.ventureId !== 'TODOS' && m.producto?.emprendimientoId !== filters.ventureId) return false;
      if (filters.productId !== 'TODOS' && m.productoId !== filters.productId) return false;
      return true;
    });
  }, [stockMovements, filters]);

  // Reactive filtering of withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const d = new Date(w.fecha);
      if (filters.year !== 'TODOS' && d.getFullYear() !== Number(filters.year)) return false;
      if (filters.dateFrom && new Date(w.fecha) < new Date(filters.dateFrom + 'T00:00:00')) return false;
      if (filters.dateTo && new Date(w.fecha) > new Date(filters.dateTo + 'T23:59:59')) return false;
      if (filters.ventureId !== 'TODOS' && w.emprendimientoId !== filters.ventureId) return false;
      return true;
    });
  }, [withdrawals, filters]);

  // Total stock available for filtered products
  const totalStockAvailable = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (p.stockCalculado ?? 0), 0);
  }, [filteredProducts]);

  if (loading && sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-24">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-sm">Cargando módulo de análisis y dashboards...</p>
      </div>
    );
  }

  if (error && sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <p className="text-red-500 font-semibold">{error}</p>
        <button
          onClick={loadAllData}
          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 cursor-pointer shadow-md"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================ */}
      {/* ENCABEZADO PRINCIPAL DE DASHBOARDS */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Módulo de Dashboards y Análisis
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Supervisión integral, evolución histórica y análisis de rendimiento para la administración
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={loadAllData}
            title="Actualizar datos"
            className="p-2.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/emprendimientos"
            className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-2xl shadow-xs transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Fichas</span>
          </Link>
          <Link
            to="/ventas"
            className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-5 py-2.5 rounded-2xl shadow-md shadow-orange-600/20 transition-all"
          >
            <span>Caja (POS)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Banner de Feedback / Notificación */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* NAVEGACIÓN ENTRE LAS 7 CATEGORÍAS PRINCIPALES */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 flex items-center space-x-2 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BARRA DE FILTROS GENERALES (RESUMEN GENERAL) */}
      {/* ============================================================ */}
      {activeTab === 'RESUMEN' && (
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
          availableYears={availableYears}
          ventures={ventures}
          products={products}
        />
      )}

      {/* ============================================================ */}
      {/* CONTENIDO ACTIVO SEGÚN LA CATEGORÍA SELECCIONADA */}
      {/* ============================================================ */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'RESUMEN' && (
          <GeneralSummaryDashboard
            sales={filteredSales}
            ventures={ventures}
            products={filteredProducts}
            withdrawals={filteredWithdrawals}
            totalStockAvailable={totalStockAvailable}
            onVoidSale={(s) => {
              setVoidingSale(s);
              setVoidReason('');
            }}
          />
        )}

        {activeTab === 'HISTORICO' && (
          <HistoricalEvolutionDashboard
            sales={sales}
            ventures={ventures}
            availableYears={availableYears}
          />
        )}

        {activeTab === 'CAJA' && (
          <CashRegisterDashboard
            sales={sales}
            withdrawals={withdrawals}
            sessions={cashSessions}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMACIÓN PARA ANULAR VENTA (ADMIN) */}
      {/* ============================================================ */}
      {voidingSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ban className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Anular Venta</h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidingSale(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <p className="font-bold">⚠️ Atención:</p>
                <p>
                  Al confirmar la anulación, la venta cambiará su estado a <strong>ANULADA</strong> y se{' '}
                  <strong>restituirán automáticamente {voidingSale.cantidad} unidad(es)</strong> al inventario de{' '}
                  <strong>"{voidingSale.producto?.nombre}"</strong>.
                </p>
              </div>

              {/* Detalle de la venta */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Producto:</span>
                  <span className="font-bold text-slate-800">
                    [{voidingSale.producto?.codigo}] {voidingSale.producto?.nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Emprendimiento:</span>
                  <span className="font-bold text-slate-800">{voidingSale.emprendimiento?.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Cantidad y Total:</span>
                  <span className="font-black text-rose-600">
                    {voidingSale.cantidad} u. • {formatCurrency(voidingSale.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Método de Cobro:</span>
                  <span className="font-bold text-slate-700">{voidingSale.metodoPago}</span>
                </div>
              </div>

              {/* Motivo de Anulación */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Motivo de anulación <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Cobro duplicado, devolución del cliente, error de producto..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidingSale(null)}
                  disabled={isVoiding}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoidSale}
                  disabled={!voidReason.trim() || isVoiding}
                  className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-rose-600/20"
                >
                  {isVoiding ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
