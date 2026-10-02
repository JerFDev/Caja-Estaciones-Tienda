import { prisma } from '../db';
import ExcelJS from 'exceljs';
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
  async previewImportExcel(buffer: Buffer): Promise<ImportPreviewResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const wsVentas = workbook.getWorksheet('Ventas');
    const wsRetiros = workbook.getWorksheet('Retiros');

    if (!wsVentas && !wsRetiros) {
      return {
        valido: false,
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

    // Pre-cargar identificadores existentes en la base de datos
    const ventasExistentes = new Set(
      (await prisma.venta.findMany({ select: { identificadorUnico: true } })).map(
        (v) => v.identificadorUnico
      )
    );
    const retirosExistentes = new Set(
      (await prisma.retiro.findMany({ select: { identificadorUnico: true } })).map(
        (r) => r.identificadorUnico
      )
    );

    // Pre-cargar mapas de productos y emprendimientos
    const productosMap = new Map<string, any>();
    const emprendimientosMap = new Map<string, any>();

    const allProductos = await prisma.producto.findMany({
      include: { emprendimiento: true },
    });
    allProductos.forEach((p) => productosMap.set(p.codigo.toUpperCase(), p));

    const allEmprendimientos = await prisma.emprendimiento.findMany();
    allEmprendimientos.forEach((e) => emprendimientosMap.set(e.codigo.toUpperCase(), e));

    // Procesar Hoja de Ventas
    if (wsVentas) {
      // Buscar la fila de cabecera
      let headerRowIdx = 1;
      let colMap: Record<string, number> = {};

      for (let r = 1; r <= 5; r++) {
        const row = wsVentas.getRow(r);
        const cellVals: string[] = [];
        row.eachCell((cell, colNum) => {
          const val = cell.value ? String(cell.value).toLowerCase() : '';
          cellVals.push(val);
          if (val.includes('id') && val.includes('nico')) colMap.idUnico = colNum;
          if (val.includes('fecha')) colMap.fecha = colNum;
          if (val.includes('hora')) colMap.hora = colNum;
          if (val.includes('turno')) colMap.turno = colNum;
          if (val.includes('código producto') || val.includes('codigo producto') || val.includes('artículo')) colMap.codProd = colNum;
          if (val.includes('código emprendimiento') || val.includes('codigo emprendimiento') || val.includes('cod empr')) colMap.codEmp = colNum;
          if (val.includes('cantidad')) colMap.cantidad = colNum;
          if (val.includes('precio')) colMap.precioUnitario = colNum;
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
        const idUnico = idCell ? String(idCell).trim() : `IMP-${Date.now()}-${r}`;

        if (ventasExistentes.has(idUnico)) {
          duplicadas++;
          continue;
        }

        const codProd = codProdCell ? String(codProdCell).trim().toUpperCase() : '';
        const productoObj = productosMap.get(codProd);
        if (!productoObj) {
          errores++;
          detallesErrores.push(`Fila ${r} [Ventas]: Producto con código "${codProd}" no existe en el sistema local.`);
          continue;
        }

        const fechaVal = colMap.fecha ? row.getCell(colMap.fecha).value : null;
        const fecha = extractCellDate(fechaVal);

        const cantidad = colMap.cantidad ? Math.max(1, Math.round(extractCellNumber(row.getCell(colMap.cantidad).value))) : 1;
        const precioUnitario = colMap.precioUnitario
          ? extractCellNumber(row.getCell(colMap.precioUnitario).value) || productoObj.precio
          : productoObj.precio;
        const total = colMap.total ? extractCellNumber(row.getCell(colMap.total).value) || cantidad * precioUnitario : cantidad * precioUnitario;

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
          total,
          metodoPago,
          tipoCliente,
          localOrigen,
          usuario: 'importador',
          estado: 'ACTIVO',
        });
      }
    }

    // Procesar Hoja de Retiros
    if (wsRetiros) {
      let headerRowIdx = 1;
      let colMap: Record<string, number> = {};

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
        const idUnico = idCell ? String(idCell).trim() : `RET-IMP-${Date.now()}-${r}`;

        if (retirosExistentes.has(idUnico)) {
          duplicadas++;
          continue;
        }

        const codEmp = codEmpCell ? String(codEmpCell).trim().toUpperCase() : '';
        const empObj = emprendimientosMap.get(codEmp);
        if (!empObj) {
          errores++;
          detallesErrores.push(`Fila ${r} [Retiros]: Emprendimiento con código "${codEmp}" no existe en el sistema local.`);
          continue;
        }

        const monto = extractCellNumber(montoCell);
        if (monto <= 0) {
          errores++;
          detallesErrores.push(`Fila ${r} [Retiros]: Monto inválido ($${monto}).`);
          continue;
        }

        const fechaVal = colMap.fecha ? row.getCell(colMap.fecha).value : null;
        const fecha = extractCellDate(fechaVal);

        const obs = colMap.obs ? String(row.getCell(colMap.obs).value || '') : '';

        retirosNuevos.push({
          identificadorUnico: idUnico,
          emprendimientoId: empObj.id,
          fecha,
          monto,
          observaciones: obs ? `[IMPORTADO] ${obs}` : '[IMPORTADO]',
          usuario: 'importador',
          localOrigen: 'LOCAL_EXTERNO',
          estado: 'ACTIVO',
        });
      }
    }

    const nuevas = ventasNuevas.length + retirosNuevos.length;

    return {
      valido: errores === 0 || nuevas > 0,
      mensaje: `${totalEncontradas} operaciones analizadas: ${nuevas} nuevas para incorporar, ${duplicadas} ya registradas, ${errores} con errores.`,
      resumen: {
        totalEncontradas,
        nuevas,
        duplicadas,
        errores,
      },
      detallesErrores: detallesErrores.slice(0, 15),
      datosNuevos: {
        ventas: ventasNuevas,
        retiros: retirosNuevos,
        movimientosStock: [],
        emprendimientosNuevos: [],
        productosNuevos: [],
      },
    };
  },

  async executeImport(
    datosNuevos: { ventas: any[]; retiros: any[] },
    nombreArchivo: string,
    usuario = 'administrador'
  ) {
    return prisma.$transaction(async (tx) => {
      let ventasInsertadas = 0;
      let retirosInsertados = 0;

      if (datosNuevos.ventas && datosNuevos.ventas.length > 0) {
        for (const v of datosNuevos.ventas) {
          // Double check by unique ID
          const exists = await tx.venta.findUnique({
            where: { identificadorUnico: v.identificadorUnico },
          });
          if (!exists) {
            await tx.venta.create({ data: v });
            ventasInsertadas++;
          }
        }
      }

      if (datosNuevos.retiros && datosNuevos.retiros.length > 0) {
        for (const r of datosNuevos.retiros) {
          const exists = await tx.retiro.findUnique({
            where: { identificadorUnico: r.identificadorUnico },
          });
          if (!exists) {
            await tx.retiro.create({ data: r });
            retirosInsertados++;
          }
        }
      }

      const totalNuevas = ventasInsertadas + retirosInsertados;

      await tx.historialImportacion.create({
        data: {
          nombreArchivo,
          totalFilas: totalNuevas,
          filasNuevas: totalNuevas,
          filasDuplicadas: 0,
          filasErrores: 0,
          usuario,
          detallesJson: JSON.stringify({
            ventasInsertadas,
            retirosInsertados,
          }),
        },
      });

      await tx.auditoriaLog.create({
        data: {
          entidad: 'IMPORTACION',
          entidadId: nombreArchivo,
          accion: 'IMPORTACION',
          usuario,
          detallesJson: JSON.stringify({
            archivo: nombreArchivo,
            ventasInsertadas,
            retirosInsertados,
          }),
        },
      });

      return {
        ventasInsertadas,
        retirosInsertados,
        totalConsolidadas: totalNuevas,
      };
    });
  },
};
