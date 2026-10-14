import { prisma } from '../db';

export const municipalStatisticsService = {
  async getDashboardStats() {
    const [
      totalEmprendimientos,
      emprendimientosActivos,
      emprendimientosInactivos,
      totalConvocatorias,
      convocatoriasAbiertas,
      postulacionesPendientes,
      postulacionesAprobadas,
      postulacionesRechazadas,
      totalColectivos,
      totalEdiciones,
      edicionesEnCurso,
      totalLocales,
      fiscalizacionesAprobadas,
      fiscalizacionesObservadas,
      fiscalizacionesRechazadas,
      totalCapacitaciones,
      seguimientosPendientes,
      ultimasPostulaciones,
      ultimosSeguimientos,
    ] = await Promise.all([
      prisma.emprendimiento.count(),
      prisma.emprendimiento.count({ where: { estado: 'ACTIVO' } }),
      prisma.emprendimiento.count({ where: { estado: { in: ['INACTIVO', 'SUSPENDIDO', 'FINALIZADO'] } } }),
      prisma.convocatoria.count(),
      prisma.convocatoria.count({ where: { estado: 'ABIERTA' } }),
      prisma.postulacion.count({ where: { estado: 'PENDIENTE' } }),
      prisma.postulacion.count({ where: { estado: 'APROBADA' } }),
      prisma.postulacion.count({ where: { estado: 'RECHAZADA' } }),
      prisma.colectivo.count({ where: { estado: 'ACTIVO' } }),
      prisma.edicion.count(),
      prisma.edicion.count({ where: { estado: { in: ['ABIERTA', 'EN_CURSO'] } } }),
      prisma.local.count({ where: { activo: true } }),
      prisma.fiscalizacion.count({ where: { resultado: 'APROBADA' } }),
      prisma.fiscalizacion.count({ where: { resultado: { in: ['OBSERVADA', 'REQUIERE_CORRECCION'] } } }),
      prisma.fiscalizacion.count({ where: { resultado: 'RECHAZADA' } }),
      prisma.capacitacion.count(),
      prisma.seguimientoMunicipal.count({
        where: {
          OR: [
            { estado: 'PENDIENTE' },
            { proximoContacto: { gte: new Date() } },
          ],
        },
      }),
      prisma.postulacion.findMany({
        take: 5,
        orderBy: { fecha: 'desc' },
        include: {
          convocatoria: true,
          emprendimiento: { select: { id: true, codigo: true, nombre: true } },
        },
      }),
      prisma.seguimientoMunicipal.findMany({
        take: 5,
        orderBy: { fecha: 'desc' },
        include: {
          emprendimiento: { select: { id: true, codigo: true, nombre: true, telefono: true } },
        },
      }),
    ]);

    return {
      emprendimientos: {
        total: totalEmprendimientos,
        activos: emprendimientosActivos,
        inactivos: emprendimientosInactivos,
      },
      convocatorias: {
        total: totalConvocatorias,
        abiertas: convocatoriasAbiertas,
      },
      postulaciones: {
        pendientes: postulacionesPendientes,
        aprobadas: postulacionesAprobadas,
        rechazadas: postulacionesRechazadas,
        total: postulacionesPendientes + postulacionesAprobadas + postulacionesRechazadas,
      },
      colectivos: {
        total: totalColectivos,
      },
      ediciones: {
        total: totalEdiciones,
        enCurso: edicionesEnCurso,
      },
      locales: {
        total: totalLocales,
      },
      fiscalizaciones: {
        aprobadas: fiscalizacionesAprobadas,
        observadas: fiscalizacionesObservadas,
        rechazadas: fiscalizacionesRechazadas,
        total: fiscalizacionesAprobadas + fiscalizacionesObservadas + fiscalizacionesRechazadas,
      },
      capacitaciones: {
        total: totalCapacitaciones,
      },
      seguimientos: {
        pendientes: seguimientosPendientes,
      },
      ultimasPostulaciones,
      ultimosSeguimientos,
    };
  },
};
