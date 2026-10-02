import { prisma } from '../db';
import { SaldoEmprendimiento } from '../../src/types';

export const balancesService = {
  async getBalances(incluirInactivos = false): Promise<SaldoEmprendimiento[]> {
    const emprendimientos = await prisma.emprendimiento.findMany({
      where: incluirInactivos ? {} : { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        productos: {
          select: { id: true },
        },
      },
    });

    const results: SaldoEmprendimiento[] = [];

    for (const emp of emprendimientos) {
      const productIds = emp.productos.map((p) => p.id);

      // Ventas activas del emprendimiento
      const ventas = await prisma.venta.findMany({
        where: {
          emprendimientoId: emp.id,
          estado: 'ACTIVO',
        },
        select: {
          total: true,
          cantidad: true,
          metodoPago: true,
        },
      });

      let ventasTotales = 0;
      let ventasEfectivo = 0;
      let ventasTransferencia = 0;
      let unidadesVendidas = 0;

      for (const v of ventas) {
        ventasTotales += v.total;
        unidadesVendidas += v.cantidad;
        if (v.metodoPago === 'EFECTIVO') {
          ventasEfectivo += v.total;
        } else if (v.metodoPago === 'TRANSFERENCIA') {
          ventasTransferencia += v.total;
        }
      }

      // Retiros activos
      const retirosAgg = await prisma.retiro.aggregate({
        _sum: { monto: true },
        where: {
          emprendimientoId: emp.id,
          estado: 'ACTIVO',
        },
      });
      const totalRetiros = retirosAgg._sum.monto || 0;

      // Unidades de stock (suma de todos los movimientos: INGRESO, AJUSTE, DEVOLUCION)
      let unidadesMovimientos = 0;
      if (productIds.length > 0) {
        const movimientosAgg = await prisma.movimientoStock.aggregate({
          _sum: { cantidad: true },
          where: {
            productoId: { in: productIds },
          },
        });
        unidadesMovimientos = movimientosAgg._sum.cantidad || 0;
      }

      const stockActual = Math.max(0, unidadesMovimientos - unidadesVendidas);
      const retencionPorc = emp.porcentajeRetencion || 0;
      const montoRetencion = Math.round((ventasTotales * retencionPorc) / 100 * 100) / 100;
      const saldoEfectivoDisponible = Math.round((ventasEfectivo - totalRetiros - montoRetencion) * 100) / 100;

      results.push({
        id: emp.id,
        codigo: emp.codigo,
        nombre: emp.nombre,
        responsable: emp.responsable,
        rubro: emp.rubro,
        porcentajeRetencion: retencionPorc,
        ventasTotales,
        ventasEfectivo,
        ventasTransferencia,
        cantidadVentas: ventas.length,
        unidadesVendidas,
        totalRetiros,
        montoRetencion,
        saldoEfectivoDisponible,
        unidadesIngresadas: unidadesMovimientos,
        stockActual,
      });
    }

    return results;
  },

  async getBalanceByEntrepreneurId(id: string): Promise<SaldoEmprendimiento | null> {
    const list = await this.getBalances(true);
    return list.find((b) => b.id === id) || null;
  },
};
