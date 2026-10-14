import { prisma } from '../db';
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import { ImportPreviewResult } from '../../src/types';

function extractCellNumber(cellVal: any): number {
  if (cellVal === null || cellVal === undefined) return 0;
  if (typeof cellVal === 'number') return isNaN(cellVal) ? 0 : cellVal;
  if (typeof cellVal === 'object') {
    if (cellVal.result !== undefined && typeof cellVal.result === 'number') return cellVal.result;
    if (cellVal.richText && Array.isArray(cellVal.richText)) {
      return extractCellNumber(cellVal.richText.map((t: any) => t.text).join(''));
    }
  }
  const str = String(cellVal).trim();
  const clean = str.replace(/[$\s]/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  } else if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
}

function extractCellDate(cellVal: any): Date {
  if (!cellVal) return new Date();
  if (cellVal instanceof Date) return isNaN(cellVal.getTime()) ? new Date() : cellVal;
  if (typeof cellVal === 'object' && cellVal.result instanceof Date) return cellVal.result;
  const str = String(cellVal).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

export const importService = {
  /**
   * Punto de entrada principal para previsualizar cualquier archivo de importación (JSON o Excel)
   */
  async previewFile(buffer: Buffer, originalFilename = 'archivo'): Promise<ImportPreviewResult> {
    const archivoHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Comprobar si este hash exacto ya fue importado
    const importacionPrevia = await prisma.historialImportacion.findFirst({
      where: { archivoHash },
      orderBy: { fecha: 'desc' },
    });

    const isJson =
      originalFilename.toLowerCase().endsWith('.json') ||
      buffer.toString('utf8', 0, Math.min(buffer.length, 20)).trim().startsWith('{');

    if (isJson) {
      return this.previewSyncJson(buffer, originalFilename, archivoHash, importacionPrevia);
    } else {
      return this.previewImportExcel(buffer, originalFilename, archivoHash, importacionPrevia);
    }
  },

  /**
   * Previsualización y validación estricta de archivo JSON de sincronización multi-local
   */
  async previewSyncJson(
    buffer: Buffer,
    originalFilename: string,
    archivoHash: string,
    importacionPrevia: any
  ): Promise<ImportPreviewResult> {
    const errores: string[] = [];
    const conflictos: string[] = [];

    let parsed: any;
    try {
      const text = buffer.toString('utf8');
      parsed = JSON.parse(text);
    } catch (e: any) {
      return {
        valido: false,
        tipoArchivo: 'JSON_SYNC',
        nombreArchivo: originalFilename,
        archivoHash,
        yaImportado: Boolean(importacionPrevia),
        mensaje: 'El archivo está dañado o no posee un formato JSON válido.',
        resumen: { totalEncontradas: 0, nuevas: 0, duplicadas: 0, errores: 1 },
        detallesErrores: [`Error de sintaxis JSON: ${e.message}`],
      };
    }

    // 1. Validar versión del formato
    if (!parsed || typeof parsed !== 'object') {
      return {
        valido: false,
        tipoArchivo: 'JSON_SYNC',
        nombreArchivo: originalFilename,
        archivoHash,
        yaImportado: Boolean(importacionPrevia),
        mensaje: 'Estructura de archivo inválida. Se esperaba un objeto JSON.',
        resumen: { totalEncontradas: 0, nuevas: 0, duplicadas: 0, errores: 1 },
        detallesErrores: ['El archivo no contiene un objeto JSON válido.'],
      };
    }

    if (parsed.format_version !== 1) {
      return {
        valido: false,
        tipoArchivo: 'JSON_SYNC',
        nombreArchivo: originalFilename,
        archivoHash,
        yaImportado: Boolean(importacionPrevia),
        mensaje: `Versión de formato no soportada (${parsed.format_version || 'desconocida'}). Se requiere formato versión 1.`,
        resumen: { totalEncontradas: 0, nuevas: 0, duplicadas: 0, errores: 1 },
        detallesErrores: [
          `El archivo indica format_version: ${parsed.format_version}. Esta versión de la aplicación soporta format_version: 1.`,
        ],
      };
    }

    const sourceId = parsed.source_id || 'LOCAL_EXTERNO';
    const sourceName = parsed.source_name || '';
    const exportedAt = parsed.exported_at || '';
    const payload = parsed.data;

    if (!payload || typeof payload !== 'object') {
      return {
        valido: false,
        tipoArchivo: 'JSON_SYNC',
        nombreArchivo: originalFilename,
        archivoHash,
        yaImportado: Boolean(importacionPrevia),
        mensaje: 'El archivo no contiene el bloque "data" con la información a sincronizar.',
        resumen: { totalEncontradas: 0, nuevas: 0, duplicadas: 0, errores: 1 },
        detallesErrores: ['Falta la clave "data" con los registros de la exportación.'],
      };
    }

    // 2. Pre-cargar datos existentes de MySQL en memoria para comparación rápida y sin bloqueo
    const [
      existingVentasList,
      existingMovimientosList,
      existingRetirosList,
      existingSesionesList,
      allEmprendimientos,
      allProductos,
    ] = await Promise.all([
      prisma.venta.findMany({ select: { identificadorUnico: true } }),
      prisma.movimientoStock.findMany({ select: { operacionUuid: true } }),
      prisma.retiro.findMany({ select: { identificadorUnico: true } }),
      prisma.sesionCaja.findMany({ select: { id: true, identificadorUnico: true } }),
      prisma.emprendimiento.findMany(),
      prisma.producto.findMany({ include: { emprendimiento: true } }),
    ]);

    const existingVentas = new Set(existingVentasList.map((v) => v.identificadorUnico));
    const existingMovimientos = new Set(existingMovimientosList.map((m) => m.operacionUuid));
    const existingRetiros = new Set(existingRetirosList.map((r) => r.identificadorUnico));
    const existingSesiones = new Set(
      existingSesionesList
        .map((s) => s.identificadorUnico || s.id)
        .concat(existingSesionesList.map((s) => s.id))
    );

    const empById = new Map<string, any>();
    const empByCode = new Map<string, any>();
    allEmprendimientos.forEach((e) => {
      empById.set(e.id, e);
      empByCode.set(e.codigo.toUpperCase(), e);
    });

    const prodById = new Map<string, any>();
    const prodByCode = new Map<string, any>();
    allProductos.forEach((p) => {
      prodById.set(p.id, p);
      prodByCode.set(p.codigo.toUpperCase(), p);
    });

    // 3. Procesar Emprendimientos Maestros
    const incomingEmps = Array.isArray(payload.emprendimientos) ? payload.emprendimientos : [];
    const emprendimientosNuevos: any[] = [];
    const emprendimientosActualizados: any[] = [];
    let emprendimientosExistentes = 0;

    for (const e of incomingEmps) {
      if (!e.codigo || !e.nombre || !e.responsable) {
        errores.push(`Emprendimiento inválido en archivo: faltan campos obligatorios (${JSON.stringify(e)}).`);
        continue;
      }
      const existing = empByCode.get(e.codigo.toUpperCase()) || (e.id ? empById.get(e.id) : null);
      if (!existing) {
        emprendimientosNuevos.push(e);
        // Permitir que productos posteriores lo referencien
        empById.set(e.id, e);
        empByCode.set(e.codigo.toUpperCase(), e);
      } else {
        emprendimientosExistentes++;
        // Verificar si hay campos modificados
        const hasDiff =
          existing.nombre !== e.nombre ||
          existing.responsable !== e.responsable ||
          existing.porcentajeRetencion !== e.porcentajeRetencion ||
          (e.alias && existing.alias !== e.alias) ||
          (e.telefono && existing.telefono !== e.telefono);

        if (hasDiff) {
          emprendimientosActualizados.push({
            id: existing.id,
            original: existing,
            nuevo: e,
          });
        }
      }
    }

    // 4. Procesar Productos Maestros
    const incomingProds = Array.isArray(payload.productos) ? payload.productos : [];
    const productosNuevos: any[] = [];
    const productosActualizados: any[] = [];
    let productosExistentes = 0;

    for (const p of incomingProds) {
      if (!p.codigo || !p.nombre || p.precio === undefined) {
        errores.push(`Producto inválido en archivo: faltan campos código, nombre o precio.`);
        continue;
      }
      const existing = prodByCode.get(p.codigo.toUpperCase()) || (p.id ? prodById.get(p.id) : null);
      if (!existing) {
        // Verificar que el emprendimiento exista (en BD o en payload)
        const parentEmp = empById.get(p.emprendimientoId) || empByCode.get(p.emprendimientoCodigo?.toUpperCase());
        if (!parentEmp) {
          errores.push(`Producto [${p.codigo}] refiere a un emprendimiento que no existe ni está en el archivo.`);
          continue;
        }
        productosNuevos.push({
          ...p,
          emprendimientoId: parentEmp.id,
        });
        prodById.set(p.id, p);
        prodByCode.set(p.codigo.toUpperCase(), p);
      } else {
        productosExistentes++;
        if (existing.precio !== p.precio) {
          conflictos.push(
            `Producto [${p.codigo}] "${p.nombre}": Precio en archivo ($${p.precio}) difiere del catálogo local ($${existing.precio}). (Las ventas pasadas conservan su precio histórico).`
          );
        }
        if (existing.nombre !== p.nombre || existing.precio !== p.precio || existing.activo !== p.activo) {
          productosActualizados.push({
            id: existing.id,
            original: existing,
            nuevo: p,
          });
        }
      }
    }

    // 5. Procesar Movimientos de Stock (Transaccionales / Eventos inmutables)
    const incomingMovs = Array.isArray(payload.movimientosStock) ? payload.movimientosStock : [];
    const movimientosNuevos: any[] = [];
    let movimientosDuplicados = 0;

    for (const m of incomingMovs) {
      const opUuid = m.operacionUuid || m.id;
      if (!opUuid) {
        errores.push(`Movimiento de stock sin UUID de operación.`);
        continue;
      }
      if (existingMovimientos.has(opUuid)) {
        movimientosDuplicados++;
        continue;
      }
      // Verificar producto
      const prod = prodById.get(m.productoId) || prodByCode.get(m.productoCodigo?.toUpperCase());
      if (!prod) {
        errores.push(`Movimiento de stock con UUID ${opUuid} refiere a producto inexistente.`);
        continue;
      }
      movimientosNuevos.push({
        operacionUuid: opUuid,
        productoId: prod.id,
        cantidad: Number(m.cantidad) || 0,
        tipoMovimiento: m.tipoMovimiento || 'INGRESO',
        fecha: m.fecha ? new Date(m.fecha) : new Date(),
        observaciones: m.observaciones || null,
        usuario: m.usuario || 'sincronizador',
      });
    }

    // 6. Procesar Ventas (Transaccionales / Cero Duplicados)
    const incomingVentas = Array.isArray(payload.ventas) ? payload.ventas : [];
    const ventasNuevas: any[] = [];
    let ventasDuplicadas = 0;

    for (const v of incomingVentas) {
      if (!v.identificadorUnico) {
        errores.push(`Venta sin identificador único en el archivo.`);
        continue;
      }
      if (existingVentas.has(v.identificadorUnico)) {
        ventasDuplicadas++;
        continue;
      }
      // Resolver producto y emprendimiento
      const prod = prodById.get(v.productoId) || prodByCode.get(v.productoCodigo?.toUpperCase());
      if (!prod) {
        errores.push(`Venta ${v.identificadorUnico}: producto asociado no existe.`);
        continue;
      }
      const emp = empById.get(v.emprendimientoId) || empByCode.get(v.emprendimientoCodigo?.toUpperCase()) || prod.emprendimiento;
      if (!emp) {
        errores.push(`Venta ${v.identificadorUnico}: emprendimiento asociado no existe.`);
        continue;
      }

      ventasNuevas.push({
        identificadorUnico: v.identificadorUnico,
        fecha: v.fecha ? new Date(v.fecha) : new Date(),
        hora: v.hora || '12:00:00',
        turno: v.turno || 'MANANA',
        productoId: prod.id,
        emprendimientoId: emp.id,
        cantidad: Number(v.cantidad) || 1,
        precioUnitario: Number(v.precioUnitario) || prod.precio,
        descuento: Number(v.descuento) || 0,
        total: Number(v.total) || (Number(v.cantidad) || 1) * (Number(v.precioUnitario) || prod.precio),
        metodoPago: v.metodoPago || 'EFECTIVO',
        tipoCliente: v.tipoCliente || 'RESIDENTE',
        localOrigen: v.localOrigen || sourceId,
        usuario: v.usuario || 'sincronizador',
        estado: v.estado || 'ACTIVO',
        motivoAnulacion: v.motivoAnulacion || null,
        observaciones: v.observaciones || null,
      });
    }

    // 7. Procesar Retiros (Transaccionales / Cero Duplicados)
    const incomingRetiros = Array.isArray(payload.retiros) ? payload.retiros : [];
    const retirosNuevos: any[] = [];
    let retirosDuplicados = 0;

    for (const r of incomingRetiros) {
      if (!r.identificadorUnico) {
        errores.push(`Retiro sin identificador único en el archivo.`);
        continue;
      }
      if (existingRetiros.has(r.identificadorUnico)) {
        retirosDuplicados++;
        continue;
      }
      const emp = empById.get(r.emprendimientoId) || empByCode.get(r.emprendimientoCodigo?.toUpperCase());
      if (!emp) {
        errores.push(`Retiro ${r.identificadorUnico}: emprendimiento no encontrado.`);
        continue;
      }
      retirosNuevos.push({
        identificadorUnico: r.identificadorUnico,
        emprendimientoId: emp.id,
        fecha: r.fecha ? new Date(r.fecha) : new Date(),
        monto: Number(r.monto) || 0,
        observaciones: r.observaciones || null,
        usuario: r.usuario || 'sincronizador',
        estado: r.estado || 'ACTIVO',
        motivoAnulacion: r.motivoAnulacion || null,
        localOrigen: r.localOrigen || sourceId,
      });
    }

    // 8. Procesar Sesiones de Caja (Transaccionales)
    const incomingSesiones = Array.isArray(payload.sesionesCaja) ? payload.sesionesCaja : [];
    const sesionesNuevas: any[] = [];
    let sesionesDuplicadas = 0;

    for (const s of incomingSesiones) {
      const sId = s.identificadorUnico || s.id;
      if (!sId) continue;
      if (existingSesiones.has(sId) || (s.id && existingSesiones.has(s.id))) {
        sesionesDuplicadas++;
        continue;
      }
      sesionesNuevas.push({
        id: s.id || undefined,
        identificadorUnico: sId,
        localOrigen: s.localOrigen || sourceId,
        montoInicial: Number(s.montoInicial) || 0,
        fechaApertura: s.fechaApertura ? new Date(s.fechaApertura) : new Date(),
        fechaCierre: s.fechaCierre ? new Date(s.fechaCierre) : null,
        turno: s.turno || 'MANANA',
        encargado1Id: s.encargado1Id || null,
        encargado2Id: s.encargado2Id || null,
        encargadosTexto: s.encargadosTexto || null,
        usuarioApertura: s.usuarioApertura || 'cajero',
        usuarioCierre: s.usuarioCierre || null,
        estado: s.estado || 'CERRADA',
        montoVentasEfectivo: s.montoVentasEfectivo !== undefined ? Number(s.montoVentasEfectivo) : null,
        montoVentasTransferencia: s.montoVentasTransferencia !== undefined ? Number(s.montoVentasTransferencia) : null,
        montoRetiros: s.montoRetiros !== undefined ? Number(s.montoRetiros) : null,
        montoEsperadoEfectivo: s.montoEsperadoEfectivo !== undefined ? Number(s.montoEsperadoEfectivo) : null,
        montoRealContado: s.montoRealContado !== undefined ? Number(s.montoRealContado) : null,
        diferencia: s.diferencia !== undefined ? Number(s.diferencia) : null,
        observaciones: s.observaciones || null,
      });
    }

    const totalEncontradas =
      incomingVentas.length +
      incomingMovs.length +
      incomingRetiros.length +
      incomingSesiones.length +
      incomingProds.length +
      incomingEmps.length;

    const totalNuevas =
      ventasNuevas.length +
      movimientosNuevos.length +
      retirosNuevos.length +
      sesionesNuevas.length +
      productosNuevos.length +
      emprendimientosNuevos.length;

    const totalDuplicadas =
      ventasDuplicadas + movimientosDuplicados + retirosDuplicados + sesionesDuplicadas;

    return {
      valido: errores.length === 0,
      tipoArchivo: 'JSON_SYNC',
      nombreArchivo: originalFilename,
      archivoHash,
      yaImportado: Boolean(importacionPrevia),
      importacionPreviaInfo: importacionPrevia
        ? {
            fecha: importacionPrevia.fecha,
            nombreArchivo: importacionPrevia.nombreArchivo,
            sourceId: importacionPrevia.sourceId,
          }
        : null,
      sourceId,
      sourceName,
      exportedAt,
      mensaje:
        errores.length === 0
          ? `${totalEncontradas} registros analizados desde [${sourceId}]: ${totalNuevas} nuevos para incorporar, ${totalDuplicadas} ya existentes (se omiten sin duplicar).`
          : `Se detectaron ${errores.length} inconsistencias que impiden una importación limpia.`,
      resumen: {
        totalEncontradas,
        nuevas: totalNuevas,
        duplicadas: totalDuplicadas,
        errores: errores.length,
        emprendimientosNuevos: emprendimientosNuevos.length,
        emprendimientosActualizados: emprendimientosActualizados.length,
        productosNuevos: productosNuevos.length,
        productosActualizados: productosActualizados.length,
        productosConflictos: conflictos.length,
        ventasNuevas: ventasNuevas.length,
        ventasDuplicadas,
        movimientosNuevos: movimientosNuevos.length,
        movimientosDuplicados,
        retirosNuevos: retirosNuevos.length,
        retirosDuplicados,
        sesionesNuevas: sesionesNuevas.length,
        sesionesDuplicadas,
      },
      detallesErrores: errores.slice(0, 20),
      detallesConflictos: conflictos.slice(0, 20),
      datosNuevos: {
        emprendimientos: emprendimientosNuevos,
        emprendimientosActualizar: emprendimientosActualizados,
        productos: productosNuevos,
        productosActualizar: productosActualizados,
        movimientosStock: movimientosNuevos,
        ventas: ventasNuevas,
        retiros: retirosNuevos,
        sesionesCaja: sesionesNuevas,
        archivoHash,
        sourceId,
      },
    };
  },

  /**
   * Previsualización de planilla Excel (.xlsx) con cálculo de hash y detección de duplicados determinista
   */
  async previewImportExcel(
    buffer: Buffer,
    originalFilename = 'archivo.xlsx',
    archivoHash?: string,
    importacionPrevia?: any
  ): Promise<ImportPreviewResult> {
    const hash = archivoHash || crypto.createHash('sha256').update(buffer).digest('hex');
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (e: any) {
      return {
        valido: false,
        tipoArchivo: 'EXCEL',
        nombreArchivo: originalFilename,
        archivoHash,
        yaImportado: Boolean(importacionPrevia),
        mensaje: 'El archivo Excel está dañado o no es un formato XLSX válido.',
        resumen: { totalEncontradas: 0, nuevas: 0, duplicadas: 0, errores: 1 },
        detallesErrores: [e.message],
      };
    }

    const wsVentas = workbook.getWorksheet('Ventas');
    const wsRetiros = workbook.getWorksheet('Retiros');

    if (!wsVentas && !wsRetiros) {
      return {
        valido: false,
        tipoArchivo: 'EXCEL',
        nombreArchivo: originalFilename,
        archivoHash: hash,
        yaImportado: Boolean(importacionPrevia),
        mensaje: 'El archivo Excel no contiene una hoja "Ventas" ni "Retiros" válida.',
        resumen: { totalEncontradas: 0, nuevas: 0, duplicadas: 0, errores: 1 },
        detallesErrores: ['No se encontraron hojas con formato compatible (se espera hoja "Ventas" o "Retiros").'],
      };
    }

    const detallesErrores: string[] = [];
    let totalEncontradas = 0;
    let duplicadas = 0;
    let errores = 0;

    const ventasNuevas: any[] = [];
    const retirosNuevos: any[] = [];

    const ventasExistentes = new Set(
      (await prisma.venta.findMany({ select: { identificadorUnico: true } })).map((v) => v.identificadorUnico)
    );
    const retirosExistentes = new Set(
      (await prisma.retiro.findMany({ select: { identificadorUnico: true } })).map((r) => r.identificadorUnico)
    );

    const productosMap = new Map<string, any>();
    const emprendimientosMap = new Map<string, any>();

    const allProductos = await prisma.producto.findMany({ include: { emprendimiento: true } });
    allProductos.forEach((p) => productosMap.set(p.codigo.toUpperCase(), p));

    const allEmprendimientos = await prisma.emprendimiento.findMany();
    allEmprendimientos.forEach((e) => emprendimientosMap.set(e.codigo.toUpperCase(), e));

    // Procesar Hoja de Ventas
    if (wsVentas) {
      let headerRowIdx = 1;
      const colMap: Record<string, number> = {};

      for (let r = 1; r <= 5; r++) {
        const row = wsVentas.getRow(r);
        row.eachCell((cell, colNum) => {
          const val = cell.value ? String(cell.value).toLowerCase() : '';
          if (val.includes('id') && val.includes('nico')) colMap.idUnico = colNum;
          if (val.includes('fecha')) colMap.fecha = colNum;
          if (val.includes('hora')) colMap.hora = colNum;
          if (val.includes('turno')) colMap.turno = colNum;
          if (val.includes('código producto') || val.includes('codigo producto') || val.includes('artículo')) colMap.codProd = colNum;
          if (val.includes('código emprendimiento') || val.includes('codigo emprendimiento') || val.includes('cod empr')) colMap.codEmp = colNum;
          if (val.includes('cantidad')) colMap.cantidad = colNum;
          if (val.includes('precio')) colMap.precioUnitario = colNum;
          if (val.includes('descuento')) colMap.descuento = colNum;
          if (val.includes('total')) colMap.total = colNum;
          if (val.includes('pago')) colMap.metodoPago = colNum;
          if (val.includes('cliente')) colMap.tipoCliente = colNum;
          if (val.includes('local')) colMap.local = colNum;
        });

        if (colMap.idUnico || (colMap.fecha && colMap.codProd)) {
          headerRowIdx = r;
          break;
        }
      }

      const totalRows = wsVentas.rowCount;
      for (let r = headerRowIdx + 1; r <= totalRows; r++) {
        const row = wsVentas.getRow(r);
        const idCell = colMap.idUnico ? row.getCell(colMap.idUnico).value : null;
        const codProdCell = colMap.codProd ? row.getCell(colMap.codProd).value : null;

        if (!idCell && !codProdCell) continue;

        totalEncontradas++;
        const codProd = codProdCell ? String(codProdCell).trim().toUpperCase() : '';
        const fechaVal = colMap.fecha ? row.getCell(colMap.fecha).value : null;
        const fecha = extractCellDate(fechaVal);
        const fechaStr = fecha.toISOString().split('T')[0];

        // Si la celda no tiene ID único, generamos un identificador determinista basado en el contenido
        // para garantizar que si se importa dos veces la misma planilla, NO se duplique.
        const idUnico = idCell
          ? String(idCell).trim()
          : `EXCEL-${fechaStr}-${codProd}-${r}`;

        if (ventasExistentes.has(idUnico)) {
          duplicadas++;
          continue;
        }

        const productoObj = productosMap.get(codProd);
        if (!productoObj) {
          errores++;
          detallesErrores.push(`Fila ${r} [Ventas]: Producto con código "${codProd}" no existe en el catálogo.`);
          continue;
        }

        const cantidad = colMap.cantidad ? Math.max(1, Math.round(extractCellNumber(row.getCell(colMap.cantidad).value))) : 1;
        const precioUnitario = colMap.precioUnitario
          ? extractCellNumber(row.getCell(colMap.precioUnitario).value) || productoObj.precio
          : productoObj.precio;
        const descuento = colMap.descuento ? extractCellNumber(row.getCell(colMap.descuento).value) : 0;
        const total = colMap.total ? extractCellNumber(row.getCell(colMap.total).value) || cantidad * precioUnitario - descuento : cantidad * precioUnitario - descuento;

        const pagoRaw = colMap.metodoPago ? String(row.getCell(colMap.metodoPago).value || '').toUpperCase() : '';
        const metodoPago = pagoRaw.includes('TRANS') || pagoRaw === 'T' ? 'TRANSFERENCIA' : 'EFECTIVO';

        const clienteRaw = colMap.tipoCliente ? String(row.getCell(colMap.tipoCliente).value || '').toUpperCase() : '';
        const tipoCliente = clienteRaw.includes('TUR') ? 'TURISTA' : 'RESIDENTE';

        const turnoRaw = colMap.turno ? String(row.getCell(colMap.turno).value || '').toUpperCase() : '';
        const turno = turnoRaw.includes('T') ? 'TARDE' : 'MANANA';

        const localOrigen = colMap.local ? String(row.getCell(colMap.local).value || 'LOCAL_EXTERNO') : 'LOCAL_EXTERNO';
        const hora = colMap.hora ? String(row.getCell(colMap.hora).value || '12:00:00') : '12:00:00';

        ventasNuevas.push({
          identificadorUnico: idUnico,
          fecha,
          hora,
          turno,
          productoId: productoObj.id,
          emprendimientoId: productoObj.emprendimientoId,
          cantidad,
          precioUnitario,
          descuento,
          total,
          metodoPago,
          tipoCliente,
          localOrigen,
          usuario: 'importador_excel',
          estado: 'ACTIVO',
        });
      }
    }

    // Procesar Hoja de Retiros
    if (wsRetiros) {
      let headerRowIdx = 1;
      const colMap: Record<string, number> = {};

      for (let r = 1; r <= 5; r++) {
        const row = wsRetiros.getRow(r);
        row.eachCell((cell, colNum) => {
          const val = cell.value ? String(cell.value).toLowerCase() : '';
          if (val.includes('id') && val.includes('nico')) colMap.idUnico = colNum;
          if (val.includes('fecha')) colMap.fecha = colNum;
          if (val.includes('código') || val.includes('codigo') || val.includes('cod')) colMap.codEmp = colNum;
          if (val.includes('monto')) colMap.monto = colNum;
          if (val.includes('obs')) colMap.obs = colNum;
        });
        if (colMap.idUnico || (colMap.codEmp && colMap.monto)) {
          headerRowIdx = r;
          break;
        }
      }

      for (let r = headerRowIdx + 1; r <= wsRetiros.rowCount; r++) {
        const row = wsRetiros.getRow(r);
        const idCell = colMap.idUnico ? row.getCell(colMap.idUnico).value : null;
        const codEmpCell = colMap.codEmp ? row.getCell(colMap.codEmp).value : null;
        const montoCell = colMap.monto ? row.getCell(colMap.monto).value : null;

        if (!idCell && !codEmpCell) continue;

        totalEncontradas++;
        const codEmp = codEmpCell ? String(codEmpCell).trim().toUpperCase() : '';
        const fechaVal = colMap.fecha ? row.getCell(colMap.fecha).value : null;
        const fecha = extractCellDate(fechaVal);
        const fechaStr = fecha.toISOString().split('T')[0];

        const idUnico = idCell
          ? String(idCell).trim()
          : `EXCEL-RET-${fechaStr}-${codEmp}-${r}`;

        if (retirosExistentes.has(idUnico)) {
          duplicadas++;
          continue;
        }

        const empObj = emprendimientosMap.get(codEmp);
        if (!empObj) {
          errores++;
          detallesErrores.push(`Fila ${r} [Retiros]: Emprendimiento con código "${codEmp}" no existe en el catálogo.`);
          continue;
        }

        const monto = extractCellNumber(montoCell);
        if (monto <= 0) {
          errores++;
          detallesErrores.push(`Fila ${r} [Retiros]: Monto inválido ($${monto}).`);
          continue;
        }

        const obs = colMap.obs ? String(row.getCell(colMap.obs).value || '') : '';

        retirosNuevos.push({
          identificadorUnico: idUnico,
          emprendimientoId: empObj.id,
          fecha,
          monto,
          observaciones: obs ? `[IMPORTADO EXCEL] ${obs}` : '[IMPORTADO EXCEL]',
          usuario: 'importador_excel',
          localOrigen: 'LOCAL_EXTERNO',
          estado: 'ACTIVO',
        });
      }
    }

    const nuevas = ventasNuevas.length + retirosNuevos.length;

    return {
      valido: errores === 0,
      tipoArchivo: 'EXCEL',
      nombreArchivo: originalFilename,
      archivoHash: hash,
      yaImportado: Boolean(importacionPrevia),
      importacionPreviaInfo: importacionPrevia
        ? {
            fecha: importacionPrevia.fecha,
            nombreArchivo: importacionPrevia.nombreArchivo,
            sourceId: importacionPrevia.sourceId,
          }
        : null,
      sourceId: 'EXCEL_EXTERNO',
      mensaje: `${totalEncontradas} filas analizadas en planilla: ${nuevas} nuevas para incorporar, ${duplicadas} ya registradas, ${errores} con errores.`,
      resumen: {
        totalEncontradas,
        nuevas,
        duplicadas,
        errores,
        ventasNuevas: ventasNuevas.length,
        ventasDuplicadas: duplicadas,
        retirosNuevos: retirosNuevos.length,
        retirosDuplicados: 0,
      },
      detallesErrores: detallesErrores.slice(0, 15),
      datosNuevos: {
        ventas: ventasNuevas,
        retiros: retirosNuevos,
        movimientosStock: [],
        sesionesCaja: [],
        emprendimientos: [],
        productos: [],
        archivoHash: hash,
        sourceId: 'EXCEL_EXTERNO',
      },
    };
  },

  /**
   * Ejecución atómica y segura de la consolidación de datos dentro de una transacción Prisma (ACID)
   */
  async executeSyncImport(
    datosNuevos: any,
    options: {
      nombreArchivo: string;
      archivoHash?: string;
      sourceId?: string;
      usuario?: string;
    }
  ) {
    const { nombreArchivo, archivoHash, sourceId, usuario = 'administrador' } = options;

    return prisma.$transaction(async (tx) => {
      let empsInsertados = 0;
      let empsActualizados = 0;
      let prodsInsertados = 0;
      let prodsActualizados = 0;
      let movsInsertados = 0;
      let ventasInsertadas = 0;
      let retirosInsertados = 0;
      let sesionesInsertadas = 0;

      // 1. Insertar Emprendimientos Nuevos
      if (datosNuevos.emprendimientos && datosNuevos.emprendimientos.length > 0) {
        for (const e of datosNuevos.emprendimientos) {
          const exists = await tx.emprendimiento.findFirst({
            where: { OR: [{ id: e.id }, { codigo: e.codigo }] },
          });
          if (!exists) {
            await tx.emprendimiento.create({
              data: {
                id: e.id || undefined,
                codigo: e.codigo.trim().toUpperCase(),
                nombre: e.nombre.trim(),
                responsable: e.responsable.trim(),
                telefono: e.telefono || null,
                direccion: e.direccion || null,
                alias: e.alias || null,
                cvu: e.cvu || null,
                mail: e.mail || null,
                rubro: e.rubro || null,
                porcentajeRetencion: Number(e.porcentajeRetencion) || 0,
                activo: e.activo !== false,
              },
            });
            empsInsertados++;
          }
        }
      }

      // 2. Actualizar Emprendimientos si corresponde
      if (datosNuevos.emprendimientosActualizar && datosNuevos.emprendimientosActualizar.length > 0) {
        for (const item of datosNuevos.emprendimientosActualizar) {
          const n = item.nuevo;
          await tx.emprendimiento.update({
            where: { id: item.id },
            data: {
              nombre: n.nombre?.trim(),
              responsable: n.responsable?.trim(),
              telefono: n.telefono || null,
              direccion: n.direccion || null,
              alias: n.alias || null,
              cvu: n.cvu || null,
              mail: n.mail || null,
              rubro: n.rubro || null,
              porcentajeRetencion: n.porcentajeRetencion !== undefined ? Number(n.porcentajeRetencion) : undefined,
            },
          });
          empsActualizados++;
        }
      }

      // 3. Insertar Productos Nuevos
      if (datosNuevos.productos && datosNuevos.productos.length > 0) {
        for (const p of datosNuevos.productos) {
          const exists = await tx.producto.findFirst({
            where: { OR: [{ id: p.id }, { codigo: p.codigo }] },
          });
          if (!exists) {
            await tx.producto.create({
              data: {
                id: p.id || undefined,
                codigo: p.codigo.trim().toUpperCase(),
                emprendimientoId: p.emprendimientoId,
                nombre: p.nombre.trim(),
                descripcion: p.descripcion || null,
                precio: Number(p.precio) || 0,
                activo: p.activo !== false,
                stockMinimoAlerta: Number(p.stockMinimoAlerta) || 2,
              },
            });
            prodsInsertados++;
          }
        }
      }

      // 4. Actualizar Productos si corresponde
      if (datosNuevos.productosActualizar && datosNuevos.productosActualizar.length > 0) {
        for (const item of datosNuevos.productosActualizar) {
          const n = item.nuevo;
          await tx.producto.update({
            where: { id: item.id },
            data: {
              nombre: n.nombre?.trim(),
              descripcion: n.descripcion || null,
              precio: n.precio !== undefined ? Number(n.precio) : undefined,
              activo: n.activo !== undefined ? Boolean(n.activo) : undefined,
            },
          });
          prodsActualizados++;
        }
      }

      // 5. Insertar Movimientos de Stock (Garantía Cero Duplicados por operacionUuid)
      if (datosNuevos.movimientosStock && datosNuevos.movimientosStock.length > 0) {
        for (const m of datosNuevos.movimientosStock) {
          const exists = await tx.movimientoStock.findUnique({
            where: { operacionUuid: m.operacionUuid },
          });
          if (!exists) {
            await tx.movimientoStock.create({
              data: {
                operacionUuid: m.operacionUuid,
                productoId: m.productoId,
                cantidad: m.cantidad,
                tipoMovimiento: m.tipoMovimiento,
                fecha: m.fecha ? new Date(m.fecha) : new Date(),
                observaciones: m.observaciones || null,
                usuario: m.usuario || usuario,
              },
            });
            movsInsertados++;
          }
        }
      }

      // 6. Insertar Ventas (Garantía Cero Duplicados por identificadorUnico)
      if (datosNuevos.ventas && datosNuevos.ventas.length > 0) {
        for (const v of datosNuevos.ventas) {
          const exists = await tx.venta.findUnique({
            where: { identificadorUnico: v.identificadorUnico },
          });
          if (!exists) {
            await tx.venta.create({
              data: {
                identificadorUnico: v.identificadorUnico,
                fecha: v.fecha ? new Date(v.fecha) : new Date(),
                hora: v.hora || '12:00:00',
                turno: v.turno || 'MANANA',
                productoId: v.productoId,
                emprendimientoId: v.emprendimientoId,
                cantidad: v.cantidad,
                precioUnitario: v.precioUnitario,
                descuento: v.descuento || 0,
                total: v.total,
                metodoPago: v.metodoPago,
                tipoCliente: v.tipoCliente,
                localOrigen: v.localOrigen || sourceId || 'LOCAL_EXTERNO',
                usuario: v.usuario || usuario,
                estado: v.estado || 'ACTIVO',
                motivoAnulacion: v.motivoAnulacion || null,
                observaciones: v.observaciones || null,
              },
            });
            ventasInsertadas++;
          }
        }
      }

      // 7. Insertar Retiros (Garantía Cero Duplicados por identificadorUnico)
      if (datosNuevos.retiros && datosNuevos.retiros.length > 0) {
        for (const r of datosNuevos.retiros) {
          const exists = await tx.retiro.findUnique({
            where: { identificadorUnico: r.identificadorUnico },
          });
          if (!exists) {
            await tx.retiro.create({
              data: {
                identificadorUnico: r.identificadorUnico,
                emprendimientoId: r.emprendimientoId,
                fecha: r.fecha ? new Date(r.fecha) : new Date(),
                monto: r.monto,
                observaciones: r.observaciones || null,
                usuario: r.usuario || usuario,
                estado: r.estado || 'ACTIVO',
                motivoAnulacion: r.motivoAnulacion || null,
                localOrigen: r.localOrigen || sourceId || 'LOCAL_EXTERNO',
              },
            });
            retirosInsertados++;
          }
        }
      }

      // 8. Insertar Sesiones de Caja (Garantía Cero Duplicados)
      if (datosNuevos.sesionesCaja && datosNuevos.sesionesCaja.length > 0) {
        for (const s of datosNuevos.sesionesCaja) {
          const sId = s.identificadorUnico || s.id;
          const exists = await tx.sesionCaja.findFirst({
            where: { OR: [{ identificadorUnico: sId }, { id: s.id }] },
          });
          if (!exists) {
            await tx.sesionCaja.create({
              data: {
                id: s.id || undefined,
                identificadorUnico: sId,
                localOrigen: s.localOrigen || sourceId || 'LOCAL_EXTERNO',
                montoInicial: s.montoInicial,
                fechaApertura: s.fechaApertura ? new Date(s.fechaApertura) : new Date(),
                fechaCierre: s.fechaCierre ? new Date(s.fechaCierre) : null,
                turno: s.turno || 'MANANA',
                encargado1Id: s.encargado1Id || null,
                encargado2Id: s.encargado2Id || null,
                encargadosTexto: s.encargadosTexto || null,
                usuarioApertura: s.usuarioApertura || 'cajero',
                usuarioCierre: s.usuarioCierre || null,
                estado: s.estado || 'CERRADA',
                montoVentasEfectivo: s.montoVentasEfectivo,
                montoVentasTransferencia: s.montoVentasTransferencia,
                montoRetiros: s.montoRetiros,
                montoEsperadoEfectivo: s.montoEsperadoEfectivo,
                montoRealContado: s.montoRealContado,
                diferencia: s.diferencia,
                observaciones: s.observaciones || null,
              },
            });
            sesionesInsertadas++;
          }
        }
      }

      const totalConsolidadas =
        ventasInsertadas +
        movsInsertados +
        retirosInsertados +
        sesionesInsertadas +
        prodsInsertados +
        empsInsertados;

      // 9. Registrar Historial de Importación
      await tx.historialImportacion.create({
        data: {
          nombreArchivo,
          archivoHash: archivoHash || null,
          sourceId: sourceId || 'LOCAL_EXTERNO',
          totalFilas: totalConsolidadas,
          filasNuevas: totalConsolidadas,
          filasDuplicadas: 0,
          filasErrores: 0,
          usuario,
          detallesJson: JSON.stringify({
            ventasInsertadas,
            movsInsertados,
            retirosInsertados,
            sesionesInsertadas,
            prodsInsertados,
            prodsActualizados,
            empsInsertados,
            empsActualizados,
          }),
        },
      });

      // 10. Registrar Auditoría
      await tx.auditoriaLog.create({
        data: {
          entidad: 'IMPORTACION',
          entidadId: nombreArchivo,
          accion: 'IMPORTACION',
          usuario,
          detallesJson: JSON.stringify({
            archivo: nombreArchivo,
            archivoHash,
            sourceId,
            totalConsolidadas,
            ventasInsertadas,
            movsInsertados,
            retirosInsertados,
          }),
        },
      });

      return {
        success: true,
        nombreArchivo,
        sourceId: sourceId || 'LOCAL_EXTERNO',
        ventasInsertadas,
        movimientosInsertados: movsInsertados,
        retirosInsertados,
        sesionesInsertadas,
        productosInsertados: prodsInsertados,
        productosActualizados: prodsActualizados,
        emprendimientosInsertados: empsInsertados,
        emprendimientosActualizados: empsActualizados,
        totalConsolidadas,
      };
    });
  },

  /**
   * Alias retrocompatible para ejecuciones previas de importación
   */
  async executeImport(
    datosNuevos: any,
    nombreArchivo = 'archivo_externo.xlsx',
    usuario = 'administrador'
  ) {
    return this.executeSyncImport(datosNuevos, { nombreArchivo, usuario });
  },
};
