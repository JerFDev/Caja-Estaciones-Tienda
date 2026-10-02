import { prisma } from '../db';
import { balancesService } from './balancesService';
import { v4 as uuidv4 } from 'uuid';

export const withdrawalService = {
  async createWithdrawal(data: {
    emprendimientoId: string;
    monto: number;
    observaciones?: string;
    usuario?: string;
    fecha?: Date;
    permitirExcedente?: boolean;
  }) {
    const montoNum = Number(data.monto);
    if (!montoNum || isNaN(montoNum) || montoNum <= 0) {
      throw new Error('El monto debe ser un número mayor a 0.');
    }

    const emprendimiento = await prisma.emprendimiento.findUnique({
      where: { id: data.emprendimientoId },
    });
    if (!emprendimiento) {
      throw new Error('Emprendimiento no encontrado.');
    }

    // Validar saldo disponible en efectivo
    const balance = await balancesService.getBalanceByEntrepreneurId(data.emprendimientoId);
    const saldoDisponible = balance?.saldoEfectivoDisponible ?? 0;

    if (montoNum > saldoDisponible && !data.permitirExcedente) {
      throw new Error(
        `Retiro denegado: El monto solicitado ($${montoNum.toLocaleString('es-AR')}) supera el saldo disponible en efectivo ($${saldoDisponible.toLocaleString('es-AR')}). Requiere autorización especial.`
      );
    }

    const config = await prisma.configuracion.findFirst();
    const localCodigo = config?.localCodigo || 'LOCAL_01';
    const identificadorUnico = `${localCodigo}-RET-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const retiro = await prisma.retiro.create({
      data: {
        identificadorUnico,
        emprendimientoId: data.emprendimientoId,
        fecha: data.fecha || new Date(),
        monto: montoNum,
        observaciones: data.observaciones?.trim() || null,
        usuario: data.usuario || 'administrador',
        localOrigen: localCodigo,
        estado: 'ACTIVO',
      },
      include: {
        emprendimiento: true,
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        entidad: 'RETIRO',
        entidadId: retiro.id,
        accion: 'CREACION',
        usuario: data.usuario || 'administrador',
        detallesJson: JSON.stringify({
          monto: montoNum,
          emprendimiento: emprendimiento.codigo,
          identificadorUnico,
        }),
      },
    });

    return retiro;
  },

  async getWithdrawals(filtros?: {
    emprendimientoId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
  }) {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.emprendimientoId) {
      where.emprendimientoId = filtros.emprendimientoId;
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) {
        where.fecha.gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        const hasta = new Date(filtros.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha.lte = hasta;
      }
    }

    return prisma.retiro.findMany({
      where,
      include: {
        emprendimiento: true,
      },
      orderBy: { fecha: 'desc' },
      take: 200,
    });
  },

  async voidWithdrawal(id: string, motivo: string, usuario = 'admin') {
    if (!motivo || !motivo.trim()) {
      throw new Error('Debe especificar un motivo para anular el retiro.');
    }

    const retiro = await prisma.retiro.findUnique({
      where: { id },
      include: { emprendimiento: true },
    });

    if (!retiro) {
      throw new Error('Retiro no encontrado.');
    }

    if (retiro.estado === 'ANULADO') {
      throw new Error('Este retiro ya se encuentra anulado.');
    }

    const updated = await prisma.retiro.update({
      where: { id },
      data: {
        estado: 'ANULADO',
        motivoAnulacion: motivo.trim(),
      },
      include: { emprendimiento: true },
    });

    await prisma.auditoriaLog.create({
      data: {
        entidad: 'RETIRO',
        entidadId: id,
        accion: 'ANULACION',
        usuario,
        detallesJson: JSON.stringify({
          motivo,
          monto: retiro.monto,
          emprendimiento: retiro.emprendimiento.codigo,
        }),
      },
    });

    return updated;
  },
};
