import { prisma } from '../db';
import { productService } from './productService';
import { DashboardStats } from '../../src/types';

export const statisticsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    // Use UTC to avoid timezone inconsistencies
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const activeFilter = { estado: 'ACTIVO' as const };

    // All independent aggregate queries in parallel
    const [
      emprendimientosActivos,
      productosActivos,
      // Ventas totales
      ventasTotalesAgg,
      ventasEfectivoAgg,
      ventasTransferenciaAgg,
      unidadesAgg,
      // Ventas hoy
      ventasHoyCount,
      montoHoyAgg,
      // Ventas mes
      ventasMesCount,
      montoMesAgg,
      // Ventas por turno
      ventasMananaAgg,
      ventasTardeAgg,
      // Ventas por tipo cliente
      ventasResidentesAgg,
      ventasTuristasAgg,
      // Retiros
      retirosAgg,
      // Retiros hoy
      retirosHoyAgg,
      // Ingresos stock hoy
      ingresosStockHoyAgg,
      // Últimas 10 ventas
      ultimasVentas,
      // Últimos 8 movimientos de stock
      ultimosMovimientosStock,
      // Últimos 8 retiros
      ultimosRetiros,
      // Productos bajo stock
      lowStockProducts,
    ] = await Promise.all([
      prisma.emprendimiento.count({ where: { activo: true } }),
      prisma.producto.count({ where: { activo: true } }),
      // Ventas totales
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: activeFilter,
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        where: { ...activeFilter, metodoPago: 'EFECTIVO' },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        where: { ...activeFilter, metodoPago: 'TRANSFERENCIA' },
      }),
      prisma.venta.aggregate({
        _sum: { cantidad: true },
        where: activeFilter,
      }),
      // Ventas hoy
      prisma.venta.count({
        where: { ...activeFilter, fecha: { gte: startOfToday } },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        where: { ...activeFilter, fecha: { gte: startOfToday } },
      }),
      // Ventas mes
      prisma.venta.count({
        where: { ...activeFilter, fecha: { gte: startOfMonth } },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        where: { ...activeFilter, fecha: { gte: startOfMonth } },
      }),
      // Ventas por turno
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { ...activeFilter, turno: 'MANANA' },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { ...activeFilter, turno: 'TARDE' },
      }),
      // Ventas por tipo cliente
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { ...activeFilter, tipoCliente: 'RESIDENTE' },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { ...activeFilter, tipoCliente: 'TURISTA' },
      }),
      // Retiros
      prisma.retiro.aggregate({
        _sum: { monto: true },
        where: activeFilter,
      }),
      // Retiros hoy
      prisma.retiro.aggregate({
        _sum: { monto: true },
        where: { ...activeFilter, fecha: { gte: startOfToday } },
      }),
      // Ingresos stock hoy
      prisma.movimientoStock.aggregate({
        _sum: { cantidad: true },
        where: { tipoMovimiento: 'INGRESO', fecha: { gte: startOfToday } },
      }),
      // Últimas 10 ventas (findMany)
      prisma.venta.findMany({
        where: activeFilter,
        include: {
          producto: true,
          emprendimiento: true,
        },
        orderBy: { fecha: 'desc' },
        take: 10,
      }),
      // Últimos 8 movimientos de stock
      prisma.movimientoStock.findMany({
        take: 8,
        orderBy: { fecha: 'desc' },
        include: {
          producto: {
            include: { emprendimiento: true },
          },
        },
      }),
      // Últimos 8 retiros
      prisma.retiro.findMany({
        where: activeFilter,
        take: 8,
        orderBy: { fecha: 'desc' },
        include: {
          emprendimiento: true,
        },
      }),
      // Productos bajo stock
      productService.getAll({ soloActivos: true }),
    ]);

    const ventasEfectivo = ventasEfectivoAgg._sum.total || 0;
    const totalRetirado = retirosAgg._sum.monto || 0;
    const efectivoCajaChica = Math.round((ventasEfectivo - totalRetirado) * 100) / 100;

    const productosBajoStock = lowStockProducts
      .filter((p) => (p.stockCalculado ?? 0) <= p.stockMinimoAlerta)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        emprendimientoCodigo: p.emprendimiento.codigo,
        emprendimientoNombre: p.emprendimiento.nombre,
        stock: p.stockCalculado ?? 0,
        stockMinimo: p.stockMinimoAlerta,
      }));

    return {
      ventasHoy: ventasHoyCount,
      montoHoy: montoHoyAgg._sum.total || 0,
      ventasMes: ventasMesCount,
      montoMes: montoMesAgg._sum.total || 0,
      ventasEfectivo,
      ventasTransferencia: ventasTransferenciaAgg._sum.total || 0,
      unidadesVendidasTotal: unidadesAgg._sum.cantidad || 0,
      emprendimientosActivos,
      productosActivos,
      efectivoCajaChica,
      totalRetirado,
      ingresosStockHoy: ingresosStockHoyAgg._sum.cantidad || 0,
      retirosHoy: retirosHoyAgg._sum.monto || 0,
      ultimosMovimientosStock: ultimosMovimientosStock as any,
      ultimosRetiros: ultimosRetiros as any,
      productosBajoStock,
      ultimasVentas: ultimasVentas as any,
      ventasPorTurno: {
        manana: { cantidad: ventasMananaAgg._count, total: ventasMananaAgg._sum.total || 0 },
        tarde: { cantidad: ventasTardeAgg._count, total: ventasTardeAgg._sum.total || 0 },
      },
      ventasPorTipoCliente: {
        residentes: { cantidad: ventasResidentesAgg._count, total: ventasResidentesAgg._sum.total || 0 },
        turistas: { cantidad: ventasTuristasAgg._count, total: ventasTuristasAgg._sum.total || 0 },
      },
    };
  },
};
