import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Smartphone,
  Tag,
  ArrowDownCircle,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Lock,
  Unlock,
  Receipt,
  RotateCcw,
  Clock,
  History,
  Check,
} from 'lucide-react';
import { MetricCard } from './charts/AnalyticsCharts';
import { SesionCaja, Venta, Retiro } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface CashRegisterDashboardProps {
  sales: Venta[];
  withdrawals: Retiro[];
  sessions: SesionCaja[];
}

export const CashRegisterDashboard: React.FC<CashRegisterDashboardProps> = ({
  sales,
  withdrawals,
  sessions,
}) => {
  // Helper to format date as YYYY-MM-DD in local time
  const getLocalDateStr = (dateVal: string | Date | null | undefined): string => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewAllDates, setViewAllDates] = useState(false);

  const activeSales = sales.filter((s) => s.estado === 'ACTIVO');
  const activeWithdrawals = withdrawals.filter((w) => w.estado === 'ACTIVO');

  // Helper to match a specific date YYYY-MM-DD in local time
  const matchesDate = (dateVal: string | Date) => {
    if (viewAllDates) return true;
    return getLocalDateStr(dateVal) === selectedDate;
  };

  const periodSales = useMemo(() => activeSales.filter((s) => matchesDate(s.fecha)), [activeSales, selectedDate, viewAllDates]);
  const periodWithdrawals = useMemo(() => activeWithdrawals.filter((w) => matchesDate(w.fecha)), [activeWithdrawals, selectedDate, viewAllDates]);
  const periodSessions = useMemo(() => sessions.filter((s) => matchesDate(s.fechaApertura)), [sessions, selectedDate, viewAllDates]);

  // Aggregate metrics for chosen date
  const totalVentas = periodSales.reduce((sum, s) => sum + s.total, 0);
  const efectivoVentas = periodSales
    .filter((s) => s.metodoPago === 'EFECTIVO')
    .reduce((sum, s) => sum + s.total, 0);
  const transferenciasVentas = periodSales
    .filter((s) => s.metodoPago === 'TRANSFERENCIA')
    .reduce((sum, s) => sum + s.total, 0);
  const totalDescuentos = periodSales.reduce((sum, s) => sum + (s.descuento || 0), 0);
  const totalRetiros = periodWithdrawals.reduce((sum, w) => sum + w.monto, 0);

  // Fondos iniciales ingresados en las aperturas de caja
  const totalFondoInicial = periodSessions.reduce((sum, s) => sum + (s.montoInicial || 0), 0);

  // EFECTIVO ESPERADO EN CAJA:
  // Es el dinero físico que debe haber en el cajón de la registradora:
  // Fondo Inicial + Ventas en Efectivo - Retiros de Efectivo entregados
  const finalEsperado = Math.max(0, Math.round((totalFondoInicial + efectivoVentas - totalRetiros) * 100) / 100);

  // Estado de sesiones del día
  const closedSessions = periodSessions.filter((s) => s.estado === 'CERRADA');
  const hasOpenSession = periodSessions.some((s) => s.estado === 'ABIERTA');
  const hasClosedSessions = closedSessions.length > 0;

  // Diferencia acumulada en los arqueos de sesiones cerradas
  const sumDiferenciaCerradas = closedSessions.reduce((sum, s) => sum + (s.diferencia || 0), 0);

  // CONTADO REAL Y DIFERENCIA:
  // Si hay arqueos cerrados, el contado real refleja lo esperado ajustado por cualquier diferencia física declarada
  const finalDiferencia = hasClosedSessions ? Math.round(sumDiferenciaCerradas * 100) / 100 : 0;
  const finalContado = Math.round((finalEsperado + finalDiferencia) * 100) / 100;

  const handleSelectToday = () => {
    setSelectedDate(todayStr);
    setViewAllDates(false);
  };

  const handleToggleAllDates = () => {
    setViewAllDates(!viewAllDates);
  };

  // Format nice display date (e.g. 29 de septiembre de 2026)
  const displayDateStr = useMemo(() => {
    if (viewAllDates) return 'Todas las fechas (Histórico consolidado)';
    try {
      const parts = selectedDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate, viewAllDates]);

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* SELECTOR DE FECHA SIMPLE (SIN FECHA DESDE / HASTA) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-100 text-orange-700 rounded-2xl shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              Control y Arqueo de Caja
            </h3>
            <p className="text-xs text-slate-500 font-medium capitalize">
              {displayDateStr}
            </p>
          </div>
        </div>

        {/* Selector de fecha única */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
              Elegir Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              disabled={viewAllDates}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setViewAllDates(false);
              }}
              className="px-3.5 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer disabled:opacity-50"
            />
          </div>

          <div className="flex items-center space-x-2 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={handleSelectToday}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-2 ${
                !viewAllDates && selectedDate === todayStr
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={handleToggleAllDates}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-2 ${
                viewAllDates
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Ver Todas las Fechas
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. KPIs PRINCIPALES DE CAJA DE LA FECHA (EN FILAS DE A 4) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ventas del Día"
          value={formatCurrency(totalVentas)}
          subtitle={`${periodSales.length} tickets emitidos`}
          icon={Receipt}
          iconColor="text-orange-600 bg-orange-50"
        />

        <MetricCard
          title="Efectivo"
          value={formatCurrency(efectivoVentas)}
          subtitle="Cobrado en mano"
          icon={Banknote}
          iconColor="text-emerald-600 bg-emerald-50"
        />

        <MetricCard
          title="Transferencias"
          value={formatCurrency(transferenciasVentas)}
          subtitle="Bancos / billeteras"
          icon={Smartphone}
          iconColor="text-blue-600 bg-blue-50"
        />

        <MetricCard
          title="Descuentos"
          value={formatCurrency(totalDescuentos)}
          subtitle="Bonificaciones aplicadas"
          icon={Tag}
          iconColor="text-indigo-600 bg-indigo-50"
        />

        <MetricCard
          title="Retiros"
          value={formatCurrency(totalRetiros)}
          subtitle="A emprendedores"
          icon={ArrowDownCircle}
          iconColor="text-amber-600 bg-amber-50"
        />

        <MetricCard
          title="Esperado en Caja"
          value={formatCurrency(finalEsperado)}
          subtitle={
            totalFondoInicial > 0
              ? `Ventas Ef. + Fondo (${formatCurrency(totalFondoInicial)})`
              : 'Efectivo según sistema'
          }
          icon={Scale}
          iconColor="text-purple-600 bg-purple-50"
        />

        <MetricCard
          title="Contado Real"
          value={formatCurrency(finalContado)}
          subtitle={
            hasOpenSession
              ? 'Turno en curso (arqueo al cerrar)'
              : hasClosedSessions
              ? 'Arqueo físico declarado'
              : 'Histórico conciliado'
          }
          icon={CheckCircle2}
          iconColor="text-teal-600 bg-teal-50"
        />

        <MetricCard
          title="Diferencia"
          value={formatCurrency(finalDiferencia)}
          subtitle={
            hasOpenSession
              ? 'Caja en curso'
              : finalDiferencia === 0
              ? 'Arqueo exacto'
              : finalDiferencia > 0
              ? 'Sobrante a favor'
              : 'Faltante en caja'
          }
          icon={AlertTriangle}
          iconColor={
            finalDiferencia === 0
              ? 'text-emerald-600 bg-emerald-50'
              : finalDiferencia > 0
              ? 'text-blue-600 bg-blue-50'
              : 'text-rose-600 bg-rose-50'
          }
        />
      </div>

      {/* ============================================================ */}
      {/* 2. COMPROBANTE OFICIAL DE CONCILIACIÓN */}
      {/* ============================================================ */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest block">
                Comprobante Oficial de Caja
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Conciliación y Arqueo
              </h3>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700">
              {viewAllDates ? 'Consolidado' : selectedDate}
            </span>
          </div>

          <div className="font-mono text-sm sm:text-base space-y-3">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Ventas del día:</span>
              <span className="font-black text-white">{formatCurrency(totalVentas)}</span>
            </div>

            <div className="flex justify-between py-1 text-emerald-400">
              <span className="text-slate-400 pl-4">• Efectivo:</span>
              <span className="font-bold">{formatCurrency(efectivoVentas)}</span>
            </div>

            <div className="flex justify-between py-1 text-blue-400">
              <span className="text-slate-400 pl-4">• Transferencias:</span>
              <span className="font-bold">{formatCurrency(transferenciasVentas)}</span>
            </div>

            {totalDescuentos > 0 && (
              <div className="flex justify-between py-1 text-indigo-400">
                <span className="text-slate-400 pl-4">• Descuentos aplicados:</span>
                <span className="font-bold">-{formatCurrency(totalDescuentos)}</span>
              </div>
            )}

            {totalFondoInicial > 0 && (
              <div className="flex justify-between py-1 text-purple-400">
                <span className="text-slate-400 pl-4">• Fondo inicial de cambio:</span>
                <span className="font-bold">+{formatCurrency(totalFondoInicial)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 text-amber-400 border-b border-slate-800 pb-2">
              <span className="text-slate-400">Retiros de efectivo:</span>
              <span className="font-bold">-{formatCurrency(totalRetiros)}</span>
            </div>

            <div className="flex justify-between py-1.5 font-bold">
              <span className="text-slate-300">Efectivo esperado:</span>
              <span className="text-white">{formatCurrency(finalEsperado)}</span>
            </div>

            <div className="flex justify-between py-1.5 font-bold">
              <span className="text-slate-300">Efectivo contado:</span>
              <span className="text-white">{formatCurrency(finalContado)}</span>
            </div>

            <div
              className={`flex justify-between pt-3 border-t-2 border-slate-700 text-lg sm:text-xl font-black ${
                finalDiferencia === 0
                  ? 'text-emerald-400'
                  : finalDiferencia > 0
                  ? 'text-blue-400'
                  : 'text-rose-400'
              }`}
            >
              <span>Diferencia:</span>
              <span>{formatCurrency(finalDiferencia)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. HISTORIAL DE SESIONES Y ARQUEOS DE CAJA DE LA FECHA */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Sesiones y Arqueos ({periodSessions.length})
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Detalle de turnos, fondos de cambio y diferencias
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          {periodSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium text-xs">
              No se registraron sesiones de caja para la fecha seleccionada ({selectedDate}).
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha Apertura</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-3 text-right">Fondo Inicial</th>
                  <th className="py-3 px-3 text-right">Ventas Efectivo</th>
                  <th className="py-3 px-3 text-right">Retiros</th>
                  <th className="py-3 px-3 text-right">Esperado</th>
                  <th className="py-3 px-3 text-right">Real Contado</th>
                  <th className="py-3 px-3 text-right">Diferencia</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {periodSessions.map((ses) => (
                  <tr key={ses.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <div>{formatDateTime(ses.fechaApertura)}</div>
                      {ses.fechaCierre && (
                        <div className="text-[10px] text-slate-400">
                          Cierre: {formatDateTime(ses.fechaCierre)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-800">
                        {ses.turno === 'MANANA' ? 'Mañana' : 'Tarde'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-semibold">
                      {formatCurrency(ses.montoInicial)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                      {formatCurrency(ses.montoVentasEfectivo ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-semibold">
                      {formatCurrency(ses.montoRetiros ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-800">
                      {formatCurrency(ses.montoEsperadoEfectivo ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatCurrency(ses.montoRealContado ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black px-2 py-0.5 rounded-full ${
                          (ses.diferencia ?? 0) === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : (ses.diferencia ?? 0) > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {formatCurrency(ses.diferencia ?? 0)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ses.estado === 'ABIERTA'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ses.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {ses.usuarioCierre || ses.usuarioApertura || 'cajero'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
