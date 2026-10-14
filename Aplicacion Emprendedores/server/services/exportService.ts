import { prisma } from '../db';
import { balancesService } from './balancesService';
import { productService } from './productService';
import ExcelJS from 'exceljs';
import crypto from 'crypto';

export const exportService = {
  async generateExcel(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    emprendimientoId?: string;
    tipo?: 'TODO' | 'VENTAS' | 'STOCK' | 'RETIROS' | 'SALDOS' | 'EMPRENDIMIENTOS' | 'PRODUCTOS';
  }): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Muni Emprendedores - Tienda Creativa';
    workbook.created = new Date();

    const tipo = filtros?.tipo || 'TODO';

    // Helper styling
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD5792A' }, // Brand Municipio Bariloche orange
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    // 1. HOJA VENTAS
    if (tipo === 'TODO' || tipo === 'VENTAS') {
      const wsVentas = workbook.addWorksheet('Ventas');
      wsVentas.columns = [
        { header: 'ID Único Operación', key: 'idUnico', width: 32 },
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Hora', key: 'hora', width: 10 },
        { header: 'Turno', key: 'turno', width: 10 },
        { header: 'Código Producto', key: 'codProd', width: 16 },
        { header: 'Producto', key: 'producto', width: 28 },
        { header: 'Código Emprendimiento', key: 'codEmp', width: 16 },
        { header: 'Emprendimiento', key: 'emprendimiento', width: 26 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'Precio Unitario ($)', key: 'precioUnitario', width: 16 },
        { header: 'Descuento ($)', key: 'descuento', width: 14 },
        { header: 'Total ($)', key: 'total', width: 16 },
        { header: 'Método Pago', key: 'metodoPago', width: 16 },
        { header: 'Tipo Cliente', key: 'tipoCliente', width: 14 },
        { header: 'Local', key: 'local', width: 14 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Observaciones', key: 'obs', width: 24 },
      ];

      wsVentas.getRow(1).fill = headerFill;
      wsVentas.getRow(1).font = headerFont;

      const where: any = {};
      if (filtros?.emprendimientoId) where.emprendimientoId = filtros.emprendimientoId;
      if (filtros?.fechaDesde || filtros?.fechaHasta) {
        where.fecha = {};
        if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
        if (filtros.fechaHasta) {
          const h = new Date(filtros.fechaHasta);
          h.setHours(23, 59, 59, 999);
          where.fecha.lte = h;
        }
      }

      const ventas = await prisma.venta.findMany({
        where,
        include: { producto: true, emprendimiento: true },
        orderBy: { fecha: 'asc' },
      });

      for (const v of ventas) {
        const vDate = new Date(v.fecha);
        const fechaStr = vDate.toISOString().split('T')[0];
        wsVentas.addRow({
          idUnico: v.identificadorUnico,
          fecha: fechaStr,
          hora: v.hora,
          turno: v.turno === 'MANANA' ? 'Mañana' : 'Tarde',
          codProd: v.producto.codigo,
          producto: v.producto.nombre,
          codEmp: v.emprendimiento.codigo,
          emprendimiento: v.emprendimiento.nombre,
          cantidad: v.cantidad,
          precioUnitario: v.precioUnitario,
          descuento: (v as any).descuento || 0,
          total: v.total,
          metodoPago: v.metodoPago,
          tipoCliente: v.tipoCliente,
          local: v.localOrigen,
          estado: v.estado,
          obs: v.observaciones || (v.estado === 'ANULADO' ? `ANULADA: ${v.motivoAnulacion}` : ''),
        });
      }
    }

    // 2. HOJA STOCK
    if (tipo === 'TODO' || tipo === 'STOCK') {
      const wsStock = workbook.addWorksheet('Stock');
      wsStock.columns = [
        { header: 'Código Producto', key: 'codProd', width: 16 },
        { header: 'Producto', key: 'producto', width: 28 },
        { header: 'Código Emprendimiento', key: 'codEmp', width: 16 },
        { header: 'Emprendimiento', key: 'emprendimiento', width: 26 },
        { header: 'Precio Actual ($)', key: 'precio', width: 16 },
        { header: 'Stock Actual', key: 'stockActual', width: 14 },
        { header: 'Alerta Stock Mínimo', key: 'alertaMin', width: 16 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];

      wsStock.getRow(1).fill = headerFill;
      wsStock.getRow(1).font = headerFont;

      const productos = await productService.getAll({
        emprendimientoId: filtros?.emprendimientoId,
      });

      for (const p of productos) {
        wsStock.addRow({
          codProd: p.codigo,
          producto: p.nombre,
          codEmp: p.emprendimiento.codigo,
          emprendimiento: p.emprendimiento.nombre,
          precio: p.precio,
          stockActual: p.stockCalculado ?? 0,
          alertaMin: p.stockMinimoAlerta,
          estado: p.activo ? 'Activo' : 'Inactivo',
        });
      }
    }

    // 3. HOJA RETIROS
    if (tipo === 'TODO' || tipo === 'RETIROS') {
      const wsRetiros = workbook.addWorksheet('Retiros');
      wsRetiros.columns = [
        { header: 'ID Único Retiro', key: 'idUnico', width: 32 },
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Código Emprendimiento', key: 'codEmp', width: 16 },
        { header: 'Emprendimiento', key: 'emprendimiento', width: 26 },
        { header: 'Monto Retirado ($)', key: 'monto', width: 18 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Observaciones', key: 'obs', width: 28 },
        { header: 'Usuario', key: 'usuario', width: 16 },
      ];

      wsRetiros.getRow(1).fill = headerFill;
      wsRetiros.getRow(1).font = headerFont;

      const whereRet: any = {};
      if (filtros?.emprendimientoId) whereRet.emprendimientoId = filtros.emprendimientoId;
      if (filtros?.fechaDesde || filtros?.fechaHasta) {
        whereRet.fecha = {};
        if (filtros.fechaDesde) whereRet.fecha.gte = new Date(filtros.fechaDesde);
        if (filtros.fechaHasta) {
          const h = new Date(filtros.fechaHasta);
          h.setHours(23, 59, 59, 999);
          whereRet.fecha.lte = h;
        }
      }

      const retiros = await prisma.retiro.findMany({
        where: whereRet,
        include: { emprendimiento: true },
        orderBy: { fecha: 'asc' },
      });

      for (const r of retiros) {
        const rDate = new Date(r.fecha);
        wsRetiros.addRow({
          idUnico: r.identificadorUnico,
          fecha: rDate.toISOString().split('T')[0],
          codEmp: r.emprendimiento.codigo,
          emprendimiento: r.emprendimiento.nombre,
          monto: r.monto,
          estado: r.estado,
          obs: r.observaciones || (r.estado === 'ANULADO' ? `ANULADO: ${r.motivoAnulacion}` : ''),
          usuario: r.usuario,
        });
      }
    }

    // 4. HOJA SALDOS
    if (tipo === 'TODO' || tipo === 'SALDOS') {
      const wsSaldos = workbook.addWorksheet('Saldos');
      wsSaldos.columns = [
        { header: 'Código', key: 'codigo', width: 12 },
        { header: 'Emprendimiento', key: 'nombre', width: 26 },
        { header: 'Responsable', key: 'responsable', width: 24 },
        { header: 'Rubro', key: 'rubro', width: 18 },
        { header: 'Total Ventas ($)', key: 'ventasTotales', width: 18 },
        { header: 'Ventas Efectivo ($)', key: 'ventasEfectivo', width: 18 },
        { header: 'Ventas Transferencia ($)', key: 'ventasTransf', width: 20 },
        { header: 'Total Retiros ($)', key: 'totalRetiros', width: 18 },
        { header: 'Retención ($)', key: 'retencion', width: 16 },
        { header: 'Saldo Disponible Efectivo ($)', key: 'saldoDisp', width: 24 },
        { header: 'Unidades Vendidas', key: 'unidadesVendidas', width: 16 },
        { header: 'Stock Restante', key: 'stockActual', width: 16 },
      ];

      wsSaldos.getRow(1).fill = headerFill;
      wsSaldos.getRow(1).font = headerFont;

      const todosSaldos = await balancesService.getBalances(true);
      const saldos = filtros?.emprendimientoId
        ? todosSaldos.filter((s) => s.id === filtros.emprendimientoId)
        : todosSaldos;
      for (const s of saldos) {
        wsSaldos.addRow({
          codigo: s.codigo,
          nombre: s.nombre,
          responsable: s.responsable,
          rubro: s.rubro || '',
          ventasTotales: s.ventasTotales,
          ventasEfectivo: s.ventasEfectivo,
          ventasTransf: s.ventasTransferencia,
          totalRetiros: s.totalRetiros,
          retencion: s.montoRetencion,
          saldoDisp: s.saldoEfectivoDisponible,
          unidadesVendidas: s.unidadesVendidas,
          stockActual: s.stockActual,
        });
      }
    }

    // 5. HOJA EMPRENDIMIENTOS
    if (tipo === 'TODO' || tipo === 'EMPRENDIMIENTOS') {
      const wsEmp = workbook.addWorksheet('Emprendimientos');
      wsEmp.columns = [
        { header: 'Código', key: 'codigo', width: 14 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Responsable', key: 'responsable', width: 26 },
        { header: 'Teléfono', key: 'telefono', width: 18 },
        { header: 'Email', key: 'email', width: 24 },
        { header: 'Rubro', key: 'rubro', width: 20 },
        { header: 'Dirección', key: 'direccion', width: 24 },
        { header: 'Retención (%)', key: 'retencion', width: 16 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];

      wsEmp.getRow(1).fill = headerFill;
      wsEmp.getRow(1).font = headerFont;

      const whereEmp: any = {};
      if (filtros?.emprendimientoId) whereEmp.id = filtros.emprendimientoId;
      const emps = await prisma.emprendimiento.findMany({ where: whereEmp, orderBy: { codigo: 'asc' } });
      for (const e of emps) {
        wsEmp.addRow({
          codigo: e.codigo,
          nombre: e.nombre,
          responsable: e.responsable,
          telefono: e.telefono || '',
          email: e.mail || '',
          rubro: e.rubro || '',
          direccion: e.direccion || '',
          retencion: `${e.porcentajeRetencion}%`,
          estado: e.activo ? 'Activo' : 'Inactivo',
        });
      }
    }

    // 6. HOJA PRODUCTOS
    if (tipo === 'TODO' || tipo === 'PRODUCTOS') {
      const wsProd = workbook.addWorksheet('Productos');
      wsProd.columns = [
        { header: 'Código', key: 'codigo', width: 14 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Emprendimiento', key: 'emprendimiento', width: 26 },
        { header: 'Precio ($)', key: 'precio', width: 16 },
        { header: 'Stock Actual', key: 'stock', width: 14 },
        { header: 'Stock Mínimo Alerta', key: 'stockMin', width: 18 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];

      wsProd.getRow(1).fill = headerFill;
      wsProd.getRow(1).font = headerFont;

      const prods = await productService.getAll({
        emprendimientoId: filtros?.emprendimientoId,
        soloActivos: false,
      });

      for (const p of prods) {
        wsProd.addRow({
          codigo: p.codigo,
          nombre: p.nombre,
          emprendimiento: p.emprendimiento?.nombre || '',
          precio: p.precio,
          stock: p.stockCalculado ?? 0,
          stockMin: p.stockMinimoAlerta,
          estado: p.activo ? 'Activo' : 'Inactivo',
        });
      }
    }

    return workbook;
  },

  async generateJsonBackup(): Promise<string> {
    const [config, emprendimientos, productos, movimientos, ventas, retiros, logs] =
      await Promise.all([
        prisma.configuracion.findFirst(),
        prisma.emprendimiento.findMany(),
        prisma.producto.findMany(),
        prisma.movimientoStock.findMany(),
        prisma.venta.findMany(),
        prisma.retiro.findMany(),
        prisma.auditoriaLog.findMany({ take: 500, orderBy: { fecha: 'desc' } }),
      ]);

    const backupData = {
      version: '1.0.0',
      fechaBackup: new Date().toISOString(),
      configuracion: config,
      emprendimientos,
      productos,
      movimientosStock: movimientos,
      ventas,
      retiros,
      auditoria: logs,
    };

    return JSON.stringify(backupData, null, 2);
  },

  async generateSyncJson(): Promise<{ filename: string; json: string }> {
    const [config, emprendimientos, productos, movimientos, ventas, retiros, sesionesCaja] =
      await Promise.all([
        prisma.configuracion.findFirst(),
        prisma.emprendimiento.findMany({ orderBy: { codigo: 'asc' } }),
        prisma.producto.findMany({ orderBy: { codigo: 'asc' } }),
        prisma.movimientoStock.findMany({ orderBy: { fecha: 'asc' } }),
        prisma.venta.findMany({ orderBy: { fecha: 'asc' } }),
        prisma.retiro.findMany({ orderBy: { fecha: 'asc' } }),
        prisma.sesionCaja.findMany({ orderBy: { fechaApertura: 'asc' } }),
      ]);

    const sourceId = config?.localCodigo || 'LOCAL_01';
    const sourceName = config?.localNombre || 'Tienda Creativa';
    const exportedAt = new Date().toISOString();
    const dateFormatted = exportedAt.split('T')[0];

    const dataPayload = {
      emprendimientos: emprendimientos.map((e) => ({
        id: e.id,
        codigo: e.codigo,
        nombre: e.nombre,
        responsable: e.responsable,
        telefono: e.telefono,
        direccion: e.direccion,
        alias: e.alias,
        cvu: e.cvu,
        mail: e.mail,
        rubro: e.rubro,
        porcentajeRetencion: e.porcentajeRetencion,
        activo: e.activo,
        fechaCreacion: e.fechaCreacion,
        fechaActualizacion: e.fechaActualizacion,
      })),
      productos: productos.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        emprendimientoId: p.emprendimientoId,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        activo: p.activo,
        stockMinimoAlerta: p.stockMinimoAlerta,
        fechaCreacion: p.fechaCreacion,
        fechaActualizacion: p.fechaActualizacion,
      })),
      movimientosStock: movimientos.map((m) => ({
        id: m.id,
        operacionUuid: m.operacionUuid,
        productoId: m.productoId,
        cantidad: m.cantidad,
        tipoMovimiento: m.tipoMovimiento,
        fecha: m.fecha,
        observaciones: m.observaciones,
        usuario: m.usuario,
        fechaCreacion: m.fechaCreacion,
      })),
      ventas: ventas.map((v) => ({
        id: v.id,
        identificadorUnico: v.identificadorUnico,
        fecha: v.fecha,
        hora: v.hora,
        turno: v.turno,
        productoId: v.productoId,
        emprendimientoId: v.emprendimientoId,
        cantidad: v.cantidad,
        precioUnitario: v.precioUnitario,
        descuento: v.descuento,
        total: v.total,
        metodoPago: v.metodoPago,
        tipoCliente: v.tipoCliente,
        localOrigen: v.localOrigen || sourceId,
        usuario: v.usuario,
        estado: v.estado,
        motivoAnulacion: v.motivoAnulacion,
        observaciones: v.observaciones,
        fechaCreacion: v.fechaCreacion,
      })),
      retiros: retiros.map((r) => ({
        id: r.id,
        identificadorUnico: r.identificadorUnico,
        emprendimientoId: r.emprendimientoId,
        fecha: r.fecha,
        monto: r.monto,
        observaciones: r.observaciones,
        usuario: r.usuario,
        estado: r.estado,
        motivoAnulacion: r.motivoAnulacion,
        localOrigen: r.localOrigen || sourceId,
        fechaCreacion: r.fechaCreacion,
      })),
      sesionesCaja: sesionesCaja.map((s) => ({
        id: s.id,
        identificadorUnico: s.identificadorUnico || `${s.localOrigen || sourceId}-CAJA-${s.id}`,
        localOrigen: s.localOrigen || sourceId,
        montoInicial: s.montoInicial,
        fechaApertura: s.fechaApertura,
        fechaCierre: s.fechaCierre,
        turno: s.turno,
        encargado1Id: s.encargado1Id,
        encargado2Id: s.encargado2Id,
        encargadosTexto: s.encargadosTexto,
        usuarioApertura: s.usuarioApertura,
        usuarioCierre: s.usuarioCierre,
        estado: s.estado,
        montoVentasEfectivo: s.montoVentasEfectivo,
        montoVentasTransferencia: s.montoVentasTransferencia,
        montoRetiros: s.montoRetiros,
        montoEsperadoEfectivo: s.montoEsperadoEfectivo,
        montoRealContado: s.montoRealContado,
        diferencia: s.diferencia,
        observaciones: s.observaciones,
        fechaCreacion: s.fechaCreacion,
      })),
    };

    const serializedData = JSON.stringify(dataPayload);
    const checksum = crypto.createHash('sha256').update(serializedData).digest('hex');

    const syncFileContent = {
      format_version: 1,
      source_id: sourceId,
      source_name: sourceName,
      exported_at: exportedAt,
      app_version: '1.0.0',
      checksum,
      summary: {
        total_emprendimientos: dataPayload.emprendimientos.length,
        total_productos: dataPayload.productos.length,
        total_movimientos_stock: dataPayload.movimientosStock.length,
        total_ventas: dataPayload.ventas.length,
        total_retiros: dataPayload.retiros.length,
        total_sesiones_caja: dataPayload.sesionesCaja.length,
      },
      data: dataPayload,
    };

    const cleanSourceId = sourceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `sincronizacion_${dateFormatted}_${cleanSourceId}.json`;

    return {
      filename,
      json: JSON.stringify(syncFileContent, null, 2),
    };
  },
};

