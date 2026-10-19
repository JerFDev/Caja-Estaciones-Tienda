import { prisma } from '../db';
import { municipalAuditService } from './municipalAuditService';

export const colectivoService = {
  async getAllColectivos() {
    return prisma.colectivo.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { emprendimientos: true },
        },
        emprendimientos: {
          where: { estado: 'ACTIVO' },
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
        },
      },
    });
  },

  async getColectivoById(id: string) {
    return prisma.colectivo.findUnique({
      where: { id },
      include: {
        emprendimientos: {
          include: {
            emprendimiento: true,
          },
          orderBy: { fechaIngreso: 'desc' },
        },
      },
    });
  },

  async createColectivo(
    data: {
      nombre: string;
      descripcion?: string;
      orientacion?: string;
      imagen?: string;
      redesSociales?: string;
      contacto?: string;
      puntosVenta?: string;
      fechaInicio?: string;
      fechaFin?: string;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.nombre?.trim()) {
      throw new Error('El nombre del colectivo es obligatorio.');
    }

    const cleanName = data.nombre.trim();
    const existing = await prisma.colectivo.findUnique({ where: { nombre: cleanName } });
    if (existing) {
      throw new Error(`Ya existe un colectivo con el nombre "${cleanName}".`);
    }

    const nuevo = await prisma.colectivo.create({
      data: {
        nombre: cleanName,
        descripcion: data.descripcion?.trim() || null,
        orientacion: data.orientacion?.trim() || null,
        imagen: data.imagen?.trim() || null,
        redesSociales: data.redesSociales?.trim() || null,
        contacto: data.contacto?.trim() || null,
        puntosVenta: data.puntosVenta?.trim() || null,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : new Date(),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        estado: data.estado || 'ACTIVO',
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_COLECTIVO',
      entidad: 'COLECTIVO',
      entidadId: nuevo.id,
      datosNuevos: nuevo,
    });

    return nuevo;
  },

  async updateColectivo(
    id: string,
    data: {
      nombre?: string;
      descripcion?: string;
      orientacion?: string;
      imagen?: string;
      redesSociales?: string;
      contacto?: string;
      puntosVenta?: string;
      fechaInicio?: string;
      fechaFin?: string;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    const actual = await prisma.colectivo.findUnique({ where: { id } });
    if (!actual) throw new Error('Colectivo no encontrado');

    const actualizado = await prisma.colectivo.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.orientacion !== undefined && { orientacion: data.orientacion?.trim() || null }),
        ...(data.imagen !== undefined && { imagen: data.imagen?.trim() || null }),
        ...(data.redesSociales !== undefined && { redesSociales: data.redesSociales?.trim() || null }),
        ...(data.contacto !== undefined && { contacto: data.contacto?.trim() || null }),
        ...(data.puntosVenta !== undefined && { puntosVenta: data.puntosVenta?.trim() || null }),
        ...(data.fechaInicio !== undefined && { fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null }),
        ...(data.fechaFin !== undefined && { fechaFin: data.fechaFin ? new Date(data.fechaFin) : null }),
        ...(data.estado && { estado: data.estado }),
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'EDITAR_COLECTIVO',
      entidad: 'COLECTIVO',
      entidadId: id,
      datosAnteriores: actual,
      datosNuevos: actualizado,
    });

    return actualizado;
  },

  async addMiembro(
    colectivoId: string,
    emprendimientoId: string,
    observaciones?: string,
    usuario = 'administrador'
  ) {
    // Verificar si ya está activo en este colectivo
    const activoPrevio = await prisma.emprendimientoColectivo.findFirst({
      where: {
        colectivoId,
        emprendimientoId,
        estado: 'ACTIVO',
      },
    });

    if (activoPrevio) {
      throw new Error('El emprendimiento ya es miembro activo de este colectivo.');
    }

    const membresia = await prisma.emprendimientoColectivo.create({
      data: {
        colectivoId,
        emprendimientoId,
        fechaIngreso: new Date(),
        estado: 'ACTIVO',
        observaciones: observaciones?.trim() || null,
      },
      include: {
        colectivo: true,
        emprendimiento: true,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'ASIGNAR_COLECTIVO',
      entidad: 'COLECTIVO',
      entidadId: colectivoId,
      datosNuevos: { emprendimientoId, colectivoId, observaciones },
    });

    return membresia;
  },

  async removeMiembro(
    membresiaId: string,
    motivoSalida?: string,
    usuario = 'administrador'
  ) {
    const actual = await prisma.emprendimientoColectivo.findUnique({
      where: { id: membresiaId },
      include: { colectivo: true, emprendimiento: true },
    });
    if (!actual) throw new Error('Membresía no encontrada');

    const actualizado = await prisma.emprendimientoColectivo.update({
      where: { id: membresiaId },
      data: {
        fechaSalida: new Date(),
        estado: 'FINALIZADO',
        observaciones: motivoSalida
          ? `${actual.observaciones ? `${actual.observaciones} | ` : ''}Motivo de baja: ${motivoSalida}`
          : actual.observaciones,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'RETIRAR_COLECTIVO',
      entidad: 'COLECTIVO',
      entidadId: actual.colectivoId,
      datosAnteriores: actual,
      datosNuevos: actualizado,
    });

    return actualizado;
  },
};
