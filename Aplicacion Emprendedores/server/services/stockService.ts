import { prisma } from '../db';
import { productService } from './productService';

export const stockService = {
  async getMovements(filtros?: {
    productoId?: string;
    emprendimientoId?: string;
    tipoMovimiento?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const where: any = {};

    if (filtros?.productoId) {
      where.productoId = filtros.productoId;
    }

    if (filtros?.emprendimientoId) {
      where.producto = {
        emprendimientoId: filtros.emprendimientoId,
      };
    }

    if (filtros?.tipoMovimiento) {
      where.tipoMovimiento = filtros.tipoMovimiento;
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

    return prisma.movimientoStock.findMany({
      where,
      include: {
        producto: {
          include: {
            emprendimiento: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 200,
    });
  },

  async createMovement(data: {
    productoId: string;
    cantidad: number;
    tipoMovimiento: 'INGRESO' | 'AJUSTE' | 'DEVOLUCION' | 'BAJA';
    observaciones?: string;
    fecha?: Date;
    usuario?: string;
  }) {
    const producto = await prisma.producto.findUnique({
      where: { id: data.productoId },
      include: { emprendimiento: true },
    });

    if (!producto) {
      throw new Error('Producto no encontrado.');
    }

    let cantidadNum = Number(data.cantidad);
    if (!cantidadNum || isNaN(cantidadNum) || cantidadNum === 0) {
      throw new Error('La cantidad debe ser un número distinto de 0.');
    }

    // Si es BAJA (eliminación/reducción de stock), asegurar que el valor sea negativo
    if (data.tipoMovimiento === 'BAJA') {
      cantidadNum = -Math.abs(cantidadNum);
    }

    // Check configuration
    const config = await prisma.configuracion.findFirst();
    const permitirNegativo = config?.permitirStockNegativo ?? false;

    const currentStock = await productService.getProductStock(producto.id);
    const newStock = currentStock + cantidadNum;

    if (newStock < 0 && !permitirNegativo) {
      throw new Error(
        `Operación rechazada: el stock actual es ${currentStock} u. y no es posible eliminar ${Math.abs(
          cantidadNum
        )} unidades.`
      );
    }

    return prisma.movimientoStock.create({
      data: {
        productoId: data.productoId,
        cantidad: cantidadNum,
        tipoMovimiento: data.tipoMovimiento,
        fecha: data.fecha || new Date(),
        observaciones: data.observaciones?.trim() || null,
        usuario: data.usuario || 'admin',
      },
      include: {
        producto: {
          include: {
            emprendimiento: true,
          },
        },
      },
    });
  },

  async getLowStockProducts() {
    const productos = await productService.getAll({ soloActivos: true });
    return productos.filter((p) => (p.stockCalculado ?? 0) <= p.stockMinimoAlerta);
  },
};
