import { prisma } from '../db';

export const municipalAuditService = {
  async logAction(params: {
    usuario?: string;
    accion: string;
    entidad: string;
    entidadId: string;
    datosAnteriores?: any;
    datosNuevos?: any;
    detalles?: string;
  }) {
    try {
      return await prisma.auditoriaLog.create({
        data: {
          usuario: params.usuario || 'administrador',
          accion: params.accion,
          entidad: params.entidad,
          entidadId: params.entidadId,
          datosAnteriores: params.datosAnteriores ? JSON.stringify(params.datosAnteriores) : null,
          datosNuevos: params.datosNuevos ? JSON.stringify(params.datosNuevos) : null,
          detallesJson: params.detalles || null,
        },
      });
    } catch (error) {
      console.error('[Auditoria] Error al registrar log:', error);
      return null;
    }
  },

  async getAuditLogs(filtros?: { entidad?: string; entidadId?: string; limit?: number }) {
    const where: any = {};
    if (filtros?.entidad) where.entidad = filtros.entidad;
    if (filtros?.entidadId) where.entidadId = filtros.entidadId;

    return prisma.auditoriaLog.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: filtros?.limit || 100,
    });
  },
};
