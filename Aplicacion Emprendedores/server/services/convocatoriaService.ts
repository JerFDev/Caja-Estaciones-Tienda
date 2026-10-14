import { prisma } from '../db';
import { municipalAuditService } from './municipalAuditService';

export const convocatoriaService = {
  async getAllConvocatorias(incluirCerradas = true) {
    const where: any = {};
    if (!incluirCerradas) {
      where.estado = { in: ['ABIERTA', 'BORRADOR'] };
    }

    return prisma.convocatoria.findMany({
      where,
      orderBy: { fechaInicio: 'desc' },
      include: {
        _count: {
          select: { postulaciones: true },
        },
      },
    });
  },

  async getConvocatoriaById(id: string) {
    return prisma.convocatoria.findUnique({
      where: { id },
      include: {
        postulaciones: {
          include: {
            emprendimiento: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                responsable: true,
                rubro: true,
                telefono: true,
                mail: true,
                estado: true,
              },
            },
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });
  },

  async createConvocatoria(
    data: {
      nombre: string;
      descripcion?: string;
      fechaInicio: string;
      fechaFin?: string;
      estado?: string;
      requisitos?: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.nombre || !data.fechaInicio) {
      throw new Error('El nombre y la fecha de inicio son obligatorios.');
    }

    const nueva = await prisma.convocatoria.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        estado: data.estado || 'ABIERTA',
        requisitos: data.requisitos?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_CONVOCATORIA',
      entidad: 'CONVOCATORIA',
      entidadId: nueva.id,
      datosNuevos: nueva,
    });

    return nueva;
  },

  async updateConvocatoria(
    id: string,
    data: {
      nombre?: string;
      descripcion?: string;
      fechaInicio?: string;
      fechaFin?: string;
      estado?: string;
      requisitos?: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    const actual = await prisma.convocatoria.findUnique({ where: { id } });
    if (!actual) throw new Error('Convocatoria no encontrada');

    const actualizada = await prisma.convocatoria.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.fechaInicio && { fechaInicio: new Date(data.fechaInicio) }),
        ...(data.fechaFin !== undefined && { fechaFin: data.fechaFin ? new Date(data.fechaFin) : null }),
        ...(data.estado && { estado: data.estado }),
        ...(data.requisitos !== undefined && { requisitos: data.requisitos?.trim() || null }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones?.trim() || null }),
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'EDITAR_CONVOCATORIA',
      entidad: 'CONVOCATORIA',
      entidadId: id,
      datosAnteriores: actual,
      datosNuevos: actualizada,
    });

    return actualizada;
  },

  async getPostulaciones(filtros?: { convocatoriaId?: string; emprendimientoId?: string; estado?: string }) {
    const where: any = {};
    if (filtros?.convocatoriaId) where.convocatoriaId = filtros.convocatoriaId;
    if (filtros?.emprendimientoId) where.emprendimientoId = filtros.emprendimientoId;
    if (filtros?.estado && filtros.estado !== 'TODOS') where.estado = filtros.estado;

    return prisma.postulacion.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        convocatoria: true,
        emprendimiento: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            responsable: true,
            rubro: true,
            telefono: true,
            mail: true,
            estado: true,
          },
        },
      },
    });
  },

  async createPostulacion(
    data: {
      convocatoriaId: string;
      emprendimientoId: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.convocatoriaId || !data.emprendimientoId) {
      throw new Error('La convocatoria y el emprendimiento son obligatorios.');
    }

    const existe = await prisma.postulacion.findUnique({
      where: {
        convocatoriaId_emprendimientoId: {
          convocatoriaId: data.convocatoriaId,
          emprendimientoId: data.emprendimientoId,
        },
      },
    });
    if (existe) {
      throw new Error('El emprendimiento ya se encuentra postulado a esta convocatoria.');
    }

    const nueva = await prisma.postulacion.create({
      data: {
        convocatoriaId: data.convocatoriaId,
        emprendimientoId: data.emprendimientoId,
        estado: 'PENDIENTE',
        observaciones: data.observaciones?.trim() || null,
        usuarioResponsable: usuario,
      },
      include: {
        emprendimiento: true,
        convocatoria: true,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_POSTULACION',
      entidad: 'POSTULACION',
      entidadId: nueva.id,
      datosNuevos: nueva,
    });

    return nueva;
  },

  async updatePostulacionEstado(
    id: string,
    data: {
      estado: string; // PENDIENTE | EN_EVALUACION | APROBADA | RECHAZADA | DESISTIDA
      evaluacion?: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    const actual = await prisma.postulacion.findUnique({ where: { id } });
    if (!actual) throw new Error('Postulación no encontrada');

    const actualizada = await prisma.postulacion.update({
      where: { id },
      data: {
        estado: data.estado,
        ...(data.evaluacion !== undefined && { evaluacion: data.evaluacion?.trim() || null }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones?.trim() || null }),
        usuarioResponsable: usuario,
        fechaResolucion: ['APROBADA', 'RECHAZADA', 'DESISTIDA'].includes(data.estado) ? new Date() : null,
      },
      include: {
        emprendimiento: true,
        convocatoria: true,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: `POSTULACION_${data.estado}`,
      entidad: 'POSTULACION',
      entidadId: id,
      datosAnteriores: actual,
      datosNuevos: actualizada,
    });

    return actualizada;
  },
};
