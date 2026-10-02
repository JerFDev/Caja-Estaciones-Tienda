import React, { useState, useEffect } from 'react';
import {
  Boxes,
  PlusCircle,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  History,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Producto, Emprendimiento, MovimientoStock, TipoMovimientoStock } from '../types';
import { formatDate } from '../utils/formatters';

export const StockPage: React.FC = () => {
  const [movements, setMovements] = useState<MovimientoStock[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<Emprendimiento[]>([]);
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Formulario nuevo movimiento
  const [showModal, setShowModal] = useState(false);
  const [formEmpId, setFormEmpId] = useState('');
  const [formProdId, setFormProdId] = useState('');
  const [formCantidad, setFormCantidad] = useState(1);
  const [formTipo, setFormTipo] = useState<TipoMovimientoStock>('INGRESO');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formObs, setFormObs] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [selectedEntrepreneurId, selectedProductId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [emps, prods] = await Promise.all([
        api.getEntrepreneurs(true),
        api.getProducts({ inactivos: false }),
      ]);
      setEntrepreneurs(emps);
      setProducts(prods);
      if (emps.length > 0) setFormEmpId(emps[0].id);
      await loadMovements();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const data = await api.getStockMovements({
        emprendimientoId: selectedEntrepreneurId || undefined,
        productoId: selectedProductId || undefined,
      });
      setMovements(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenModal = (p?: Producto) => {
    if (p) {
      setFormEmpId(p.emprendimientoId);
      setFormProdId(p.id);
    } else {
      setFormEmpId(entrepreneurs[0]?.id || '');
      const firstProd = products.find((pr) => pr.emprendimientoId === (entrepreneurs[0]?.id || ''));
      setFormProdId(firstProd?.id || '');
    }
    setFormCantidad(1);
    setFormTipo('INGRESO');
    setFormFecha(new Date().toISOString().split('T')[0]);
    setFormObs('');
    setShowModal(true);
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProdId) {
      alert('Debes seleccionar un producto.');
      return;
    }
    if (formCantidad === 0) {
      alert('La cantidad no puede ser 0.');
      return;
    }
    if ((formTipo === 'INGRESO' || formTipo === 'DEVOLUCION') && formCantidad < 0) {
      alert('La cantidad de ingreso/devolución debe ser positiva.');
      return;
    }

    try {
      setFormSaving(true);
      await api.createStockMovement({
        productoId: formProdId,
        cantidad: formCantidad,
        tipoMovimiento: formTipo,
        fecha: formFecha,
        observaciones: formObs,
      });

      setShowModal(false);
      setFeedback('Movimiento de stock registrado con éxito.');
      setTimeout(() => setFeedback(null), 4000);

      // Recargar productos para actualizar cálculos de stock
      const updatedProducts = await api.getProducts({ inactivos: false });
      setProducts(updatedProducts);
      await loadMovements();
    } catch (err: any) {
      alert(err.message || 'Error al registrar movimiento.');
    } finally {
      setFormSaving(false);
    }
  };

  const availableProductsForForm = products.filter(
    (p) => !formEmpId || p.emprendimientoId === formEmpId
  );

  const selectedFormProduct = products.find((p) => p.id === formProdId);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Stock y Reposiciones</h2>
          <p className="text-sm text-slate-500 font-medium">
            Registro de ingresos de mercadería, ajustes de inventario y trazabilidad
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer self-start"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Ingresar Stock</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-orange-50 text-orange-800 border border-orange-200 p-3 rounded-xl text-sm font-bold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-orange-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
            Filtrar por Emprendimiento
          </label>
          <select
            value={selectedEntrepreneurId}
            onChange={(e) => {
              setSelectedEntrepreneurId(e.target.value);
              setSelectedProductId('');
            }}
            className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-medium"
          >
            <option value="">Todos los Emprendimientos</option>
            {entrepreneurs.map((emp) => (
              <option key={emp.id} value={emp.id}>
                [{emp.codigo}] {emp.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
            Filtrar por Producto
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-medium"
          >
            <option value="">Todos los Productos</option>
            {products
              .filter((p) => !selectedEntrepreneurId || p.emprendimientoId === selectedEntrepreneurId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.codigo}] {p.nombre} (Stock: {p.stockCalculado ?? 0})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Historial de Movimientos de Stock */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-slate-500" />
            <h3 className="font-extrabold text-slate-800 text-base">Historial de Movimientos</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{movements.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Emprendimiento</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4">Observaciones</th>
                <th className="py-3 px-4">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No se registraron movimientos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-1 rounded">{m.producto?.codigo}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{m.producto?.nombre}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-bold text-slate-800">[{m.producto?.emprendimiento?.codigo}]</span>{' '}
                      {m.producto?.emprendimiento?.nombre}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                          m.tipoMovimiento === 'INGRESO'
                            ? 'bg-orange-100 text-orange-800'
                            : m.tipoMovimiento === 'DEVOLUCION'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.tipoMovimiento}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-slate-900">
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad} u.
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{m.observaciones || '-'}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs font-semibold">{m.usuario || 'admin'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Movimiento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-xl text-slate-900">Registrar Movimiento de Stock</h3>

            <form onSubmit={handleSubmitMovement} className="space-y-4">
              {/* Emprendimiento */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  1. Emprendimiento
                </label>
                <select
                  value={formEmpId}
                  onChange={(e) => {
                    const newEmp = e.target.value;
                    setFormEmpId(newEmp);
                    const firstProd = products.find((p) => p.emprendimientoId === newEmp);
                    setFormProdId(firstProd?.id || '');
                  }}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                >
                  {entrepreneurs.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.codigo}] {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Producto */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  2. Producto
                </label>
                <select
                  value={formProdId}
                  onChange={(e) => setFormProdId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Seleccionar producto...</option>
                  {availableProductsForForm.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.nombre} (Stock actual: {p.stockCalculado ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha rápida de stock actual */}
              {selectedFormProduct && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Stock Actual en Sistema:</span>
                  <span className="font-black text-sm bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                    {selectedFormProduct.stockCalculado ?? 0} unidades
                  </span>
                </div>
              )}

              {/* Tipo y Cantidad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Tipo de Movimiento
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as TipoMovimientoStock)}
                    className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  >
                    <option value="INGRESO">INGRESO (Reposición)</option>
                    <option value="AJUSTE">AJUSTE (Inventario)</option>
                    <option value="DEVOLUCION">DEVOLUCIÓN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={formCantidad}
                    onChange={(e) => setFormCantidad(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-black border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Fecha del Movimiento
                </label>
                <input
                  type="date"
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Ej: Reposición feria fin de semana..."
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
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
                  disabled={formSaving}
                  className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {formSaving ? 'Registrando...' : 'Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
