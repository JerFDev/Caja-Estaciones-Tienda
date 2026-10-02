import React from 'react';
import {
  TrendingUp,
  Banknote,
  Smartphone,
  Users,
  Package,
  Boxes,
  ArrowDownCircle,
  Receipt,
  ShoppingCart,
  Percent,
  Search,
  Filter,
  Ban,
  ArrowRight,
  AlertTriangle,
  Sun,
  Moon,
  MapPin,
  Compass,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MetricCard,
  SimpleBarChart,
  DonutChart,
  RankingBarList,
  BarChartItem,
  DonutItem,
  RankingItem,
} from './charts/AnalyticsCharts';
import { Venta, Emprendimiento, Producto, Retiro } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface GeneralSummaryDashboardProps {
  sales: Venta[];
  ventures: Emprendimiento[];
  products: Producto[];
  withdrawals: Retiro[];
  totalStockAvailable: number;
  onVoidSale?: (sale: Venta) => void;
}

export const GeneralSummaryDashboard: React.FC<GeneralSummaryDashboardProps> = ({
  sales,
  ventures,
  products,
  withdrawals,
  totalStockAvailable,
  onVoidSale,
}) => {
  // Only active sales count towards revenue and KPIs
  const activeSales = sales.filter((s) => s.estado === 'ACTIVO');

  // KPIs
  const totalVentas = activeSales.reduce((sum, s) => sum + s.total, 0);
  const cantidadVentas = activeSales.length;
  const unidadesVendidas = activeSales.reduce((sum, s) => sum + s.cantidad, 0);
  const ticketPromedio = cantidadVentas > 0 ? Math.round(totalVentas / cantidadVentas) : 0;

  const ventasEfectivo = activeSales
    .filter((s) => s.metodoPago === 'EFECTIVO')
    .reduce((sum, s) => sum + s.total, 0);

  const ventasTransferencia = activeSales
    .filter((s) => s.metodoPago === 'TRANSFERENCIA')
    .reduce((sum, s) => sum + s.total, 0);

  const totalRetiros = withdrawals
    .filter((w) => w.estado === 'ACTIVO')
    .reduce((sum, w) => sum + w.monto, 0);

  const emprendimientosActivos = ventures.filter((v) => v.activo).length;
  const productosRegistrados = products.filter((p) => p.activo).length;

  // Segmentaciones adicionales integradas en Resumen General
  const salesWithDiscount = activeSales.filter((s) => s.descuento && s.descuento > 0);
  const totalDescuentos = salesWithDiscount.reduce((sum, s) => sum + (s.descuento || 0), 0);
  const totalManana = activeSales.filter((s) => s.turno === 'MANANA').reduce((sum, s) => sum + s.total, 0);
  const totalTarde = activeSales.filter((s) => s.turno === 'TARDE').reduce((sum, s) => sum + s.total, 0);
  const totalResidentes = activeSales.filter((s) => s.tipoCliente === 'RESIDENTE').reduce((sum, s) => sum + s.total, 0);
  const totalTuristas = activeSales.filter((s) => s.tipoCliente === 'TURISTA').reduce((sum, s) => sum + s.total, 0);

  const productosSinStock = products.filter((p) => (p.stockCalculado ?? 0) === 0).length;
  const productosBajoStock = products.filter(
    (p) => (p.stockCalculado ?? 0) > 0 && (p.stockCalculado ?? 0) <= (p.stockMinimoAlerta || 2)
  ).length;

  // Chart 1: Ventas por Mes (Jan to Dec)
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlySales = new Array(12).fill(0);
  activeSales.forEach((s) => {
    const d = new Date(s.fecha);
    const m = d.getMonth();
    if (m >= 0 && m < 12) {
      monthlySales[m] += s.total;
    }
  });

  const barChartData: BarChartItem[] = monthNames.map((name, idx) => ({
    label: name,
    value: monthlySales[idx],
  }));

  // Chart 2: Ventas por Emprendimiento (Top 5)
  const ventureSalesMap = new Map<string, { id: string; name: string; code: string; total: number; units: number }>();
  activeSales.forEach((s) => {
    const vId = s.emprendimientoId;
    const existing = ventureSalesMap.get(vId) || {
      id: vId,
      name: s.emprendimiento?.nombre || 'Emprendimiento',
      code: s.emprendimiento?.codigo || '',
      total: 0,
      units: 0,
    };
    existing.total += s.total;
    existing.units += s.cantidad;
    ventureSalesMap.set(vId, existing);
  });

  const topVentures: RankingItem[] = Array.from(ventureSalesMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((v, i) => ({
      id: v.id,
      rank: i + 1,
      title: v.name,
      subtitle: `Cód: ${v.code} • ${v.units} unidades vendidas`,
      value: v.total,
    }));

  // Chart 3: Medio de pago (Efectivo vs Transferencia)
  const paymentChartData: DonutItem[] = [
    {
      label: 'Efectivo en Caja',
      value: ventasEfectivo,
      color: '#ea580c', // orange-600
    },
    {
      label: 'Transferencias',
      value: ventasTransferencia,
      color: '#2563eb', // blue-600
    },
  ];

  // Chart 4: Productos más vendidos (Top 5)
  const productSalesMap = new Map<string, { id: string; name: string; code: string; units: number; total: number }>();
  activeSales.forEach((s) => {
    const pId = s.productoId;
    const existing = productSalesMap.get(pId) || {
      id: pId,
      name: s.producto?.nombre || 'Producto',
      code: s.producto?.codigo || '',
      units: 0,
      total: 0,
    };
    existing.units += s.cantidad;
    existing.total += s.total;
    productSalesMap.set(pId, existing);
  });

  const topProducts: RankingItem[] = Array.from(productSalesMap.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((p, i) => ({
      id: p.id,
      rank: i + 1,
      title: p.name,
      subtitle: `[${p.code}] • ${p.units} u. vendidas`,
      value: p.total,
    }));

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. KPIs PRINCIPALES (10 INDICADORES SOLICITADOS) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Ventas Totales"
          value={formatCurrency(totalVentas)}
          subtitle={`${cantidadVentas} operaciones`}
          icon={TrendingUp}
          iconColor="text-orange-600 bg-orange-50"
        />

        <MetricCard
          title="Cantidad Ventas"
          value={cantidadVentas}
          subtitle="Tickets emitidos"
          icon={Receipt}
          iconColor="text-slate-700 bg-slate-100"
        />

        <MetricCard
          title="Productos Vendidos"
          value={`${unidadesVendidas} u.`}
          subtitle="Unidades totales"
          icon={ShoppingCart}
          iconColor="text-indigo-600 bg-indigo-50"
        />

        <MetricCard
          title="Ticket Promedio"
          value={formatCurrency(ticketPromedio)}
          subtitle="Gasto medio por compra"
          icon={Percent}
          iconColor="text-amber-600 bg-amber-50"
        />

        <MetricCard
          title="Efectivo en Caja"
          value={formatCurrency(ventasEfectivo)}
          subtitle="Cobrado en billetes"
          icon={Banknote}
          iconColor="text-emerald-600 bg-emerald-50"
        />

        <MetricCard
          title="Transferencias"
          value={formatCurrency(ventasTransferencia)}
          subtitle="Alias o CVU directo"
          icon={Smartphone}
          iconColor="text-blue-600 bg-blue-50"
        />

        <MetricCard
          title="Retiros Entregados"
          value={formatCurrency(totalRetiros)}
          subtitle="Pagado a emprendedores"
          icon={ArrowDownCircle}
          iconColor="text-rose-600 bg-rose-50"
        />

        <MetricCard
          title="Stock Disponible"
          value={`${totalStockAvailable} u.`}
          subtitle="En local actualmente"
          icon={Boxes}
          iconColor="text-purple-600 bg-purple-50"
        />

        <MetricCard
          title="Emprendimientos"
          value={emprendimientosActivos}
          subtitle="Participando activos"
          icon={Users}
          iconColor="text-teal-600 bg-teal-50"
        />

        <MetricCard
          title="Productos en Catálogo"
          value={productosRegistrados}
          subtitle="Artículos registrados"
          icon={Package}
          iconColor="text-cyan-600 bg-cyan-50"
        />
      </div>

      {/* ============================================================ */}
      {/* 2. GRÁFICOS PRINCIPALES DEL RESUMEN */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Ventas por Mes */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">Ventas por Mes</h3>
              <p className="text-xs text-slate-400 font-medium">
                Distribución mensual de la facturación en el período
              </p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl">
              Anual / Filtrado
            </span>
          </div>
          <SimpleBarChart data={barChartData} height={200} barColor="bg-orange-500 hover:bg-orange-600" />
        </div>

        {/* Gráfico 2: Medio de Pago */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800">Distribución por Medio de Pago</h3>
            <p className="text-xs text-slate-400 font-medium">Efectivo vs. Transferencias bancarias</p>
          </div>
          <div className="py-2">
            <DonutChart
              data={paymentChartData}
              centerLabel="Total Cobrado"
              centerValue={formatCurrency(totalVentas)}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. RANKINGS: EMPRENDIMIENTOS Y PRODUCTOS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Emprendimientos */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">Top Emprendimientos</h3>
              <p className="text-xs text-slate-400 font-medium">Mayor volumen de facturación generada</p>
            </div>
            <Link
              to="/emprendimientos"
              className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center space-x-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <RankingBarList items={topVentures} barColor="bg-orange-500" emptyMessage="Sin ventas registradas para este filtro" />
        </div>

        {/* Ranking Productos */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">Productos Más Vendidos</h3>
              <p className="text-xs text-slate-400 font-medium">Artículos con mayor cantidad de unidades despachadas</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
              Top 5
            </span>
          </div>
          <RankingBarList items={topProducts} barColor="bg-indigo-600" emptyMessage="Sin productos vendidos para este filtro" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. SEGMENTACIÓN DE TURNOS, CLIENTES Y ESTADO DE STOCK */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Turnos */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Ventas por Turno
          </span>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold">
                <Sun className="w-3.5 h-3.5" />
                <span>Mañana</span>
              </div>
              <p className="font-black text-slate-900 text-base mt-1">{formatCurrency(totalManana)}</p>
            </div>
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
              <div className="flex items-center space-x-1.5 text-indigo-800 text-xs font-bold">
                <Moon className="w-3.5 h-3.5" />
                <span>Tarde</span>
              </div>
              <p className="font-black text-slate-900 text-base mt-1">{formatCurrency(totalTarde)}</p>
            </div>
          </div>
        </div>

        {/* Perfil de Compradores */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Perfil de Compradores
          </span>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="flex items-center space-x-1.5 text-teal-800 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Residentes</span>
              </div>
              <p className="font-black text-slate-900 text-base mt-1">{formatCurrency(totalResidentes)}</p>
            </div>
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
              <div className="flex items-center space-x-1.5 text-purple-800 text-xs font-bold">
                <Compass className="w-3.5 h-3.5" />
                <span>Turistas</span>
              </div>
              <p className="font-black text-slate-900 text-base mt-1">{formatCurrency(totalTuristas)}</p>
            </div>
          </div>
        </div>

        {/* Estado de Stock & Descuentos */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Alertas de Stock & Descuentos
          </span>
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Agotados / Bajo</span>
                <span className="font-black text-rose-700 text-base">
                  {productosSinStock} / {productosBajoStock}
                </span>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>

            <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-orange-800 font-bold block">Descuentos</span>
                <span className="font-black text-orange-900 text-sm">
                  {formatCurrency(totalDescuentos)}
                </span>
              </div>
              <Tag className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. SUPERVISIÓN DE ÚLTIMAS OPERACIONES (CONSERVADO CON ANULACIÓN) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Últimas Operaciones Registradas</h3>
              <p className="text-xs text-slate-400 font-medium">
                Supervisión general de tickets y control administrativo de caja
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {sales.length} tickets en período
          </span>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium text-xs">
              No hay ventas registradas con los filtros seleccionados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha / Ticket</th>
                  <th className="py-3 px-4">Emprendimiento</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-3 text-center">Cant.</th>
                  <th className="py-3 px-3">Precio Unit.</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Cobro</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  {onVoidSale && <th className="py-3 px-4 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sales.slice(0, 30).map((sale) => (
                  <tr
                    key={sale.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      sale.estado === 'ANULADO' ? 'bg-rose-50/30 text-slate-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{formatDateTime(sale.fecha)}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        {sale.identificadorUnico}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {sale.emprendimiento?.nombre || sale.emprendimientoId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700 mr-1.5">
                        {sale.producto?.codigo}
                      </span>
                      <span className={sale.estado === 'ANULADO' ? 'line-through text-slate-400' : 'text-slate-800'}>
                        {sale.producto?.nombre}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-800">{sale.cantidad}</td>
                    <td className="py-3 px-3 text-slate-600 font-semibold">{formatCurrency(sale.precioUnitario)}</td>
                    <td className="py-3 px-3 font-black text-slate-900">
                      <div>{formatCurrency(sale.total)}</div>
                      {sale.descuento && sale.descuento > 0 ? (
                        <div className="text-[10px] font-bold text-emerald-600">
                          Desc. -{formatCurrency(sale.descuento)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.metodoPago === 'EFECTIVO'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {sale.metodoPago}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.estado}
                      </span>
                    </td>
                    {onVoidSale && (
                      <td className="py-3 px-4 text-right">
                        {sale.estado === 'ACTIVO' ? (
                          <button
                            type="button"
                            onClick={() => onVoidSale(sale)}
                            className="inline-flex items-center space-x-1 text-rose-600 hover:text-white hover:bg-rose-600 px-2 py-1 rounded-lg font-bold border border-rose-200 transition-all text-[11px] cursor-pointer"
                            title="Anular venta y reintegrar stock"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Anular</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Reintegrado</span>
                        )}
                      </td>
                    )}
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
