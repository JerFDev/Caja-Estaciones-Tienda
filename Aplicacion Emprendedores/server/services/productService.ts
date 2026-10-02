import { prisma } from '../db';

export const productService = {
  async getAll(filtros?: {
    emprendimientoId?: string;
    search?: string;
    soloActivos?: boolean;
    conStock?: boolean;
  }) {
    const where: any = {};

    if (filtros?.soloActivos !== false) {
      where.activo = true;
    }

    if (filtros?.emprendimientoId) {
      where.emprendimientoId = filtros.emprendimientoId;
    }

    if (filtros?.search) {
      const q = filtros.search.trim();
      where.OR = [
        { codigo: { contains: q } },
        { nombre: { contains: q } },
        { emprendimiento: { nombre: { contains: q } } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      include: {
        emprendimiento: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            rubro: true,
            activo: true,
          },
        },
      },
      orderBy: { codigo: 'asc' },
    });

    // Compute stock dynamically for each product
    const productIds = productos.map((p) => p.id);
    if (productIds.length === 0) return [];

    const movimientos = await prisma.movimientoStock.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
      where: { productoId: { in: productIds } },
    });

    const ventas = await prisma.venta.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
      where: {
        productoId: { in: productIds },
        estado: 'ACTIVO',
      },
    });

    const movMap = new Map<string, number>();
    movimientos.forEach((m) => movMap.set(m.productoId, m._sum.cantidad || 0));

    const ventMap = new Map<string, number>();
    ventas.forEach((v) => ventMap.set(v.productoId, v._sum.cantidad || 0));

    return productos.map((p) => {
      const ingresos = movMap.get(p.id) || 0;
      const vendidas = ventMap.get(p.id) || 0;
      const stockCalculado = ingresos - vendidas;
      return {
        ...p,
        stockCalculado,
      };
    });
  },

  async getById(id: string) {
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        emprendimiento: true,
      },
    });
    if (!producto) return null;

    const stock = await this.getProductStock(id);
    return {
      ...producto,
      stockCalculado: stock,
    };
  },

  async getByCode(codigo: string) {
    const cleanCode = codigo.trim().toUpperCase();
    const producto = await prisma.producto.findUnique({
      where: { codigo: cleanCode },
      include: {
        emprendimiento: true,
      },
    });
    if (!producto) return null;

    const stock = await this.getProductStock(producto.id);
    return {
      ...producto,
      stockCalculado: stock,
    };
  },

  async getProductStock(productoId: string): Promise<number> {
    const [ingresos, ventas] = await Promise.all([
      prisma.movimientoStock.aggregate({
        _sum: { cantidad: true },
        where: { productoId },
      }),
      prisma.venta.aggregate({
        _sum: { cantidad: true },
        where: { productoId, estado: 'ACTIVO' },
      }),
    ]);

    const totalIngresos = ingresos._sum.cantidad || 0;
    const totalVentas = ventas._sum.cantidad || 0;
    return totalIngresos - totalVentas;
  },

  /**
   * Genera el siguiente código correlativo disponible para un emprendimiento.
   * Ej: Si el emprendimiento es AKM, busca AKM001, AKM002 -> devuelve AKM003
   */
  async generateNextCode(emprendimientoId: string): Promise<string> {
    const emprendimiento = await prisma.emprendimiento.findUnique({
      where: { id: emprendimientoId },
    });
    if (!emprendimiento) {
      throw new Error('Emprendimiento no encontrado');
    }

    const prefix = emprendimiento.codigo.trim().toUpperCase();

    // Find all products starting with this prefix
    const existingProducts = await prisma.producto.findMany({
      where: {
        codigo: { startsWith: prefix },
      },
      select: { codigo: true },
    });

    let maxNumber = 0;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');

    for (const p of existingProducts) {
      const match = p.codigo.match(prefixRegex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    const nextNumber = maxNumber + 1;
    // Format to 3 digits minimum, or more if needed (e.g. 001, 002)
    const formatted = nextNumber.toString().padStart(3, '0');
    return `${prefix}${formatted}`;
  },

  async create(data: {
    codigo?: string;
    emprendimientoId: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    stockMinimoAlerta?: number;
    stockInicial?: number;
  }) {
    const emprendimiento = await prisma.emprendimiento.findUnique({
      where: { id: data.emprendimientoId },
    });
    if (!emprendimiento) {
      throw new Error('El emprendimiento seleccionado no existe.');
    }

    if (!data.nombre) {
      throw new Error('El nombre del producto es obligatorio.');
    }

    let code = data.codigo?.trim().toUpperCase();
    if (!code) {
      code = await this.generateNextCode(data.emprendimientoId);
    }

    // Verify code uniqueness
    const existing = await prisma.producto.findUnique({
      where: { codigo: code },
    });
    if (existing) {
      throw new Error(`Ya existe un producto con el código ${code}.`);
    }

    const precioNum = Number(data.precio);
    if (isNaN(precioNum) || precioNum < 0) {
      throw new Error('El precio debe ser un número válido mayor o igual a 0.');
    }

    const stockInicialNum = data.stockInicial ? Math.round(Number(data.stockInicial)) : 0;

    return prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          codigo: code,
          emprendimientoId: data.emprendimientoId,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || null,
          precio: precioNum,
          stockMinimoAlerta: data.stockMinimoAlerta ?? 2,
        },
      });

      // Si se indicó stock inicial mayor a 0, registrar el movimiento de ingreso
      if (stockInicialNum > 0) {
        await tx.movimientoStock.create({
          data: {
            productoId: producto.id,
            cantidad: stockInicialNum,
            tipoMovimiento: 'INGRESO',
            observaciones: 'Stock inicial al dar de alta el producto',
            usuario: 'admin',
          },
        });
      }

      return producto;
    });
  },

  async update(
    id: string,
    data: {
      nombre?: string;
      descripcion?: string;
      precio?: number;
      stockMinimoAlerta?: number;
      activo?: boolean;
    }
  ) {
    if (data.precio !== undefined && data.precio < 0) {
      throw new Error('El precio no puede ser negativo.');
    }

    return prisma.producto.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.precio !== undefined && { precio: data.precio }),
        ...(data.stockMinimoAlerta !== undefined && { stockMinimoAlerta: data.stockMinimoAlerta }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });
  },

  async toggleActivo(id: string) {
    const current = await prisma.producto.findUnique({ where: { id } });
    if (!current) throw new Error('Producto no encontrado');
    return prisma.producto.update({
      where: { id },
      data: { activo: !current.activo },
    });
  },
};
