import { prisma } from '../db';

export const entrepreneurService = {
  async getAll(incluirInactivos = false) {
    return prisma.emprendimiento.findMany({
      where: incluirInactivos ? {} : { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
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

  async getById(id: string) {
    return prisma.emprendimiento.findUnique({
      where: { id },
      include: {
        productos: {
          orderBy: { codigo: 'asc' },
        },
      },
    });
  },

  async getByCode(codigo: string) {
    return prisma.emprendimiento.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
    });
  },

  async create(data: {
    codigo: string;
    nombre: string;
    responsable: string;
    telefono?: string;
    direccion?: string;
    alias?: string;
    cvu?: string;
    mail?: string;
    rubro?: string;
    porcentajeRetencion?: number;
  }) {
    if (!data.codigo || !data.nombre || !data.responsable) {
      throw new Error('Los campos código, nombre y responsable son obligatorios.');
    }

    const cleanCode = data.codigo.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2) {
      throw new Error('El código del emprendimiento debe tener al menos 2 caracteres.');
    }

    const existing = await prisma.emprendimiento.findUnique({
      where: { codigo: cleanCode },
    });
    if (existing) {
      throw new Error(`Ya existe un emprendimiento con el código ${cleanCode}.`);
    }

    return prisma.emprendimiento.create({
      data: {
        codigo: cleanCode,
        nombre: data.nombre.trim(),
        responsable: data.responsable.trim(),
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
        alias: data.alias?.trim() || null,
        cvu: data.cvu?.trim() || null,
        mail: data.mail?.trim() || null,
        rubro: data.rubro?.trim() || null,
        porcentajeRetencion: data.porcentajeRetencion || 0.0,
      },
    });
  },

  async update(
    id: string,
    data: {
      nombre?: string;
      responsable?: string;
      telefono?: string;
      direccion?: string;
      alias?: string;
      cvu?: string;
      mail?: string;
      rubro?: string;
      porcentajeRetencion?: number;
      activo?: boolean;
    }
  ) {
    return prisma.emprendimiento.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.responsable && { responsable: data.responsable.trim() }),
        ...(data.telefono !== undefined && { telefono: data.telefono?.trim() || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.alias !== undefined && { alias: data.alias?.trim() || null }),
        ...(data.cvu !== undefined && { cvu: data.cvu?.trim() || null }),
        ...(data.mail !== undefined && { mail: data.mail?.trim() || null }),
        ...(data.rubro !== undefined && { rubro: data.rubro?.trim() || null }),
        ...(data.porcentajeRetencion !== undefined && { porcentajeRetencion: Number(data.porcentajeRetencion) }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });
  },

  async toggleActivo(id: string) {
    const current = await prisma.emprendimiento.findUnique({ where: { id } });
    if (!current) throw new Error('Emprendimiento no encontrado');
    return prisma.emprendimiento.update({
      where: { id },
      data: { activo: !current.activo },
    });
  },
};
