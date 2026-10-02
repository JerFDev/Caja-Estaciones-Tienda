import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Filter,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Producto, Emprendimiento } from '../types';
import { formatCurrency } from '../utils/formatters';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Producto[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<Emprendimiento[]>([]);
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    emprendimientoId: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    stockMinimoAlerta: 2,
    stockInicial: 0,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadEntrepreneurs();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedEntrepreneurId, search, includeInactive]);

  const loadEntrepreneurs = async () => {
    try {
      const data = await api.getEntrepreneurs(true);
      setEntrepreneurs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts({
        emprendimientoId: selectedEntrepreneurId || undefined,
        search: search || undefined,
        inactivos: includeInactive,
      });
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      codigo: '',
      emprendimientoId: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      stockMinimoAlerta: 2,
      stockInicial: 0,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (p: Producto) => {
    setEditingProduct(p);
    setFormData({
      codigo: p.codigo,
      emprendimientoId: p.emprendimientoId,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio,
      stockMinimoAlerta: p.stockMinimoAlerta,
      stockInicial: 0,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleAutoGenerateCode = async (empId: string) => {
    if (!empId) return;
    try {
      const { nextCode } = await api.getNextProductCode(empId);
      setFormData((prev) => ({ ...prev, codigo: nextCode }));
    } catch (e: any) {
      console.error('Error generando código:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setModalError('El nombre del producto es obligatorio.');
      return;
    }
    if (formData.precio < 0) {
      setModalError('El precio no puede ser negativo.');
      return;
    }
    if (!formData.emprendimientoId) {
      alert('Debes seleccionar un emprendimiento.');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: Number(formData.precio),
          stockMinimoAlerta: Number(formData.stockMinimoAlerta),
        });
      } else {
        await api.createProduct({
          codigo: formData.codigo,
          emprendimientoId: formData.emprendimientoId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: Number(formData.precio),
          stockMinimoAlerta: Number(formData.stockMinimoAlerta),
          stockInicial: Number(formData.stockInicial),
        });
      }

      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.toggleProductActive(id);
      await loadProducts();
    } catch (e: any) {
      alert(e.message || 'Error al alternar estado.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo de Productos</h2>
          <p className="text-sm text-slate-500 font-medium">
            Gestión de artículos, precios oficiales, códigos únicos y existencias
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer self-start"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o emprendimiento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedEntrepreneurId}
              onChange={(e) => setSelectedEntrepreneurId(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none font-medium text-slate-700"
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

        <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer select-none self-end md:self-center">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
          />
          <span>Mostrar inactivos</span>
        </label>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Emprendimiento</th>
                <th className="py-3 px-4 text-right">Precio</th>
                <th className="py-3 px-4 text-center">Stock Actual</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No se encontraron productos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const stock = p.stockCalculado ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-1 rounded">{p.codigo}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.nombre}</p>
                        {p.descripcion && <p className="text-xs text-slate-400">{p.descripcion}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        <span className="font-bold text-slate-800">[{p.emprendimiento?.codigo}]</span>{' '}
                        {p.emprendimiento?.nombre}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(p.precio)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-full ${
                            stock > p.stockMinimoAlerta
                              ? 'bg-orange-100 text-orange-800'
                              : stock > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stock} u.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                            p.activo ? 'bg-orange-50 text-orange-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(p.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title={p.activo ? 'Desactivar producto' : 'Activar producto'}
                        >
                          {p.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-xl text-slate-900">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>

            {modalError && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Emprendimiento */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Emprendimiento Responsable
                </label>
                <select
                  value={formData.emprendimientoId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setFormData((prev) => ({ ...prev, emprendimientoId: empId }));
                    if (!editingProduct) handleAutoGenerateCode(empId);
                  }}
                  disabled={!!editingProduct}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="">-- Seleccionar emprendimiento --</option>
                  {entrepreneurs.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.codigo}] {emp.nombre} ({emp.rubro || 'Sin rubro'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Código */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Código Único de Producto
                  </label>
                  {!editingProduct && (
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode(formData.emprendimientoId)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center space-x-1"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Autogenerar</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ej: AKM001"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  disabled={!!editingProduct}
                  className="w-full px-3 py-2 text-sm font-mono font-bold uppercase border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  placeholder="Ej: AROS ALPACA CALADA"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Precio y Stock Mínimo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Precio de Venta ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-base font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Alerta Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockMinimoAlerta}
                    onChange={(e) =>
                      setFormData({ ...formData, stockMinimoAlerta: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-base font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock Inicial (sólo al crear) */}
              {!editingProduct && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Stock Inicial Ingresado (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockInicial}
                    onChange={(e) =>
                      setFormData({ ...formData, stockInicial: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}

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
                  disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
