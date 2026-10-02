import { prisma } from '../db';
import {
  SesionCaja,
  SesionCajaActualInfo,
  AperturaCajaDto,
  CierreCajaDto,
  DailySalesStats,
  Turno,
} from '../../src/types';

export const cashRegisterService = {
  /**
   * Obtiene el estado y métricas en vivo de la sesión de caja actual
   */
  async getCurrentSession(): Promise<SesionCajaActualInfo> {
    const sesion = await prisma.sesionCaja.findFirst({
      where: { estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' },
    });

    if (!sesion) {
      return {
        abierta: false,
        sesion: null,
      };
    }

    // Calcular ventas y retiros ocurridos desde la apertura de esta caja
    const [ventasEfectivoAgg, ventasTransfAgg, retirosAgg, cantidadVentas] = await Promise.all([
      prisma.venta.aggregate({
        _sum: { total: true },
        where: {
          estado: 'ACTIVO',
          metodoPago: 'EFECTIVO',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        where: {
          estado: 'ACTIVO',
          metodoPago: 'TRANSFERENCIA',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
      prisma.retiro.aggregate({
        _sum: { monto: true },
        where: {
          estado: 'ACTIVO',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
      prisma.venta.count({
        where: {
          estado: 'ACTIVO',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
    ]);

    const ventasEfectivo = ventasEfectivoAgg._sum.total || 0;
    const ventasTransferencia = ventasTransfAgg._sum.total || 0;
    const totalVentas = ventasEfectivo + ventasTransferencia;
    const totalRetiros = retirosAgg._sum.monto || 0;
    const montoEsperadoEfectivo =
      Math.round((sesion.montoInicial + ventasEfectivo - totalRetiros) * 100) / 100;

    return {
      abierta: true,
      sesion: sesion as any,
      totalesEnVivo: {
        ventasEfectivo,
        ventasTransferencia,
        totalVentas,
        cantidadVentas,
        totalRetiros,
        montoEsperadoEfectivo,
      },
    };
  },

  /**
   * Abre una nueva sesión de caja
   */
  async openRegister(data: AperturaCajaDto): Promise<SesionCaja> {
    // Verificar si ya existe una caja abierta
    const activa = await prisma.sesionCaja.findFirst({
      where: { estado: 'ABIERTA' },
    });

    if (activa) {
      throw new Error(
        'Ya existe una sesión de caja abierta actualmente. Debe cerrarla antes de iniciar una nueva.'
      );
    }

    const montoInicial = Number(data.montoInicial);
    if (isNaN(montoInicial) || montoInicial < 0) {
      throw new Error('El monto inicial en caja debe ser un número mayor o igual a 0.');
    }

    const sesion = await prisma.sesionCaja.create({
      data: {
        montoInicial,
        turno: data.turno || 'MANANA',
        usuarioApertura: data.usuario || 'cajero',
        observaciones: data.observaciones?.trim() || null,
        estado: 'ABIERTA',
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        entidad: 'VENTA',
        entidadId: sesion.id,
        accion: 'CREACION',
        usuario: data.usuario || 'cajero',
        detallesJson: JSON.stringify({
          tipo: 'APERTURA_CAJA',
          montoInicial,
          turno: sesion.turno,
        }),
      },
    });

    return sesion as any;
  },

  /**
   * Cierra la sesión de caja actual y realiza el arqueo de valores
   */
  async closeRegister(data: CierreCajaDto): Promise<SesionCaja> {
    const sesion = await prisma.sesionCaja.findFirst({
      where: { estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' },
    });

    if (!sesion) {
      throw new Error('No hay ninguna sesión de caja abierta para cerrar.');
    }

    const montoRealContado = Number(data.montoRealContado);
    if (isNaN(montoRealContado) || montoRealContado < 0) {
      throw new Error('Debe ingresar un monto contado válido en efectivo (mayor o igual a 0).');
    }

    // Calcular valores finales de la sesión
    const [ventasEfectivoAgg, ventasTransfAgg, retirosAgg] = await Promise.all([
      prisma.venta.aggregate({
        _sum: { total: true },
        where: {
          estado: 'ACTIVO',
          metodoPago: 'EFECTIVO',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        where: {
          estado: 'ACTIVO',
          metodoPago: 'TRANSFERENCIA',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
      prisma.retiro.aggregate({
        _sum: { monto: true },
        where: {
          estado: 'ACTIVO',
          fecha: { gte: sesion.fechaApertura },
        },
      }),
    ]);

    const montoVentasEfectivo = ventasEfectivoAgg._sum.total || 0;
    const montoVentasTransferencia = ventasTransfAgg._sum.total || 0;
    const montoRetiros = retirosAgg._sum.monto || 0;
    const montoEsperadoEfectivo =
      Math.round((sesion.montoInicial + montoVentasEfectivo - montoRetiros) * 100) / 100;
    const diferencia = Math.round((montoRealContado - montoEsperadoEfectivo) * 100) / 100;

    const sesionCerrada = await prisma.sesionCaja.update({
      where: { id: sesion.id },
      data: {
        estado: 'CERRADA',
        fechaCierre: new Date(),
        montoVentasEfectivo,
        montoVentasTransferencia,
        montoRetiros,
        montoEsperadoEfectivo,
        montoRealContado,
        diferencia,
        usuarioCierre: data.usuario || 'cajero',
        observaciones: data.observaciones?.trim() || sesion.observaciones,
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        entidad: 'VENTA',
        entidadId: sesion.id,
        accion: 'MODIFICACION',
        usuario: data.usuario || 'cajero',
        detallesJson: JSON.stringify({
          tipo: 'CIERRE_CAJA',
          montoEsperadoEfectivo,
          montoRealContado,
          diferencia,
        }),
      },
    });

    return sesionCerrada as any;
  },

  /**
   * Cierra cualquier sesión que haya quedado en estado ABIERTA
   */
  async closeAnyOpenSession(usuarioCierre = 'emprendedor'): Promise<number> {
    const openSessions = await prisma.sesionCaja.findMany({
      where: { estado: 'ABIERTA' },
    });

    for (const sesion of openSessions) {
      const [ventasEfectivoAgg, ventasTransfAgg, retirosAgg] = await Promise.all([
        prisma.venta.aggregate({
          _sum: { total: true },
          where: {
            estado: 'ACTIVO',
            metodoPago: 'EFECTIVO',
            fecha: { gte: sesion.fechaApertura },
          },
        }),
        prisma.venta.aggregate({
          _sum: { total: true },
          where: {
            estado: 'ACTIVO',
            metodoPago: 'TRANSFERENCIA',
            fecha: { gte: sesion.fechaApertura },
          },
        }),
        prisma.retiro.aggregate({
          _sum: { monto: true },
          where: {
            estado: 'ACTIVO',
            fecha: { gte: sesion.fechaApertura },
          },
        }),
      ]);

      const montoVentasEfectivo = ventasEfectivoAgg._sum.total || 0;
      const montoVentasTransferencia = ventasTransfAgg._sum.total || 0;
      const montoRetiros = retirosAgg._sum.monto || 0;
      const montoEsperadoEfectivo =
        Math.round((sesion.montoInicial + montoVentasEfectivo - montoRetiros) * 100) / 100;

      await prisma.sesionCaja.update({
        where: { id: sesion.id },
        data: {
          estado: 'CERRADA',
          fechaCierre: new Date(),
          montoVentasEfectivo,
          montoVentasTransferencia,
          montoRetiros,
          montoEsperadoEfectivo,
          montoRealContado: montoEsperadoEfectivo,
          diferencia: 0,
          usuarioCierre,
          observaciones: 'Cierre automático previo al turno de caja',
        },
      });
    }

    return openSessions.length;
  },

  /**
   * Obtiene estadísticas y el listado de ventas del día actual o de una fecha dada
   */
  async getDailySalesStats(dateStr?: string): Promise<DailySalesStats> {
    const target = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

    const ventas = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        producto: true,
        emprendimiento: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    let totalVentas = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let unidadesVendidas = 0;
    let cantidadVentas = 0;

    const emprendimientosMap = new Map<
      string,
      {
        emprendimientoId: string;
        codigo: string;
        nombre: string;
        responsable: string;
        total: number;
        cantidadVentas: number;
        unidades: number;
        efectivo: number;
        transferencia: number;
      }
    >();

    const ventasPorTurno = {
      manana: { cantidad: 0, total: 0, unidades: 0 },
      tarde: { cantidad: 0, total: 0, unidades: 0 },
    };

    const ventasPorTipoCliente = {
      residentes: { cantidad: 0, total: 0 },
      turistas: { cantidad: 0, total: 0 },
    };

    for (const v of ventas) {
      if (v.estado === 'ACTIVO') {
        cantidadVentas++;
        totalVentas += v.total;
        unidadesVendidas += v.cantidad;

        if (v.metodoPago === 'EFECTIVO') {
          totalEfectivo += v.total;
        } else {
          totalTransferencia += v.total;
        }

        // Turno
        if (v.turno === 'MANANA') {
          ventasPorTurno.manana.cantidad++;
          ventasPorTurno.manana.total += v.total;
          ventasPorTurno.manana.unidades += v.cantidad;
        } else {
          ventasPorTurno.tarde.cantidad++;
          ventasPorTurno.tarde.total += v.total;
          ventasPorTurno.tarde.unidades += v.cantidad;
        }

        // Tipo cliente
        if (v.tipoCliente === 'RESIDENTE') {
          ventasPorTipoCliente.residentes.cantidad++;
          ventasPorTipoCliente.residentes.total += v.total;
        } else {
          ventasPorTipoCliente.turistas.cantidad++;
          ventasPorTipoCliente.turistas.total += v.total;
        }

        // Por emprendimiento
        const empId = v.emprendimientoId;
        const existing = emprendimientosMap.get(empId) || {
          emprendimientoId: empId,
          codigo: v.emprendimiento?.codigo || 'N/A',
          nombre: v.emprendimiento?.nombre || 'Emprendimiento',
          responsable: v.emprendimiento?.responsable || '',
          total: 0,
          cantidadVentas: 0,
          unidades: 0,
          efectivo: 0,
          transferencia: 0,
        };

        existing.total += v.total;
        existing.cantidadVentas++;
        existing.unidades += v.cantidad;
        if (v.metodoPago === 'EFECTIVO') {
          existing.efectivo += v.total;
        } else {
          existing.transferencia += v.total;
        }

        emprendimientosMap.set(empId, existing);
      }
    }

    const ventasPorEmprendimiento = Array.from(emprendimientosMap.values()).sort(
      (a, b) => b.total - a.total
    );

    return {
      fecha: startOfDay.toISOString().split('T')[0],
      totalVentas: Math.round(totalVentas * 100) / 100,
      totalEfectivo: Math.round(totalEfectivo * 100) / 100,
      totalTransferencia: Math.round(totalTransferencia * 100) / 100,
      cantidadVentas,
      unidadesVendidas,
      ventasPorEmprendimiento,
      ventasPorTurno: {
        manana: {
          cantidad: ventasPorTurno.manana.cantidad,
          total: Math.round(ventasPorTurno.manana.total * 100) / 100,
          unidades: ventasPorTurno.manana.unidades,
        },
        tarde: {
          cantidad: ventasPorTurno.tarde.cantidad,
          total: Math.round(ventasPorTurno.tarde.total * 100) / 100,
          unidades: ventasPorTurno.tarde.unidades,
        },
      },
      ventasPorTipoCliente: {
        residentes: {
          cantidad: ventasPorTipoCliente.residentes.cantidad,
          total: Math.round(ventasPorTipoCliente.residentes.total * 100) / 100,
        },
        turistas: {
          cantidad: ventasPorTipoCliente.turistas.cantidad,
          total: Math.round(ventasPorTipoCliente.turistas.total * 100) / 100,
        },
      },
      listadoVentas: ventas as any,
    };
  },

  /**
   * Obtiene el historial de sesiones de caja
   */
  async getSessionHistory(): Promise<SesionCaja[]> {
    const list = await prisma.sesionCaja.findMany({
      orderBy: { fechaApertura: 'desc' },
      take: 30,
    });
    return list as any;
  },
};
