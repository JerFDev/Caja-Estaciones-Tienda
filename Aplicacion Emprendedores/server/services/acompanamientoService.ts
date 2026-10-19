import { prisma } from '../db';
import { municipalAuditService } from './municipalAuditService';

export const acompanamientoService = {
  // --- FISCALIZACIONES ---
  async getFiscalizaciones(filtros?: { emprendimientoId?: string; resultado?: string }) {
    const where: any = {};
    if (filtros?.emprendimientoId) where.emprendimientoId = filtros.emprendimientoId;
    if (filtros?.resultado && filtros.resultado !== 'TODOS') where.resultado = filtros.resultado;

    return prisma.fiscalizacion.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        emprendimiento: {
          select: { id: true, codigo: true, nombre: true, responsable: true, rubro: true },
        },
        producto: {
          select: { id: true, codigo: true, nombre: true },
        },
      },
    });
  },

  async createFiscalizacion(
    data: {
      emprendimientoId: string;
      productoId?: string;
      resultado?: string;
      motivo?: string;
      observaciones?: string;
    },
    usuario = 'inspector'
  ) {
    if (!data.emprendimientoId) {
      throw new Error('El emprendimiento es obligatorio para registrar la fiscalización.');
    }

    const nueva = await prisma.fiscalizacion.create({
      data: {
        emprendimientoId: data.emprendimientoId,
        productoId: data.productoId || null,
        fecha: new Date(),
        usuario,
        resultado: data.resultado || 'APROBADA',
        motivo: data.motivo?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
      },
      include: {
        emprendimiento: true,
        producto: true,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_FISCALIZACION',
      entidad: 'FISCALIZACION',
      entidadId: nueva.id,
      datosNuevos: nueva,
    });

    return nueva;
  },

  // --- CAPACITACIONES ---
  async getAllCapacitaciones() {
    return prisma.capacitacion.findMany({
      orderBy: { fecha: 'desc' },
      include: {
        _count: { select: { participantes: true } },
        participantes: {
          include: {
            emprendimiento: {
              select: { id: true, codigo: true, nombre: true, responsable: true },
            },
          },
        },
      },
    });
  },

  async createCapacitacion(
    data: {
      nombre: string;
      descripcion?: string;
      fecha: string;
      duracion?: string;
      lugar?: string;
      responsable?: string;
      observaciones?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.nombre?.trim() || !data.fecha) {
      throw new Error('El nombre y la fecha de la capacitación son obligatorios.');
    }

    const nueva = await prisma.capacitacion.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        fecha: new Date(data.fecha),
        duracion: data.duracion?.trim() || null,
        lugar: data.lugar?.trim() || null,
        responsable: data.responsable?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_CAPACITACION',
      entidad: 'CAPACITACION',
      entidadId: nueva.id,
      datosNuevos: nueva,
    });

    return nueva;
  },

  async addParticipanteCapacitacion(
    capacitacionId: string,
    emprendimientoId: string,
    observaciones?: string
  ) {
    const existe = await prisma.emprendimientoCapacitacion.findUnique({
      where: {
        capacitacionId_emprendimientoId: { capacitacionId, emprendimientoId },
      },
    });
    if (existe) throw new Error('El emprendimiento ya está inscripto en esta capacitación.');

    return prisma.emprendimientoCapacitacion.create({
      data: {
        capacitacionId,
        emprendimientoId,
        asistencia: true,
        estado: 'COMPLETADA',
        observaciones: observaciones?.trim() || null,
      },
      include: { emprendimiento: true },
    });
  },

  // --- REUNIONES ---
  async getReuniones(filtros?: { emprendimientoId?: string }) {
    const where: any = {};
    if (filtros?.emprendimientoId) where.emprendimientoId = filtros.emprendimientoId;

    return prisma.reunionMunicipal.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        emprendimiento: {
          select: { id: true, codigo: true, nombre: true, responsable: true },
        },
      },
    });
  },

  async createReunion(
    data: {
      emprendimientoId: string;
      fecha?: string;
      responsable: string;
      tema: string;
      acuerdos?: string;
      observaciones?: string;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.emprendimientoId || !data.tema?.trim() || !data.responsable?.trim()) {
      throw new Error('Emprendimiento, tema y responsable son obligatorios.');
    }

    const nueva = await prisma.reunionMunicipal.create({
      data: {
        emprendimientoId: data.emprendimientoId,
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        responsable: data.responsable.trim(),
        tema: data.tema.trim(),
        acuerdos: data.acuerdos?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        estado: data.estado || 'REALIZADA',
      },
      include: { emprendimiento: true },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_REUNION',
      entidad: 'REUNION',
      entidadId: nueva.id,
      datosNuevos: nueva,
    });

    return nueva;
  },

  // --- PRESENCIA DIGITAL Y REDES SOCIALES ---
  async getPresenciaDigital(emprendimientoId: string) {
    return prisma.presenciaDigital.findMany({
      where: { emprendimientoId },
      orderBy: { canal: 'asc' },
    });
  },

  async getAllRedesSociales(filtros?: { canal?: string; search?: string }) {
    const where: any = {};
    if (filtros?.canal && filtros.canal !== 'TODOS') {
      where.canal = filtros.canal;
    }
    if (filtros?.search?.trim()) {
      const q = filtros.search.trim();
      where.OR = [
        { usuarioRed: { contains: q } },
        { url: { contains: q } },
        { emprendimiento: { nombre: { contains: q } } },
        { emprendimiento: { responsable: { contains: q } } },
        { emprendimiento: { rubro: { contains: q } } },
      ];
    }

    return prisma.presenciaDigital.findMany({
      where,
      orderBy: [
        { seguidores: 'desc' },
        { canal: 'asc' },
      ],
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
          },
        },
      },
    });
  },

  async upsertPresenciaDigital(
    data: {
      id?: string;
      emprendimientoId: string;
      canal: string;
      url: string;
      usuarioRed?: string;
      seguidores?: number;
      estado?: string;
      observaciones?: string;
    }
  ) {
    let cleanUrl = data.url?.trim() || '';
    let usuarioRed = data.usuarioRed?.trim() || null;

    if (!usuarioRed && cleanUrl) {
      const match = cleanUrl.match(/(?:instagram\.com\/|@)([a-zA-Z0-9._]+)/i);
      if (match && match[1]) {
        usuarioRed = `@${match[1].replace(/[/]$/, '')}`;
      }
    }

    const seguidoresNum =
      data.seguidores !== undefined && data.seguidores !== null && !isNaN(Number(data.seguidores))
        ? Number(data.seguidores)
        : undefined;

    if (data.id) {
      return prisma.presenciaDigital.update({
        where: { id: data.id },
        data: {
          canal: data.canal,
          url: cleanUrl,
          usuarioRed: usuarioRed || undefined,
          ...(seguidoresNum !== undefined ? { seguidores: seguidoresNum, fechaSeguidores: new Date() } : {}),
          estado: data.estado || 'ACTIVO',
          observaciones: data.observaciones?.trim() || null,
          fechaRevision: new Date(),
        },
      });
    }

    return prisma.presenciaDigital.create({
      data: {
        emprendimientoId: data.emprendimientoId,
        canal: data.canal,
        url: cleanUrl,
        usuarioRed: usuarioRed || null,
        seguidores: seguidoresNum ?? 0,
        fechaSeguidores: seguidoresNum !== undefined ? new Date() : null,
        estado: data.estado || 'ACTIVO',
        observaciones: data.observaciones?.trim() || null,
        fechaRevision: new Date(),
      },
    });
  },

  async updateSeguidores(id: string, seguidores: number) {
    const seguidoresNum = Math.max(0, Number(seguidores) || 0);
    return prisma.presenciaDigital.update({
      where: { id },
      data: {
        seguidores: seguidoresNum,
        fechaSeguidores: new Date(),
        fechaRevision: new Date(),
      },
      include: {
        emprendimiento: true,
      },
    });
  },

  async updatePresenciaDigital(
    id: string,
    data: {
      emprendimientoId?: string;
      canal?: string;
      url?: string;
      usuarioRed?: string;
      seguidores?: number;
      estado?: string;
      observaciones?: string;
    }
  ) {
    let cleanUrl = data.url !== undefined ? data.url.trim() : undefined;
    let usuarioRed = data.usuarioRed !== undefined ? (data.usuarioRed?.trim() || null) : undefined;

    if (usuarioRed === undefined && cleanUrl) {
      const match = cleanUrl.match(/(?:instagram\.com\/|@)([a-zA-Z0-9._]+)/i);
      if (match && match[1]) {
        usuarioRed = `@${match[1].replace(/[/]$/, '')}`;
      }
    }

    const seguidoresNum =
      data.seguidores !== undefined && data.seguidores !== null && !isNaN(Number(data.seguidores))
        ? Number(data.seguidores)
        : undefined;

    return prisma.presenciaDigital.update({
      where: { id },
      data: {
        ...(data.emprendimientoId && { emprendimientoId: data.emprendimientoId }),
        ...(data.canal && { canal: data.canal }),
        ...(cleanUrl !== undefined && { url: cleanUrl }),
        ...(usuarioRed !== undefined && { usuarioRed }),
        ...(seguidoresNum !== undefined && { seguidores: seguidoresNum, fechaSeguidores: new Date() }),
        ...(data.estado && { estado: data.estado }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones?.trim() || null }),
        fechaRevision: new Date(),
      },
      include: {
        emprendimiento: true,
      },
    });
  },

  async deletePresenciaDigital(id: string) {
    return prisma.presenciaDigital.delete({ where: { id } });
  },

  // --- SERVICIOS MUNICIPALES ---
  async getAllServiciosMunicipales() {
    return prisma.servicioMunicipal.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { participaciones: true } },
      },
    });
  },

  async createServicioMunicipal(data: { nombre: string; descripcion?: string }) {
    return prisma.servicioMunicipal.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
      },
    });
  },

  async getServiciosOtorgados(filtros?: { emprendimientoId?: string }) {
    const where: any = {};
    if (filtros?.emprendimientoId) where.emprendimientoId = filtros.emprendimientoId;

    return prisma.emprendimientoServicio.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        servicio: true,
        emprendimiento: {
          select: { id: true, codigo: true, nombre: true, responsable: true },
        },
      },
    });
  },

  async otorgarServicio(
    data: {
      servicioMunicipalId: string;
      emprendimientoId: string;
      responsable?: string;
      observaciones?: string;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    const otorgado = await prisma.emprendimientoServicio.create({
      data: {
        servicioMunicipalId: data.servicioMunicipalId,
        emprendimientoId: data.emprendimientoId,
        responsable: data.responsable?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        estado: data.estado || 'OTORGADO',
        fecha: new Date(),
      },
      include: { servicio: true, emprendimiento: true },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'OTORGAR_SERVICIO_MUNICIPAL',
      entidad: 'SERVICIO_MUNICIPAL',
      entidadId: data.servicioMunicipalId,
      datosNuevos: otorgado,
    });

    return otorgado;
  },

  // --- SEGUIMIENTOS ---
  async getSeguimientos(filtros?: { emprendimientoId?: string; soloPendientes?: boolean }) {
    const where: any = {};
    if (filtros?.emprendimientoId) where.emprendimientoId = filtros.emprendimientoId;
    if (filtros?.soloPendientes) where.estado = 'PENDIENTE';

    return prisma.seguimientoMunicipal.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        emprendimiento: {
          select: { id: true, codigo: true, nombre: true, responsable: true, telefono: true, mail: true },
        },
      },
    });
  },

  async createSeguimiento(
    data: {
      emprendimientoId: string;
      tipo?: string;
      responsable: string;
      motivo: string;
      observacion: string;
      proximoContacto?: string;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    if (!data.emprendimientoId || !data.motivo?.trim() || !data.observacion?.trim()) {
      throw new Error('Emprendimiento, motivo y observación son obligatorios.');
    }

    const nuevo = await prisma.seguimientoMunicipal.create({
      data: {
        emprendimientoId: data.emprendimientoId,
        tipo: data.tipo || 'SEGUIMIENTO',
        responsable: data.responsable?.trim() || usuario,
        motivo: data.motivo.trim(),
        observacion: data.observacion.trim(),
        proximoContacto: data.proximoContacto ? new Date(data.proximoContacto) : null,
        estado: data.estado || 'COMPLETADO',
        fecha: new Date(),
      },
      include: { emprendimiento: true },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_SEGUIMIENTO',
      entidad: 'SEGUIMIENTO',
      entidadId: nuevo.id,
      datosNuevos: nuevo,
    });

    return nuevo;
  },
};
