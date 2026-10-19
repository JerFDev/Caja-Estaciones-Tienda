import { prisma } from '../db';
import { municipalAuditService } from './municipalAuditService';

export const edicionService = {
  // --- LOCALES ---
  async getAllLocales() {
    return prisma.local.findMany({
      orderBy: { codigo: 'asc' },
      include: {
        _count: {
          select: { participaciones: true },
        },
      },
    });
  },

  async createLocal(
    data: {
      codigo: string;
      nombre: string;
      direccion?: string;
      descripcion?: string;
      capacidad?: number;
    },
    usuario = 'administrador'
  ) {
    const cleanCode = data.codigo?.trim().toUpperCase();
    if (!cleanCode || !data.nombre?.trim()) {
      throw new Error('El código y el nombre del local son obligatorios.');
    }

    const existing = await prisma.local.findUnique({ where: { codigo: cleanCode } });
    if (existing) {
      throw new Error(`El local con código "${cleanCode}" ya existe.`);
    }

    const nuevo = await prisma.local.create({
      data: {
        codigo: cleanCode,
        nombre: data.nombre.trim(),
        direccion: data.direccion?.trim() || null,
        descripcion: data.descripcion?.trim() || null,
        capacidad: Number(data.capacidad) || 1,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_LOCAL',
      entidad: 'LOCAL',
      entidadId: nuevo.id,
      datosNuevos: nuevo,
    });

    return nuevo;
  },

  async updateLocal(
    id: string,
    data: {
      codigo?: string;
      nombre?: string;
      direccion?: string;
      descripcion?: string;
      capacidad?: number;
      activo?: boolean;
    },
    usuario = 'administrador'
  ) {
    const actual = await prisma.local.findUnique({ where: { id } });
    if (!actual) throw new Error('Local no encontrado');

    const actualizado = await prisma.local.update({
      where: { id },
      data: {
        ...(data.codigo && { codigo: data.codigo.trim().toUpperCase() }),
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.capacidad !== undefined && { capacidad: Number(data.capacidad) }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'EDITAR_LOCAL',
      entidad: 'LOCAL',
      entidadId: id,
      datosAnteriores: actual,
      datosNuevos: actualizado,
    });

    return actualizado;
  },

  // --- EDICIONES ---
  async getAllEdiciones() {
    return prisma.edicion.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        _count: {
          select: { participaciones: true, locales: true },
        },
        locales: {
          include: { local: true },
        },
        participaciones: {
          include: {
            emprendimiento: {
              select: { id: true, codigo: true, nombre: true, responsable: true, rubro: true },
            },
            local: true,
            colectivo: true,
          },
        },
      },
    });
  },

  async getEdicionById(id: string) {
    return prisma.edicion.findUnique({
      where: { id },
      include: {
        locales: {
          include: { local: true },
        },
        participaciones: {
          include: {
            emprendimiento: true,
            local: true,
            colectivo: true,
          },
        },
      },
    });
  },

  async createEdicion(
    data: {
      nombre: string;
      descripcion?: string;
      fechaInicio: string;
      fechaFin?: string;
      estado?: string;
      observaciones?: string;
      localesIds?: string[];
    },
    usuario = 'administrador'
  ) {
    if (!data.nombre?.trim() || !data.fechaInicio) {
      throw new Error('El nombre y la fecha de inicio de la edición son obligatorios.');
    }

    const nueva = await prisma.edicion.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        estado: data.estado || 'PLANIFICADA',
        observaciones: data.observaciones?.trim() || null,
        locales: data.localesIds && data.localesIds.length > 0
          ? {
              create: data.localesIds.map((localId) => ({ localId })),
            }
          : undefined,
      },
      include: {
        locales: { include: { local: true } },
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_EDICION',
      entidad: 'EDICION',
      entidadId: nueva.id,
      datosNuevos: nueva,
    });

    return nueva;
  },

  async updateEdicion(
    id: string,
    data: {
      nombre?: string;
      descripcion?: string;
      fechaInicio?: string;
      fechaFin?: string;
      estado?: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    const actual = await prisma.edicion.findUnique({ where: { id } });
    if (!actual) throw new Error('Edición no encontrada');

    const actualizada = await prisma.edicion.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.fechaInicio && { fechaInicio: new Date(data.fechaInicio) }),
        ...(data.fechaFin !== undefined && { fechaFin: data.fechaFin ? new Date(data.fechaFin) : null }),
        ...(data.estado && { estado: data.estado }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones?.trim() || null }),
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'EDITAR_EDICION',
      entidad: 'EDICION',
      entidadId: id,
      datosAnteriores: actual,
      datosNuevos: actualizada,
    });

    return actualizada;
  },

  // --- PARTICIPACIONES ---
  async addParticipacion(
    data: {
      edicionId: string;
      emprendimientoId: string;
      localId?: string;
      colectivoId?: string;
      fechaInicio?: string;
      fechaFin?: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.edicionId || !data.emprendimientoId) {
      throw new Error('La edición y el emprendimiento son obligatorios.');
    }

    const participacion = await prisma.edicionEmprendimiento.create({
      data: {
        edicionId: data.edicionId,
        emprendimientoId: data.emprendimientoId,
        localId: data.localId || null,
        colectivoId: data.colectivoId || null,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        estado: 'CONFIRMADA',
        observaciones: data.observaciones?.trim() || null,
      },
      include: {
        emprendimiento: true,
        local: true,
        colectivo: true,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'ASIGNAR_EDICION',
      entidad: 'EDICION',
      entidadId: data.edicionId,
      datosNuevos: participacion,
    });

    return participacion;
  },

  async updateParticipacionEstado(
    id: string,
    data: { estado: string; observaciones?: string },
    usuario = 'administrador'
  ) {
    const actual = await prisma.edicionEmprendimiento.findUnique({ where: { id } });
    if (!actual) throw new Error('Participación no encontrada');

    const actualizada = await prisma.edicionEmprendimiento.update({
      where: { id },
      data: {
        estado: data.estado,
        ...(data.observaciones !== undefined && { observaciones: data.observaciones?.trim() || null }),
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'ACTUALIZAR_PARTICIPACION',
      entidad: 'EDICION',
      entidadId: actual.edicionId,
      datosAnteriores: actual,
      datosNuevos: actualizada,
    });

    return actualizada;
  },
};
