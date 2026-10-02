import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Copy,
  Check,
  Plus,
  ArrowDownCircle,
  Package,
  History,
  TrendingUp,
  Wallet,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Tag,
  MinusCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  Emprendimiento,
  Producto,
  Venta,
  MovimientoStock,
  Retiro,
  SaldoEmprendimiento,
  TipoMovimientoStock,
} from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface VentureDetailModalProps {
  venture: Emprendimiento | null;
  isOpen: boolean;
  onClose: () => void;
  onVentureUpdated: () => void;
}

type TabType = 'productos' | 'ventas' | 'stock' | 'retiros';

export const VentureDetailModal: React.FC<VentureDetailModalProps> = ({
  venture,
  isOpen,
  onClose,
  onVentureUpdated,
}) => {
  const { isEmprendedor } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('productos');
  const [balance, setBalance] = useState<SaldoEmprendimiento | null>(null);
  const [products, setProducts] = useState<Producto[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [stockMovements, setStockMovements] = useState<MovimientoStock[]>([]);
  const [withdrawals, setWithdrawals] = useState<Retiro[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);

  // Submodales de acción
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    stockMinimoAlerta: 2,
    stockInicial: 0,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({
    productoId: '',
    cantidad: 1,
    tipoMovimiento: 'INGRESO' as TipoMovimientoStock,
    observaciones: '',
  });
  const [savingStock, setSavingStock] = useState(false);

  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    monto: 0,
    observaciones: '',
  });
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);

  // Modal para anular venta
  const [voidingSale, setVoidingSale] = useState<Venta | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Cargar todos los datos cuando se abre la ficha
  useEffect(() => {
    if (isOpen && venture) {
      loadAllData();
    }
  }, [isOpen, venture]);

  const loadAllData = async () => {
    if (!venture) return;
    try {
      setLoadingData(true);
      const [bal, prods, sls, movs, rets] = await Promise.all([
        api.getBalanceById(venture.id).catch(() => null),
        api.getProducts({ emprendimientoId: venture.id, inactivos: true }),
        api.getSales({ emprendimientoId: venture.id }),
        api.getStockMovements({ emprendimientoId: venture.id }),
        api.getWithdrawals({ emprendimientoId: venture.id }),
      ]);
      setBalance(bal);
      setProducts(prods);
      setSales(sls);
      setStockMovements(movs);
      setWithdrawals(rets);
    } catch (e) {
      console.error('Error cargando ficha del emprendimiento:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCopyAlias = () => {
    if (venture?.alias) {
      navigator.clipboard.writeText(venture.alias);
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    }
  };

  // 1. Crear Producto
  const handleOpenCreateProduct = async () => {
    if (!venture) return;
    try {
      const { nextCode } = await api.getNextProductCode(venture.id);
      setProductForm({
        codigo: nextCode,
        nombre: '',
        descripcion: '',
        precio: 0,
        stockMinimoAlerta: 2,
        stockInicial: 0,
      });
      setShowProductModal(true);
    } catch (e: any) {
      alert(e.message || 'Error al obtener código');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venture) return;
    if (!productForm.nombre.trim()) {
      alert('El nombre del producto es obligatorio.');
      return;
    }
    if (productForm.precio < 0) {
      alert('El precio no puede ser negativo.');
      return;
    }
    try {
      setSavingProduct(true);
      await api.createProduct({
        codigo: productForm.codigo,
        emprendimientoId: venture.id,
        nombre: productForm.nombre.trim(),
        descripcion: productForm.descripcion.trim(),
        precio: Number(productForm.precio),
        stockMinimoAlerta: Number(productForm.stockMinimoAlerta) || 2,
        stockInicial: Number(productForm.stockInicial) || 0,
      });
      setShowProductModal(false);
      await loadAllData();
      onVentureUpdated();
    } catch (e: any) {
      alert(e.message || 'Error al crear producto');
    } finally {
      setSavingProduct(false);
    }
  };

  // 2. Ingresar / Eliminar Stock
  const handleOpenStockModal = (presetProductId?: string, defaultTipo: TipoMovimientoStock = 'INGRESO') => {
    setStockForm({
      productoId: presetProductId || (products[0]?.id ?? ''),
      cantidad: 1,
      tipoMovimiento: defaultTipo,
      observaciones: '',
    });
    setShowStockModal(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.productoId) {
      alert('Selecciona un producto.');
      return;
    }
    const qty = Number(stockForm.cantidad);
    if (!qty || qty <= 0) {
      alert('La cantidad debe ser un número mayor a 0.');
      return;
    }

    const selectedProd = products.find((p) => p.id === stockForm.productoId);
    const prodStock = selectedProd?.stockCalculado ?? 0;

    if (stockForm.tipoMovimiento === 'BAJA' && qty > prodStock) {
      alert(`No es posible eliminar ${qty} unidades. El producto solo cuenta con ${prodStock} unidades disponibles en stock.`);
      return;
    }

    try {
      setSavingStock(true);
      await api.createStockMovement({
        productoId: stockForm.productoId,
        cantidad: qty,
        tipoMovimiento: stockForm.tipoMovimiento,
        observaciones: stockForm.observaciones.trim() || undefined,
      });
      setShowStockModal(false);
      await loadAllData();
      onVentureUpdated();
    } catch (e: any) {
      alert(e.message || 'Error al registrar stock');
    } finally {
      setSavingStock(false);
    }
  };

  // 3. Registrar Retiro
  const handleOpenWithdrawalModal = () => {
    const maxRetirable = balance?.saldoEfectivoDisponible ?? 0;
    setWithdrawalForm({
      monto: maxRetirable > 0 ? maxRetirable : 0,
      observaciones: '',
    });
    setShowWithdrawalModal(true);
  };

  const handleSaveWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venture) return;
    const monto = Number(withdrawalForm.monto);
    if (monto <= 0) {
      alert('El monto a retirar debe ser mayor a $0.');
      return;
    }
    const maxRetirable = balance?.saldoEfectivoDisponible ?? 0;
    if (monto > maxRetirable) {
      const confirmExcedente = window.confirm(
        `El monto ($${monto.toLocaleString('es-AR')}) supera el saldo disponible en efectivo ($${maxRetirable.toLocaleString('es-AR')}). ¿Deseas solicitar autorización de excedente?`
      );
      if (!confirmExcedente) return;
    }
    try {
      setSavingWithdrawal(true);
      await api.createWithdrawal({
        emprendimientoId: venture.id,
        monto,
        observaciones: withdrawalForm.observaciones.trim() || undefined,
        permitirExcedente: monto > maxRetirable,
      });
      setShowWithdrawalModal(false);
      await loadAllData();
      onVentureUpdated();
    } catch (e: any) {
      alert(e.message || 'Error al registrar retiro');
    } finally {
      setSavingWithdrawal(false);
    }
  };

  // 4. Anular Venta
  const handleConfirmVoidSale = async () => {
    if (!voidingSale || !voidReason.trim()) return;
    try {
      await api.voidSale(voidingSale.id, voidReason);
      setVoidingSale(null);
      setVoidReason('');
      await loadAllData();
      onVentureUpdated();
    } catch (e: any) {
      alert(e.message || 'Error al anular venta');
    }
  };

  if (!isOpen || !venture) return null;

  const saldoDisponible = balance?.saldoEfectivoDisponible ?? 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[94vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera Principal */}
        <div className="bg-slate-900 text-white p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pr-10">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="font-mono text-xs font-black bg-orange-500 text-slate-950 px-2.5 py-1 rounded-md">
                  {venture.codigo}
                </span>
                {venture.rubro && (
                  <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
                    {venture.rubro}
                  </span>
                )}
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    venture.activo ? 'bg-orange-950 text-orange-300 border border-orange-800' : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {venture.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{venture.nombre}</h2>
              <p className="text-sm font-semibold text-slate-400 mt-0.5">
                Responsable: <span className="text-white">{venture.responsable}</span>
              </p>
            </div>

            {/* Datos de contacto y Alias Bancario Destacado */}
            <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
              {venture.alias && (
                <div className="flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl">
                  <CreditCard className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="text-slate-300 font-semibold">Alias:</span>
                  <span className="font-mono font-black text-orange-400 text-sm">{venture.alias}</span>
                  <button
                    onClick={handleCopyAlias}
                    className="p-1 hover:bg-orange-500/20 rounded text-orange-400 transition-colors"
                    title="Copiar alias"
                  >
                    {copiedAlias ? <Check className="w-3.5 h-3.5 text-orange-300" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {venture.telefono && (
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{venture.telefono}</span>
                </div>
              )}

              {venture.mail && (
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{venture.mail}</span>
                </div>
              )}

              {venture.direccion && (
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{venture.direccion}</span>
                </div>
              )}

              <div className="text-slate-400 font-semibold pl-1">
                Comisión: <strong className="text-white">{venture.porcentajeRetencion}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Rápidas y Tarjetas de Saldo */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 shrink-0 space-y-4">
          {/* Tarjetas de Saldos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Saldo Efectivo Disponible
              </span>
              <p
                className={`text-xl font-black mt-1 ${
                  saldoDisponible > 0 ? 'text-orange-600' : 'text-slate-700'
                }`}
              >
                {formatCurrency(saldoDisponible)}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block">Listo para retirar en caja</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Ventas Totales
              </span>
              <p className="text-xl font-black text-slate-800 mt-1">
                {formatCurrency(balance?.ventasTotales ?? 0)}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block">
                {balance?.unidadesVendidas ?? 0} unidades vendidas
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Retirado
              </span>
              <p className="text-xl font-black text-amber-600 mt-1">
                {formatCurrency(balance?.totalRetiros ?? 0)}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block">
                {withdrawals.filter((w) => w.estado === 'ACTIVO').length} retiros realizados
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Stock Total Actual
              </span>
              <p className="text-xl font-black text-indigo-600 mt-1">
                {balance?.stockActual ?? 0} u.
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block">
                En {products.length} productos registrados
              </span>
            </div>
          </div>

          {/* Botones de Acción Directa */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {!isEmprendedor && (
              <>
                <button
                  onClick={handleOpenCreateProduct}
                  className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Producto</span>
                </button>

                <button
                  onClick={() => handleOpenStockModal(undefined, 'INGRESO')}
                  disabled={products.length === 0}
                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Package className="w-4 h-4" />
                  <span>Ingresar Stock</span>
                </button>

                <button
                  onClick={() => handleOpenStockModal(undefined, 'BAJA')}
                  disabled={products.length === 0}
                  className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Eliminar / Baja Stock</span>
                </button>
              </>
            )}

            <button
              onClick={handleOpenWithdrawalModal}
              className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Registrar Retiro</span>
            </button>

            {isEmprendedor && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
                <span>👤</span>
                <span>Modo Emprendedor: Operación de Retiro en Efectivo habilitada</span>
              </span>
            )}

            {!isEmprendedor && <span className="text-slate-300">|</span>}

            {/* Pestañas de Navegación de Historial */}
            <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('productos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'productos'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Productos ({products.length})
              </button>

              <button
                onClick={() => setActiveTab('ventas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ventas'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ventas ({sales.length})
              </button>

              <button
                onClick={() => setActiveTab('stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stock'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Movimientos Stock ({stockMovements.length})
              </button>

              <button
                onClick={() => setActiveTab('retiros')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'retiros'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Retiros ({withdrawals.length})
              </button>
            </div>
          </div>
        </div>

        {/* Contenido Principal de las Pestañas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {loadingData ? (
            <div className="py-12 text-center text-slate-400 font-bold">Cargando información...</div>
          ) : (
            <>
              {/* TAB 1: PRODUCTOS */}
              {activeTab === 'productos' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Catálogo de Productos de {venture.nombre}
                    </h4>
                    <span className="text-xs text-slate-400 font-semibold">{products.length} productos</span>
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                      Este emprendimiento aún no tiene productos registrados.
                      {!isEmprendedor && (
                        <div className="mt-3">
                          <button
                            onClick={handleOpenCreateProduct}
                            className="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-orange-700"
                          >
                            Crear el primer producto
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Código</th>
                              <th className="py-3 px-4">Nombre</th>
                              <th className="py-3 px-4">Precio</th>
                              <th className="py-3 px-4">Stock Actual</th>
                              <th className="py-3 px-4">Estado</th>
                              {!isEmprendedor && <th className="py-3 px-4 text-right">Acciones</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {products.map((p) => {
                              const stock = p.stockCalculado ?? 0;
                              return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.codigo}</td>
                                  <td className="py-3 px-4 font-bold text-slate-900">{p.nombre}</td>
                                  <td className="py-3 px-4 font-bold text-orange-600">{formatCurrency(p.precio)}</td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
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
                                  <td className="py-3 px-4">
                                    <span
                                      className={`text-xs font-bold ${
                                        p.activo ? 'text-orange-600' : 'text-slate-400'
                                      }`}
                                    >
                                      {p.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </td>
                                  {!isEmprendedor && (
                                    <td className="py-3 px-4 text-right space-x-1.5">
                                      <button
                                        onClick={() => handleOpenStockModal(p.id, 'INGRESO')}
                                        className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                        title="Ingresar stock de reposición"
                                      >
                                        + Cargar Stock
                                      </button>
                                      <button
                                        onClick={() => handleOpenStockModal(p.id, 'BAJA')}
                                        className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                        title="Eliminar o dar de baja stock de este producto"
                                      >
                                        − Eliminar Stock
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VENTAS */}
              {activeTab === 'ventas' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Historial de Ventas Registradas
                    </h4>
                    <span className="text-xs text-slate-400 font-semibold">{sales.length} ventas</span>
                  </div>

                  {sales.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No hay ventas registradas para este emprendimiento.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Fecha / Hora</th>
                              <th className="py-3 px-4">Producto</th>
                              <th className="py-3 px-4">Cant.</th>
                              <th className="py-3 px-4">Total</th>
                              <th className="py-3 px-4">Medio Pago</th>
                              <th className="py-3 px-4">Cliente / Turno</th>
                              <th className="py-3 px-4">Estado</th>
                              {!isEmprendedor && <th className="py-3 px-4 text-right">Anular</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {sales.map((s) => (
                              <tr
                                key={s.id}
                                className={`hover:bg-slate-50 transition-colors ${
                                  s.estado === 'ANULADO' ? 'bg-red-50/40 opacity-60' : ''
                                }`}
                              >
                                <td className="py-3 px-4 text-xs text-slate-500">
                                  {formatDateTime(s.fecha)}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded mr-2">
                                    {s.producto?.codigo}
                                  </span>
                                  <span className="font-bold text-slate-800">{s.producto?.nombre}</span>
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-800">{s.cantidad} u.</td>
                                <td className="py-3 px-4 font-black text-slate-900">
                                  <div>{formatCurrency(s.total)}</div>
                                  {s.descuento && s.descuento > 0 ? (
                                    <div className="text-[10px] font-bold text-emerald-600">
                                      Desc. -{formatCurrency(s.descuento)}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                                      s.metodoPago === 'EFECTIVO'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {s.metodoPago}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-500">
                                  {s.tipoCliente} • {s.turno}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`text-xs font-bold ${
                                      s.estado === 'ACTIVO' ? 'text-orange-600' : 'text-red-600'
                                    }`}
                                  >
                                    {s.estado}
                                  </span>
                                </td>
                                {!isEmprendedor && (
                                  <td className="py-3 px-4 text-right">
                                    {s.estado === 'ACTIVO' && (
                                      <button
                                        onClick={() => setVoidingSale(s)}
                                        title="Anular venta"
                                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                                      >
                                        <RotateCcw className="w-4 h-4" />
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MOVIMIENTOS DE STOCK */}
              {activeTab === 'stock' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Movimientos e Ingresos de Stock
                    </h4>
                    {!isEmprendedor && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenStockModal(undefined, 'INGRESO')}
                          className="text-xs bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          + Nuevo Ingreso
                        </button>
                        <button
                          onClick={() => handleOpenStockModal(undefined, 'BAJA')}
                          className="text-xs bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          − Dar de Baja / Eliminar Stock
                        </button>
                      </div>
                    )}
                  </div>

                  {stockMovements.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No hay movimientos de stock registrados para este emprendimiento.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Producto</th>
                              <th className="py-3 px-4">Tipo Movimiento</th>
                              <th className="py-3 px-4">Cantidad</th>
                              <th className="py-3 px-4">Observaciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {stockMovements.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 text-xs text-slate-500">{formatDateTime(m.fecha)}</td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded mr-2">
                                    {m.producto?.codigo}
                                  </span>
                                  <span className="font-bold text-slate-800">{m.producto?.nombre}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                                      m.tipoMovimiento === 'INGRESO'
                                        ? 'bg-orange-100 text-orange-800'
                                        : m.tipoMovimiento === 'BAJA'
                                        ? 'bg-rose-100 text-rose-800'
                                        : m.tipoMovimiento === 'AJUSTE'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {m.tipoMovimiento}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-black">
                                  <span className={m.cantidad < 0 || m.tipoMovimiento === 'BAJA' ? 'text-rose-600' : 'text-slate-900'}>
                                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad} u.
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-500">
                                  {m.observaciones || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: RETIROS */}
              {activeTab === 'retiros' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Retiros de Efectivo Efectuados
                    </h4>
                    <button
                      onClick={handleOpenWithdrawalModal}
                      className="text-xs bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700"
                    >
                      + Registrar Retiro
                    </button>
                  </div>

                  {withdrawals.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No hay retiros registrados para este emprendimiento.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Monto Retirado</th>
                              <th className="py-3 px-4">Observaciones / Motivo</th>
                              <th className="py-3 px-4">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {withdrawals.map((w) => (
                              <tr
                                key={w.id}
                                className={`hover:bg-slate-50 transition-colors ${
                                  w.estado === 'ANULADO' ? 'bg-red-50/40 opacity-60' : ''
                                }`}
                              >
                                <td className="py-3 px-4 text-xs text-slate-500">{formatDateTime(w.fecha)}</td>
                                <td className="py-3 px-4 font-black text-amber-600 text-base">
                                  {formatCurrency(w.monto)}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">{w.observaciones || '-'}</td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`text-xs font-bold ${
                                      w.estado === 'ACTIVO' ? 'text-orange-600' : 'text-red-600'
                                    }`}
                                  >
                                    {w.estado}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SUBMODAL: CREAR PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900">
              Nuevo Producto para {venture.nombre}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Código (Autogenerado)
                </label>
                <input
                  type="text"
                  required
                  value={productForm.codigo}
                  onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aros de alpaca calada"
                  value={productForm.nombre}
                  onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Precio ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={productForm.precio}
                    onChange={(e) => setProductForm({ ...productForm, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-bold text-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stockInicial}
                    onChange={(e) => setProductForm({ ...productForm, stockInicial: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Alerta Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={productForm.stockMinimoAlerta}
                  onChange={(e) => setProductForm({ ...productForm, stockMinimoAlerta: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl disabled:opacity-50"
                >
                  {savingProduct ? 'Guardando...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMODAL: GESTIONAR STOCK (INGRESAR / ELIMINAR BAJA) */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {stockForm.tipoMovimiento === 'BAJA' ? (
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <MinusCircle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                    {stockForm.tipoMovimiento === 'BAJA' ? 'Eliminar / Dar de Baja Stock' : 'Ingresar Stock'}
                  </h3>
                  <p className="text-xs text-slate-500">{venture.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {stockForm.tipoMovimiento === 'BAJA' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <p className="font-bold">⚠️ Atención:</p>
                <p>Esta acción restará unidades del inventario del producto (por retiro directo del emprendedor, rotura, merma o daño).</p>
              </div>
            )}

            <form onSubmit={handleSaveStock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Producto de {venture.nombre} *
                </label>
                <select
                  required
                  value={stockForm.productoId}
                  onChange={(e) => setStockForm({ ...stockForm, productoId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-white focus:outline-none focus:border-orange-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.nombre} (Stock actual: {p.stockCalculado ?? 0} u.)
                    </option>
                  ))}
                </select>
                {(() => {
                  const currentP = products.find((p) => p.id === stockForm.productoId);
                  return (
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Stock actual disponible:{' '}
                      <span className="font-black text-slate-800">{currentP?.stockCalculado ?? 0} unidades</span>
                    </p>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Tipo de Operación
                  </label>
                  <select
                    value={stockForm.tipoMovimiento}
                    onChange={(e) =>
                      setStockForm({ ...stockForm, tipoMovimiento: e.target.value as TipoMovimientoStock })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="INGRESO">➕ INGRESO (Reposición)</option>
                    <option value="BAJA">➖ BAJA (Eliminar Stock)</option>
                    <option value="AJUSTE">🔄 AJUSTE (Corrección)</option>
                    <option value="DEVOLUCION">↩️ DEVOLUCIÓN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    {stockForm.tipoMovimiento === 'BAJA' ? 'Cant. a Eliminar *' : 'Cant. a Ingresar *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockForm.cantidad}
                    onChange={(e) => setStockForm({ ...stockForm, cantidad: parseInt(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 border rounded-xl text-sm font-black text-center text-lg ${
                      stockForm.tipoMovimiento === 'BAJA' ? 'text-rose-600 border-rose-300' : 'text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Motivo u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder={
                    stockForm.tipoMovimiento === 'BAJA'
                      ? 'Ej: Retiro por emprendedor, producto roto, merma...'
                      : 'Ej: Reposición de feria, entrega semanal...'
                  }
                  value={stockForm.observaciones}
                  onChange={(e) => setStockForm({ ...stockForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStock}
                  className={`px-5 py-2 text-sm font-black text-white rounded-xl disabled:opacity-50 transition-all shadow-sm ${
                    stockForm.tipoMovimiento === 'BAJA'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {savingStock
                    ? 'Guardando...'
                    : stockForm.tipoMovimiento === 'BAJA'
                    ? 'Confirmar Baja de Stock'
                    : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMODAL: REGISTRAR RETIRO */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900">
              Registrar Retiro de Efectivo • {venture.nombre}
            </h3>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="font-bold text-orange-800">Saldo Disponible en Efectivo:</span>
              <span className="font-black text-orange-700 text-sm">{formatCurrency(saldoDisponible)}</span>
            </div>

            <form onSubmit={handleSaveWithdrawal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Monto a Retirar ($) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={withdrawalForm.monto}
                  onChange={(e) =>
                    setWithdrawalForm({ ...withdrawalForm, monto: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 focus:border-amber-500 rounded-xl text-xl font-black text-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Detalles o Comprobante (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago quincenal de ventas, N° recibo..."
                  value={withdrawalForm.observaciones}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWithdrawal}
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50"
                >
                  {savingWithdrawal ? 'Registrando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMODAL: ANULAR VENTA */}
      {voidingSale && (
        <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-lg text-slate-900">Anular Venta</h3>
            </div>
            <p className="text-sm text-slate-600">
              ¿Confirmas anular la venta de <strong>{voidingSale.producto?.nombre}</strong> por{' '}
              <strong>{formatCurrency(voidingSale.total)}</strong>? El stock será reintegrado automáticamente.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Motivo de anulación (Obligatorio)
              </label>
              <input
                type="text"
                placeholder="Ej: Error de cobro, devolución..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVoidingSale(null);
                  setVoidReason('');
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidSale}
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
