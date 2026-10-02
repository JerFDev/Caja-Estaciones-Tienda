import { prisma } from '../db';
import { productService } from './productService';
import { v4 as uuidv4 } from 'uuid';

export const salesService = {
  async createSale(data: {
    productoCodigo?: string;
    productoId?: string;
    cantidad: number;
    descuento?: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    tipoCliente: 'TURISTA' | 'RESIDENTE';
    turno?: 'MANANA' | 'TARDE';
    observaciones?: string;
    usuario?: string;
    fecha?: Date | string;
  }) {
    const cantidadNum = Number(data.cantidad);
    if (!cantidadNum || isNaN(cantidadNum) || cantidadNum <= 0) {
      throw new Error('La cantidad de venta debe ser mayor a 0.');
    }

    // Buscar producto
    let producto = null;
    if (data.productoId) {
      producto = await prisma.producto.findUnique({
        where: { id: data.productoId },
        include: { emprendimiento: true },
      });
    } else if (data.productoCodigo) {
      const code = data.productoCodigo.trim().toUpperCase();
      producto = await prisma.producto.findUnique({
        where: { codigo: code },
        include: { emprendimiento: true },
      });
    }

    if (!producto) {
      throw new Error(`Producto no encontrado.`);
    }

    if (!producto.activo) {
      throw new Error(`El producto ${producto.codigo} (${producto.nombre}) se encuentra inactivo.`);
    }

    if (!producto.emprendimiento.activo) {
      throw new Error(`El emprendimiento ${producto.emprendimiento.nombre} se encuentra inactivo.`);
    }

    // Verificar stock y crear venta en una transacción atómica
    const config = await prisma.configuracion.findFirst();
    const permitirNegativo = config?.permitirStockNegativo ?? false;

    const saleDate = data.fecha ? new Date(data.fecha) : new Date();
    if (isNaN(saleDate.getTime())) {
      throw new Error('Fecha inválida proporcionada.');
    }
    const hours = saleDate.getHours().toString().padStart(2, '0');
    const minutes = saleDate.getMinutes().toString().padStart(2, '0');
    const seconds = saleDate.getSeconds().toString().padStart(2, '0');
    const horaStr = `${hours}:${minutes}:${seconds}`;

    // Determinar turno si no se especificó
    let turno = data.turno;
    if (!turno) {
      turno = (config?.turnoActual as 'MANANA' | 'TARDE') || 'MANANA';
    }

    const precioUnitario = producto.precio;
    const subtotal = cantidadNum * precioUnitario;
    const descuentoNum = Math.max(0, Math.min(subtotal, Math.round((Number(data.descuento) || 0) * 100) / 100));
    const total = Math.round((subtotal - descuentoNum) * 100) / 100;
    const localCodigo = config?.localCodigo || 'LOCAL_01';
    const identificadorUnico = `${localCodigo}-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const venta = await prisma.$transaction(async (tx) => {
      const currentStock = await productService.getProductStock(producto.id);

      if (currentStock < cantidadNum && !permitirNegativo) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Stock disponible: ${currentStock}, cantidad solicitada: ${cantidadNum}.`
        );
      }

      const nuevaVenta = await tx.venta.create({
        data: {
          identificadorUnico,
          fecha: saleDate,
          hora: horaStr,
          turno,
          productoId: producto.id,
          emprendimientoId: producto.emprendimientoId,
          cantidad: cantidadNum,
          precioUnitario,
          descuento: descuentoNum,
          total,
          metodoPago: data.metodoPago,
          tipoCliente: data.tipoCliente,
          localOrigen: localCodigo,
          usuario: data.usuario || 'cajero',
          observaciones: data.observaciones?.trim() || null,
          estado: 'ACTIVO',
        },
        include: {
          producto: true,
          emprendimiento: true,
        },
      });

      // Registrar en auditoría
      await tx.auditoriaLog.create({
        data: {
          entidad: 'VENTA',
          entidadId: nuevaVenta.id,
          accion: 'CREACION',
          usuario: data.usuario || 'cajero',
          detallesJson: JSON.stringify({
            codigo: producto.codigo,
            cantidad: cantidadNum,
            descuento: descuentoNum,
            total,
            metodoPago: data.metodoPago,
            identificadorUnico,
          }),
        },
      });

      return nuevaVenta;
    });

    return venta;
  },

  async getSales(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    emprendimientoId?: string;
    metodoPago?: string;
    tipoCliente?: string;
    turno?: string;
    estado?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.emprendimientoId) {
      where.emprendimientoId = filtros.emprendimientoId;
    }

    if (filtros?.metodoPago) {
      where.metodoPago = filtros.metodoPago;
    }

    if (filtros?.tipoCliente) {
      where.tipoCliente = filtros.tipoCliente;
    }

    if (filtros?.turno) {
      where.turno = filtros.turno;
    }

    if (filtros?.search) {
      const q = filtros.search.trim();
      where.OR = [
        { identificadorUnico: { contains: q } },
        { producto: { codigo: { contains: q } } },
        { producto: { nombre: { contains: q } } },
        { emprendimiento: { nombre: { contains: q } } },
      ];
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

    return prisma.venta.findMany({
      where,
      include: {
        producto: true,
        emprendimiento: true,
      },
      orderBy: { fecha: 'desc' },
      take: 500,
    });
  },

  async voidSale(id: string, motivo: string, usuario = 'admin') {
    if (!motivo || !motivo.trim()) {
      throw new Error('Debe especificar un motivo para anular la venta.');
    }

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: { producto: true, emprendimiento: true },
    });

    if (!venta) {
      throw new Error('Venta no encontrada.');
    }

    if (venta.estado === 'ANULADO') {
      throw new Error('Esta venta ya se encuentra anulada.');
    }

    const updated = await prisma.venta.update({
      where: { id },
      data: {
        estado: 'ANULADO',
        motivoAnulacion: motivo.trim(),
      },
      include: { producto: true, emprendimiento: true },
    });

    await prisma.auditoriaLog.create({
      data: {
        entidad: 'VENTA',
        entidadId: id,
        accion: 'ANULACION',
        usuario,
        detallesJson: JSON.stringify({
          motivo,
          ventaTotal: venta.total,
          productoCodigo: venta.producto.codigo,
        }),
      },
    });

    return updated;
  },
};
