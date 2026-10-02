import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, Plus, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { Retiro, Emprendimiento } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const WithdrawalsPage: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Retiro[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<Emprendimiento[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Crear Retiro
  const [showModal, setShowModal] = useState(false);
  const [formEmpId, setFormEmpId] = useState('');
  const [formMonto, setFormMonto] = useState(0);
  const [formObs, setFormObs] = useState('');
  const [allowOverdraft, setAllowOverdraft] = useState(false);
  const [currentAvailable, setCurrentAvailable] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal Anular Retiro
  const [voidingWithdrawal, setVoidingWithdrawal] = useState<Retiro | null>(null);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadWithdrawals();
  }, [selectedEmpId]);

  useEffect(() => {
    if (formEmpId) {
      api.getBalanceById(formEmpId).then((b) => {
        setCurrentAvailable(b.saldoEfectivoDisponible);
      });
    } else {
      setCurrentAvailable(null);
    }
  }, [formEmpId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const emps = await api.getEntrepreneurs(true);
      setEntrepreneurs(emps);
      await loadWithdrawals();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const data = await api.getWithdrawals({
        emprendimientoId: selectedEmpId || undefined,
      });
      setWithdrawals(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    const firstEmp = entrepreneurs[0]?.id || '';
    setFormEmpId(firstEmp);
    setFormMonto(0);
    setFormObs('');
    setAllowOverdraft(false);
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmpId || formMonto <= 0) {
      alert('Selecciona un emprendimiento y un monto mayor a 0.');
      return;
    }

    try {
      setSaving(true);
      await api.createWithdrawal({
        emprendimientoId: formEmpId,
        monto: formMonto,
        observaciones: formObs,
        permitirExcedente: allowOverdraft,
      });
      setShowModal(false);
      await loadWithdrawals();
    } catch (err: any) {
      alert(err.message || 'Error al registrar retiro.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidingWithdrawal || !voidReason.trim()) return;
    try {
      await api.voidWithdrawal(voidingWithdrawal.id, voidReason);
      setVoidingWithdrawal(null);
      setVoidReason('');
      await loadWithdrawals();
    } catch (e: any) {
      alert(e.message || 'Error al anular retiro');
    }
  };

  const filtered = withdrawals.filter(
    (w) =>
      w.identificadorUnico.toLowerCase().includes(search.toLowerCase()) ||
      w.emprendimiento?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      w.emprendimiento?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      (w.observaciones && w.observaciones.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Retiros de Efectivo</h2>
          <p className="text-sm text-slate-500 font-medium">
            Registro de entregas de dinero a emprendedores y control de egresos de caja chica
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer self-start"
        >
          <Plus className="w-5 h-5" />
          <span>Registrar Retiro</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código, emprendimiento u observación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-medium"
          >
            <option value="">Todos los Emprendimientos</option>
            {entrepreneurs.map((emp) => (
              <option key={emp.id} value={emp.id}>
                [{emp.codigo}] {emp.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Retiros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">ID Operación</th>
                <th className="py-3 px-4">Emprendimiento</th>
                <th className="py-3 px-4 text-right">Monto Retirado</th>
                <th className="py-3 px-4">Observaciones</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    Cargando retiros...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No se encontraron retiros registrados.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      r.estado === 'ANULADO' ? 'bg-red-50/40 opacity-60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDate(r.fecha)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {r.identificadorUnico}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">[{r.emprendimiento?.codigo}]</span>{' '}
                      <span className="font-semibold text-slate-900">{r.emprendimiento?.nombre}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-700 text-base">
                      {formatCurrency(r.monto)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {r.observaciones || '-'}
                      {r.estado === 'ANULADO' && (
                        <span className="block text-red-600 font-bold">Motivo: {r.motivoAnulacion}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                          r.estado === 'ACTIVO'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {r.estado === 'ACTIVO' && (
                        <button
                          onClick={() => setVoidingWithdrawal(r)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Anular retiro"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Retiro */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
              <ArrowDownCircle className="w-6 h-6 text-amber-600" />
              <span>Registrar Retiro de Efectivo</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Emprendimiento
                </label>
                <select
                  value={formEmpId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                >
                  {entrepreneurs.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.codigo}] {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {currentAvailable !== null && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Saldo Disponible en Efectivo:</span>
                  <span className="font-black text-sm text-orange-700">
                    {formatCurrency(currentAvailable)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Monto a Retirar ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formMonto}
                  onChange={(e) => setFormMonto(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xl font-black border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              {currentAvailable !== null && formMonto > currentAvailable && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>El monto excede el saldo en efectivo disponible.</span>
                  </div>
                  <label className="flex items-center space-x-2 mt-2 pt-2 border-t border-amber-200 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={allowOverdraft}
                      onChange={(e) => setAllowOverdraft(e.target.checked)}
                      className="rounded text-amber-600 h-4 w-4"
                    />
                    <span>Autorizar retiro excepcional</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Detalles del retiro..."
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || formMonto <= 0 || (currentAvailable !== null && formMonto > currentAvailable && !allowOverdraft)}
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {saving ? 'Registrando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Anular Retiro */}
      {voidingWithdrawal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-lg text-slate-900">Anular Retiro</h3>
            </div>
            <p className="text-sm text-slate-600">
              ¿Confirmas la anulación del retiro de{' '}
              <strong>{formatCurrency(voidingWithdrawal.monto)}</strong> de{' '}
              <strong>{voidingWithdrawal.emprendimiento?.nombre}</strong>? El saldo en efectivo volverá a
              estar disponible.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Motivo de anulación (Obligatorio)
              </label>
              <input
                type="text"
                placeholder="Ej: Monto incorrecto..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVoidingWithdrawal(null);
                  setVoidReason('');
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={!voidReason.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
