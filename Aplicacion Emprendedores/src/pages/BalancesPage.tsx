import React, { useState, useEffect } from 'react';
import { Wallet, Search, ArrowDownCircle, Banknote, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { SaldoEmprendimiento } from '../types';
import { formatCurrency } from '../utils/formatters';

export const BalancesPage: React.FC = () => {
  const [balances, setBalances] = useState<SaldoEmprendimiento[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal para retiro rápido
  const [selectedForWithdrawal, setSelectedForWithdrawal] = useState<SaldoEmprendimiento | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [withdrawalObs, setWithdrawalObs] = useState('');
  const [allowOverdraft, setAllowOverdraft] = useState(false);
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      setLoading(true);
      const data = await api.getBalances(true);
      setBalances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWithdrawal = (b: SaldoEmprendimiento) => {
    setSelectedForWithdrawal(b);
    setWithdrawalAmount(b.saldoEfectivoDisponible > 0 ? b.saldoEfectivoDisponible : 0);
    setWithdrawalObs('');
    setAllowOverdraft(false);
  };

  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForWithdrawal) return;
    if (withdrawalAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    try {
      setSavingWithdrawal(true);
      await api.createWithdrawal({
        emprendimientoId: selectedForWithdrawal.id,
        monto: Number(withdrawalAmount),
        observaciones: withdrawalObs,
        permitirExcedente: allowOverdraft,
      });

      setSelectedForWithdrawal(null);
      setFeedback(`Retiro de ${formatCurrency(withdrawalAmount)} registrado con éxito para ${selectedForWithdrawal.nombre}.`);
      setTimeout(() => setFeedback(null), 5000);
      await loadBalances();
    } catch (err: any) {
      alert(err.message || 'Error al registrar retiro.');
    } finally {
      setSavingWithdrawal(false);
    }
  };

  const filtered = balances.filter(
    (b) =>
      b.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      b.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      b.responsable?.toLowerCase().includes(search.toLowerCase())
  );

  const totalVendidoGlobal = balances.reduce((acc, b) => acc + b.ventasTotales, 0);
  const totalEfectivoGlobal = balances.reduce((acc, b) => acc + b.ventasEfectivo, 0);
  const totalRetiradoGlobal = balances.reduce((acc, b) => acc + b.totalRetiros, 0);
  const totalSaldoDisponibleGlobal = balances.reduce((acc, b) => acc + b.saldoEfectivoDisponible, 0);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Saldos y Liquidaciones por Emprendimiento</h2>
          <p className="text-sm text-slate-500 font-medium">
            Control de ventas en efectivo vs transferencia, retiros efectuados y saldo disponible para pago
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-orange-50 text-orange-800 border border-orange-200 p-3 rounded-xl text-sm font-bold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-orange-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Resumen Superior de Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Total Ventas</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totalVendidoGlobal)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Total Efectivo Cobrado</span>
          <p className="text-2xl font-black text-orange-600 mt-1">{formatCurrency(totalEfectivoGlobal)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Total Retiros Entregados</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(totalRetiradoGlobal)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Saldo Efectivo en Caja</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalSaldoDisponibleGlobal)}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código (ej: SBS), nombre o responsable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabla General de Saldos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Emprendimiento</th>
                <th className="py-3 px-4 text-right">Ventas Total</th>
                <th className="py-3 px-4 text-right">Efectivo</th>
                <th className="py-3 px-4 text-right">Transf.</th>
                <th className="py-3 px-4 text-right">Retiros</th>
                <th className="py-3 px-4 text-right">Saldo Disp. Efectivo</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    Calculando saldos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-1 rounded">{b.codigo}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{b.nombre}</p>
                      <p className="text-xs text-slate-400">{b.responsable} • {b.rubro || 'General'}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatCurrency(b.ventasTotales)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-orange-700">
                      {formatCurrency(b.ventasEfectivo)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-blue-700">
                      {formatCurrency(b.ventasTransferencia)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-700">
                      {formatCurrency(b.totalRetiros)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-base">
                      <span
                        className={
                          b.saldoEfectivoDisponible > 0
                            ? 'text-orange-600'
                            : b.saldoEfectivoDisponible === 0
                            ? 'text-slate-400'
                            : 'text-red-600'
                        }
                      >
                        {formatCurrency(b.saldoEfectivoDisponible)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {b.stockActual} u.
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenWithdrawal(b)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Retirar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Retiro Rápido */}
      {selectedForWithdrawal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
              <ArrowDownCircle className="w-6 h-6 text-amber-600" />
              <span>Pagar Retiro en Efectivo</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
              <p className="font-extrabold text-slate-900">
                [{selectedForWithdrawal.codigo}] {selectedForWithdrawal.nombre}
              </p>
              <p className="text-xs text-slate-500">Responsable: {selectedForWithdrawal.responsable}</p>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                <span className="text-slate-600">Saldo Disponible en Efectivo:</span>
                <span className="text-orange-700 font-black">
                  {formatCurrency(selectedForWithdrawal.saldoEfectivoDisponible)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmWithdrawal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Monto a Retirar ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xl font-black border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              {withdrawalAmount > selectedForWithdrawal.saldoEfectivoDisponible && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>El monto supera el saldo disponible de efectivo.</span>
                  </div>
                  <label className="flex items-center space-x-2 mt-2 pt-2 border-t border-amber-200 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={allowOverdraft}
                      onChange={(e) => setAllowOverdraft(e.target.checked)}
                      className="rounded text-amber-600 h-4 w-4"
                    />
                    <span>Autorizar retiro especial (excede saldo)</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Observaciones / Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago de ventas del fin de semana..."
                  value={withdrawalObs}
                  onChange={(e) => setWithdrawalObs(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedForWithdrawal(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    savingWithdrawal ||
                    withdrawalAmount <= 0 ||
                    (withdrawalAmount > selectedForWithdrawal.saldoEfectivoDisponible && !allowOverdraft)
                  }
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {savingWithdrawal ? 'Registrando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
