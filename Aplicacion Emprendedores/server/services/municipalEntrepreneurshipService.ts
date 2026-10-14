import { prisma } from '../db';
import { municipalAuditService } from './municipalAuditService';

export const municipalEntrepreneurshipService = {
  async getAll(filtros?: { search?: string; estado?: string }) {
    const where: any = {};

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      where.estado = filtros.estado;
    }

    if (filtros?.search) {
      const q = filtros.search.trim();
      where.OR = [
        { codigo: { contains: q } },
        { nombre: { contains: q } },
        { nombreFantasia: { contains: q } },
        { responsable: { contains: q } },
        { cuit: { contains: q } },
        { documento: { contains: q } },
        { rubro: { contains: q } },
      ];
    }

    return prisma.emprendimiento.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { codigo: 'asc' }],
      include: {
        _count: {
          select: {
            productos: true,
            ventas: true,
            postulaciones: true,
            colectivos: true,
            participaciones: true,
            fiscalizaciones: true,
          },
        },
        colectivos: {
          where: { estado: 'ACTIVO' },
          include: { colectivo: true },
        },
      },
    });
  },

  async getById(id: string) {
    return prisma.emprendimiento.findUnique({
      where: { id },
      include: {
        presenciaDigital: true,
        colectivos: {
          include: { colectivo: true },
          orderBy: { fechaIngreso: 'desc' },
        },
        postulaciones: {
          include: { convocatoria: true },
          orderBy: { fecha: 'desc' },
        },
        participaciones: {
          include: { edicion: true, local: true, colectivo: true },
          orderBy: { fechaCreacion: 'desc' },
        },
        fiscalizaciones: {
          include: { producto: true },
          orderBy: { fecha: 'desc' },
        },
        capacitaciones: {
          include: { capacitacion: true },
          orderBy: { capacitacion: { fecha: 'desc' } },
        },
        reuniones: {
          orderBy: { fecha: 'desc' },
        },
        serviciosRecibidos: {
          include: { servicio: true },
          orderBy: { fecha: 'desc' },
        },
        seguimientos: {
          orderBy: { fecha: 'desc' },
        },
        _count: {
          select: {
            productos: true,
            ventas: true,
            retiros: true,
          },
        },
      },
    });
  },

  async create(
    data: {
      codigo: string;
      nombre: string;
      nombreFantasia?: string;
      responsable: string;
      documento?: string;
      cuit?: string;
      telefono?: string;
      direccion?: string;
      alias?: string;
      cvu?: string;
      cbu?: string;
      mail?: string;
      rubro?: string;
      descripcion?: string;
      porcentajeRetencion?: number;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    const cleanCode = data.codigo?.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('El Código Oficial del emprendimiento es obligatorio.');
    }
    if (!data.nombre?.trim() || !data.responsable?.trim()) {
      throw new Error('El Nombre y el Responsable son obligatorios.');
    }

    const existing = await prisma.emprendimiento.findUnique({
      where: { codigo: cleanCode },
    });
    if (existing) {
      throw new Error(`El código oficial "${cleanCode}" ya se encuentra registrado para "${existing.nombre}".`);
    }

    const estadoFinal = data.estado || 'ACTIVO';
    const nuevo = await prisma.emprendimiento.create({
      data: {
        codigo: cleanCode,
        nombre: data.nombre.trim(),
        nombreFantasia: data.nombreFantasia?.trim() || null,
        responsable: data.responsable.trim(),
        documento: data.documento?.trim() || null,
        cuit: data.cuit?.trim() || null,
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
        alias: data.alias?.trim() || null,
        cvu: data.cvu?.trim() || null,
        cbu: data.cbu?.trim() || null,
        mail: data.mail?.trim() || null,
        rubro: data.rubro?.trim() || null,
        descripcion: data.descripcion?.trim() || null,
        porcentajeRetencion: Number(data.porcentajeRetencion) || 0.0,
        estado: estadoFinal,
        activo: estadoFinal === 'ACTIVO',
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'CREAR_EMPRENDIMIENTO',
      entidad: 'EMPRENDIMIENTO',
      entidadId: nuevo.id,
      datosNuevos: nuevo,
    });

    return nuevo;
  },

  async update(
    id: string,
    data: {
      nombre?: string;
      nombreFantasia?: string;
      responsable?: string;
      documento?: string;
      cuit?: string;
      telefono?: string;
      direccion?: string;
      alias?: string;
      cvu?: string;
      cbu?: string;
      mail?: string;
      rubro?: string;
      descripcion?: string;
      porcentajeRetencion?: number;
      estado?: string;
    },
    usuario = 'administrador'
  ) {
    const actual = await prisma.emprendimiento.findUnique({ where: { id } });
    if (!actual) throw new Error('Emprendimiento no encontrado.');

    const nuevoEstado = data.estado !== undefined ? data.estado : actual.estado;
    const nuevoActivo = nuevoEstado === 'ACTIVO';

    const actualizado = await prisma.emprendimiento.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.nombreFantasia !== undefined && { nombreFantasia: data.nombreFantasia?.trim() || null }),
        ...(data.responsable && { responsable: data.responsable.trim() }),
        ...(data.documento !== undefined && { documento: data.documento?.trim() || null }),
        ...(data.cuit !== undefined && { cuit: data.cuit?.trim() || null }),
        ...(data.telefono !== undefined && { telefono: data.telefono?.trim() || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.alias !== undefined && { alias: data.alias?.trim() || null }),
        ...(data.cvu !== undefined && { cvu: data.cvu?.trim() || null }),
        ...(data.cbu !== undefined && { cbu: data.cbu?.trim() || null }),
        ...(data.mail !== undefined && { mail: data.mail?.trim() || null }),
        ...(data.rubro !== undefined && { rubro: data.rubro?.trim() || null }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.porcentajeRetencion !== undefined && { porcentajeRetencion: Number(data.porcentajeRetencion) }),
        estado: nuevoEstado,
        activo: nuevoActivo,
      },
    });

    await municipalAuditService.logAction({
      usuario,
      accion: 'EDITAR_EMPRENDIMIENTO',
      entidad: 'EMPRENDIMIENTO',
      entidadId: id,
      datosAnteriores: actual,
      datosNuevos: actualizado,
    });

    return actualizado;
  },

  /**
   * Reconstruye la historia municipal integral (expediente y línea de tiempo)
   */
  async getExpediente(id: string) {
    const emp = await this.getById(id);
    if (!emp) throw new Error('Emprendimiento no encontrado');

    const timeline: Array<{
      id: string;
      fecha: Date | string;
      tipo: 'ALTA' | 'COLECTIVO' | 'POSTULACION' | 'EDICION' | 'FISCALIZACION' | 'CAPACITACION' | 'REUNION' | 'SERVICIO' | 'SEGUIMIENTO' | 'ESTADO';
      titulo: string;
      descripcion: string;
      estado?: string;
      badge?: string;
      detalles?: any;
    }> = [];

    // 1. Alta inicial
    timeline.push({
      id: `alta-${emp.id}`,
      fecha: emp.fechaCreacion,
      tipo: 'ALTA',
      titulo: 'Alta Institucional en el Municipio',
      descripcion: `Registro inicial con Código Oficial ${emp.codigo} y responsable ${emp.responsable}.`,
      badge: emp.estado,
    });

    // 2. Colectivos
    emp.colectivos.forEach((c) => {
      timeline.push({
        id: `col-in-${c.id}`,
        fecha: c.fechaIngreso,
        tipo: 'COLECTIVO',
        titulo: `Incorporación a Colectivo: "${c.colectivo.nombre}"`,
        descripcion: c.observaciones || `Ingreso al colectivo ${c.colectivo.nombre}.`,
        estado: c.estado,
        badge: c.estado,
      });
      if (c.fechaSalida) {
        timeline.push({
          id: `col-out-${c.id}`,
          fecha: c.fechaSalida,
          tipo: 'COLECTIVO',
          titulo: `Finalización en Colectivo: "${c.colectivo.nombre}"`,
          descripcion: `Salida del colectivo. Motivo/observación: ${c.observaciones || 'No especificado'}`,
          estado: 'FINALIZADO',
          badge: 'FINALIZADO',
        });
      }
    });

    // 3. Postulaciones a Convocatorias
    emp.postulaciones.forEach((p) => {
      timeline.push({
        id: `post-${p.id}`,
        fecha: p.fechaResolucion || p.fecha,
        tipo: 'POSTULACION',
        titulo: `Postulación a Convocatoria: "${p.convocatoria.nombre}"`,
        descripcion: `Estado: ${p.estado}. ${p.evaluacion ? `Dictamen: ${p.evaluacion}. ` : ''}${p.observaciones ? `Observaciones: ${p.observaciones}` : ''}`,
        estado: p.estado,
        badge: p.estado,
      });
    });

    // 4. Participaciones en Ediciones
    emp.participaciones.forEach((part) => {
      timeline.push({
        id: `ed-part-${part.id}`,
        fecha: part.fechaInicio || part.fechaCreacion,
        tipo: 'EDICION',
        titulo: `Participación en Edición: "${part.edicion.nombre}"`,
        descripcion: `Local/Puesto: ${part.local ? `${part.local.codigo} (${part.local.nombre})` : 'Sin puesto asignado'}. ${part.observaciones || ''}`,
        estado: part.estado,
        badge: part.estado,
      });
    });

    // 5. Fiscalizaciones
    emp.fiscalizaciones.forEach((f) => {
      timeline.push({
        id: `fisc-${f.id}`,
        fecha: f.fecha,
        tipo: 'FISCALIZACION',
        titulo: `Fiscalización Municipal: ${f.resultado}`,
        descripcion: `${f.motivo ? `Motivo: ${f.motivo}. ` : ''}Observaciones: ${f.observaciones || 'Sin observaciones'}. Auditor: ${f.usuario}. ${f.producto ? `Producto auditado: ${f.producto.nombre}` : ''}`,
        estado: f.resultado,
        badge: f.resultado,
      });
    });

    // 6. Capacitaciones
    emp.capacitaciones.forEach((cap) => {
      timeline.push({
        id: `cap-${cap.id}`,
        fecha: cap.capacitacion.fecha,
        tipo: 'CAPACITACION',
        titulo: `Capacitación: "${cap.capacitacion.nombre}"`,
        descripcion: `Lugar: ${cap.capacitacion.lugar || 'Municipalidad'}. Asistencia: ${cap.asistencia ? 'Presente' : 'Ausente'}. Estado: ${cap.estado}`,
        estado: cap.estado,
        badge: cap.asistencia ? 'ASISTIÓ' : 'AUSENTE',
      });
    });

    // 7. Reuniones
    emp.reuniones.forEach((r) => {
      timeline.push({
        id: `reu-${r.id}`,
        fecha: r.fecha,
        tipo: 'REUNION',
        titulo: `Reunión Institucional: ${r.tema}`,
        descripcion: `Acuerdos: ${r.acuerdos || 'Sin acuerdos formales'}. Responsable municipal: ${r.responsable}`,
        estado: r.estado,
        badge: r.estado,
      });
    });

    // 8. Servicios Municipales
    emp.serviciosRecibidos.forEach((s) => {
      timeline.push({
        id: `serv-${s.id}`,
        fecha: s.fecha,
        tipo: 'SERVICIO',
        titulo: `Servicio Municipal: "${s.servicio.nombre}"`,
        descripcion: `Estado: ${s.estado}. Responsable: ${s.responsable || 'Área Municipal'}. Observaciones: ${s.observaciones || ''}`,
        estado: s.estado,
        badge: s.estado,
      });
    });

    // 9. Seguimientos
    emp.seguimientos.forEach((seg) => {
      timeline.push({
        id: `seg-${seg.id}`,
        fecha: seg.fecha,
        tipo: 'SEGUIMIENTO',
        titulo: `Interacción [${seg.tipo}]: ${seg.motivo}`,
        descripcion: `${seg.observacion}${seg.proximoContacto ? ` | Próximo contacto agendado: ${new Date(seg.proximoContacto).toLocaleDateString('es-AR')}` : ''}`,
        estado: seg.estado,
        badge: seg.tipo,
      });
    });

    // Ordenar cronológicamente descendente (lo más reciente primero)
    timeline.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Métricas comerciales vinculadas sin duplicar
    const [totalesVentas, saldo] = await Promise.all([
      prisma.venta.aggregate({
        where: { emprendimientoId: id, estado: 'ACTIVO' },
        _count: true,
        _sum: { total: true },
      }),
      prisma.retiro.aggregate({
        where: { emprendimientoId: id, estado: 'ACTIVO' },
        _sum: { monto: true },
      }),
    ]);

    return {
      emprendimiento: emp,
      resumenComercial: {
        totalVentas: totalesVentas._count || 0,
        montoTotalFacturado: totalesVentas._sum.total || 0,
        totalRetirado: saldo._sum.monto || 0,
      },
      lineaDeTiempo: timeline,
    };
  },
};
