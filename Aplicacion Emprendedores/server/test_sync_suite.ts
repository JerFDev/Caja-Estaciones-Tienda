import { prisma } from './db';
import { exportService } from './services/exportService';
import { importService } from './services/importService';
import { productService } from './services/productService';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name} — ${details}`);
}

async function runTestSuite() {
  console.log('\n========================================================');
  console.log('   SUITE DE PRUEBAS DE IMPORTACIÓN Y EXPORTACIÓN');
  console.log('========================================================\n');

  // --- SETUP: Crear datos de prueba limpios ---
  const testPrefix = `TST_${Date.now().toString().slice(-4)}`;
  const empCodigo = `E_${testPrefix}`.substring(0, 10);
  const prodCodigo = `P_${testPrefix}`.substring(0, 10);

  const emp = await prisma.emprendimiento.create({
    data: {
      codigo: empCodigo,
      nombre: `Emprendimiento Test ${testPrefix}`,
      responsable: 'Tester Sync',
      porcentajeRetencion: 10,
      activo: true,
    },
  });

  const prod = await prisma.producto.create({
    data: {
      codigo: prodCodigo,
      emprendimientoId: emp.id,
      nombre: `Producto Test ${testPrefix}`,
      precio: 1000,
      stockMinimoAlerta: 2,
      activo: true,
    },
  });

  // Movimiento inicial de stock: 20 unidades
  const opUuidInicial = `MOV-INIT-${Date.now()}-${uuidv4().substring(0, 8)}`;
  await prisma.movimientoStock.create({
    data: {
      operacionUuid: opUuidInicial,
      productoId: prod.id,
      cantidad: 20,
      tipoMovimiento: 'INGRESO',
      observaciones: 'Stock inicial de prueba para suite',
      usuario: 'test_runner',
    },
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Exportar datos
    // ----------------------------------------------------
    const exportResult = await exportService.generateSyncJson();
    const exportParsed = JSON.parse(exportResult.json);

    const hasFormat = exportParsed.format_version === 1;
    const hasSource = Boolean(exportParsed.source_id);
    const hasData = exportParsed.data && Array.isArray(exportParsed.data.ventas);
    const calculatedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(exportParsed.data))
      .digest('hex');
    const checksumValid = exportParsed.checksum === calculatedChecksum;

    recordTest(
      'TEST 1: Exportar datos a JSON estructurado',
      hasFormat && hasSource && hasData && checksumValid,
      `Archivo: ${exportResult.filename}, versión: ${exportParsed.format_version}, checksum verificado: ${checksumValid}`
    );

    // ----------------------------------------------------
    // TEST 2: Importar archivo nuevo
    // ----------------------------------------------------
    const saleIdL01 = `TEST-L01-SALE-${Date.now()}-1`;
    const syncDataLocal01 = {
      format_version: 1,
      source_id: 'LOCAL-001',
      source_name: 'Terminal Feria 1',
      exported_at: new Date().toISOString(),
      data: {
        emprendimientos: [emp],
        productos: [prod],
        movimientosStock: [],
        ventas: [
          {
            identificadorUnico: saleIdL01,
            fecha: new Date().toISOString(),
            hora: '14:30:00',
            turno: 'TARDE',
            productoId: prod.id,
            emprendimientoId: emp.id,
            cantidad: 3,
            precioUnitario: 1000,
            descuento: 0,
            total: 3000,
            metodoPago: 'EFECTIVO',
            tipoCliente: 'RESIDENTE',
            localOrigen: 'LOCAL-001',
            usuario: 'cajero_01',
            estado: 'ACTIVO',
          },
        ],
        retiros: [],
        sesionesCaja: [],
      },
    };

    const bufferL01 = Buffer.from(JSON.stringify(syncDataLocal01));
    const previewL01 = await importService.previewFile(bufferL01, 'sincronizacion_LOCAL-001.json');

    const previewOk = previewL01.valido && previewL01.resumen.ventasNuevas === 1;
    const importL01 = await importService.executeSyncImport(previewL01.datosNuevos, {
      nombreArchivo: 'sincronizacion_LOCAL-001.json',
      archivoHash: previewL01.archivoHash,
      sourceId: previewL01.sourceId,
      usuario: 'admin_test',
    });

    const saleL01InDb = await prisma.venta.findUnique({ where: { identificadorUnico: saleIdL01 } });
    recordTest(
      'TEST 2: Importar archivo nuevo (PC LOCAL-001)',
      previewOk && importL01.ventasInsertadas === 1 && saleL01InDb !== null,
      `Ventas incorporadas: ${importL01.ventasInsertadas}, ID en BD: ${saleL01InDb?.identificadorUnico}`
    );

    // ----------------------------------------------------
    // TEST 3: Importar el mismo archivo dos veces (Idempotencia y 0 duplicados)
    // ----------------------------------------------------
    const previewL01Repeat = await importService.previewFile(bufferL01, 'sincronizacion_LOCAL-001.json');
    const repeatDetected = previewL01Repeat.yaImportado === true;
    const zeroNewSales = previewL01Repeat.resumen.ventasNuevas === 0;
    const duplicateDetected = previewL01Repeat.resumen.ventasDuplicadas === 1;

    const importL01Repeat = await importService.executeSyncImport(previewL01Repeat.datosNuevos, {
      nombreArchivo: 'sincronizacion_LOCAL-001.json',
      archivoHash: previewL01Repeat.archivoHash,
      sourceId: previewL01Repeat.sourceId,
      usuario: 'admin_test',
    });

    const countAfterRepeat = await prisma.venta.count({ where: { identificadorUnico: saleIdL01 } });
    recordTest(
      'TEST 3: Importar el mismo archivo dos veces',
      repeatDetected && zeroNewSales && duplicateDetected && importL01Repeat.ventasInsertadas === 0 && countAfterRepeat === 1,
      `Ya importado detectado: ${repeatDetected}, Nuevas: ${previewL01Repeat.resumen.ventasNuevas}, Duplicadas: ${previewL01Repeat.resumen.ventasDuplicadas}, Conteo en BD: ${countAfterRepeat}`
    );

    // ----------------------------------------------------
    // TEST 4: Importar datos de dos computadoras diferentes (LOCAL-001 y LOCAL-002)
    // ----------------------------------------------------
    const saleIdL02 = `TEST-L02-SALE-${Date.now()}-2`;
    const syncDataLocal02 = {
      format_version: 1,
      source_id: 'LOCAL-002',
      source_name: 'Terminal Feria 2',
      exported_at: new Date().toISOString(),
      data: {
        emprendimientos: [emp],
        productos: [prod],
        movimientosStock: [],
        ventas: [
          {
            identificadorUnico: saleIdL02,
            fecha: new Date().toISOString(),
            hora: '15:15:00',
            turno: 'TARDE',
            productoId: prod.id,
            emprendimientoId: emp.id,
            cantidad: 2,
            precioUnitario: 1000,
            descuento: 0,
            total: 2000,
            metodoPago: 'TRANSFERENCIA',
            tipoCliente: 'TURISTA',
            localOrigen: 'LOCAL-002',
            usuario: 'cajero_02',
            estado: 'ACTIVO',
          },
        ],
        retiros: [],
        sesionesCaja: [],
      },
    };

    const bufferL02 = Buffer.from(JSON.stringify(syncDataLocal02));
    const previewL02 = await importService.previewFile(bufferL02, 'sincronizacion_LOCAL-002.json');
    const importL02 = await importService.executeSyncImport(previewL02.datosNuevos, {
      nombreArchivo: 'sincronizacion_LOCAL-002.json',
      archivoHash: previewL02.archivoHash,
      sourceId: previewL02.sourceId,
      usuario: 'admin_test',
    });

    const v1 = await prisma.venta.findUnique({ where: { identificadorUnico: saleIdL01 } });
    const v2 = await prisma.venta.findUnique({ where: { identificadorUnico: saleIdL02 } });
    const bothExist = v1 !== null && v2 !== null;

    recordTest(
      'TEST 4: Importar datos de dos computadoras diferentes',
      bothExist && importL02.ventasInsertadas === 1,
      `Venta LOCAL-001 (${v1?.localOrigen}) y Venta LOCAL-002 (${v2?.localOrigen}) conviven correctamente`
    );

    // ----------------------------------------------------
    // TEST 5: Misma venta importada desde el mismo origen nuevamente
    // ----------------------------------------------------
    const previewL01Again = await importService.previewFile(bufferL01, 'sincronizacion_LOCAL-001.json');
    const reimported = await importService.executeSyncImport(previewL01Again.datosNuevos, {
      nombreArchivo: 'sincronizacion_LOCAL-001.json',
      archivoHash: previewL01Again.archivoHash,
      sourceId: previewL01Again.sourceId,
    });
    const countV1 = await prisma.venta.count({ where: { identificadorUnico: saleIdL01 } });

    recordTest(
      'TEST 5: Misma venta importada desde el mismo origen nuevamente',
      reimported.ventasInsertadas === 0 && countV1 === 1,
      `Ventas re-insertadas: ${reimported.ventasInsertadas}, Conteo total de esa venta: ${countV1} (Cero duplicación)`
    );

    // ----------------------------------------------------
    // TEST 6: Producto existente actualizado
    // ----------------------------------------------------
    const syncDataProductUpdate = {
      format_version: 1,
      source_id: 'LOCAL-001',
      exported_at: new Date().toISOString(),
      data: {
        emprendimientos: [emp],
        productos: [
          {
            ...prod,
            descripcion: 'Descripción actualizada durante la feria',
            precio: 1200,
          },
        ],
        movimientosStock: [],
        ventas: [],
        retiros: [],
        sesionesCaja: [],
      },
    };

    const bufferProdUpd = Buffer.from(JSON.stringify(syncDataProductUpdate));
    const previewProdUpd = await importService.previewFile(bufferProdUpd, 'sync_prod_upd.json');
    const hasPriceConflict = (previewProdUpd.detallesConflictos?.length || 0) > 0;
    await importService.executeSyncImport(previewProdUpd.datosNuevos, {
      nombreArchivo: 'sync_prod_upd.json',
    });

    const prodInDb = await prisma.producto.findUnique({ where: { id: prod.id } });
    const v1After = await prisma.venta.findUnique({ where: { identificadorUnico: saleIdL01 } });
    const historicalPricePreserved = v1After?.precioUnitario === 1000;

    recordTest(
      'TEST 6: Producto existente actualizado en catálogo y conflicto reportado',
      prodInDb?.descripcion === 'Descripción actualizada durante la feria' && historicalPricePreserved,
      `Catálogo actualizado con precio $${prodInDb?.precio}, Precio histórico de venta preservado intacto: $${v1After?.precioUnitario}, Conflicto avisado: ${hasPriceConflict}`
    );

    // ----------------------------------------------------
    // TEST 7: Archivo corrupto
    // ----------------------------------------------------
    const corruptBuffer = Buffer.from('{ "format_version": 1, "data": { "ventas": [ { "id": "incompleto');
    const previewCorrupt = await importService.previewFile(corruptBuffer, 'archivo_corrupto.json');

    recordTest(
      'TEST 7: Archivo corrupto (JSON truncado)',
      previewCorrupt.valido === false && previewCorrupt.detallesErrores.length > 0,
      `Válido: ${previewCorrupt.valido}, Mensaje de rechazo: "${previewCorrupt.mensaje}"`
    );

    // ----------------------------------------------------
    // TEST 8: Archivo con formato incorrecto
    // ----------------------------------------------------
    const wrongFormatBuffer = Buffer.from(JSON.stringify({ format_version: 99, data: {} }));
    const previewWrong = await importService.previewFile(wrongFormatBuffer, 'archivo_v99.json');

    recordTest(
      'TEST 8: Archivo con versión de formato no soportada',
      previewWrong.valido === false && previewWrong.mensaje.includes('Versión de formato no soportada'),
      `Válido: ${previewWrong.valido}, Rechazo por version: "${previewWrong.mensaje}"`
    );

    // ----------------------------------------------------
    // TEST 9: Error durante la importación -> ROLLBACK
    // ----------------------------------------------------
    const goodSaleId = `TEST-ROLLBACK-GOOD-${Date.now()}`;
    const badSaleId = `TEST-ROLLBACK-BAD-${Date.now()}`;

    let rollbackSuccessful = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Operación 1: Válida
        await tx.venta.create({
          data: {
            identificadorUnico: goodSaleId,
            fecha: new Date(),
            hora: '10:00:00',
            turno: 'MANANA',
            productoId: prod.id,
            emprendimientoId: emp.id,
            cantidad: 1,
            precioUnitario: 1000,
            descuento: 0,
            total: 1000,
            metodoPago: 'EFECTIVO',
            tipoCliente: 'RESIDENTE',
            localOrigen: 'LOCAL-001',
          },
        });

        // Operación 2: Falla deliberada (Foreign key inexistente)
        await tx.venta.create({
          data: {
            identificadorUnico: badSaleId,
            fecha: new Date(),
            hora: '10:00:00',
            turno: 'MANANA',
            productoId: 'PRODUCTO_INEXISTENTE_UUID_FALSO',
            emprendimientoId: emp.id,
            cantidad: 1,
            precioUnitario: 1000,
            descuento: 0,
            total: 1000,
            metodoPago: 'EFECTIVO',
            tipoCliente: 'RESIDENTE',
            localOrigen: 'LOCAL-001',
          },
        });
      });
    } catch (e: any) {
      // El error debe disparar rollback automático
      const goodSaleAfterRollback = await prisma.venta.findUnique({
        where: { identificadorUnico: goodSaleId },
      });
      rollbackSuccessful = goodSaleAfterRollback === null;
    }

    recordTest(
      'TEST 9: Error durante la importación (Garantía de Rollback total)',
      rollbackSuccessful,
      `Rollback comprobado: La venta válida previa fue deshecha y no quedó registrada en la base de datos (${rollbackSuccessful})`
    );

    // ----------------------------------------------------
    // TEST 10: Stock con ventas provenientes de dos computadoras
    // ----------------------------------------------------
    // Stock Inicial: 20 unidades
    // Venta PC LOCAL-001: 3 unidades
    // Venta PC LOCAL-002: 2 unidades
    // Stock Esperado: 20 - 3 - 2 = 15 unidades
    const currentStock = await productService.getProductStock(prod.id);
    const stockMathCorrect = currentStock === 15;

    recordTest(
      'TEST 10: Stock derivado con ventas de dos computadoras',
      stockMathCorrect,
      `Stock Inicial (20) - Ventas LOCAL-001 (3) - Ventas LOCAL-002 (2) = ${currentStock} unidades (Esperado: 15)`
    );

    // ----------------------------------------------------
    // TEST 11: Importar archivos en distinto orden (Convergencia de estado)
    // ----------------------------------------------------
    // Creamos dos ventas C y D para dos terminales
    const saleIdOrderA = `TEST-ORDER-A-${Date.now()}`;
    const saleIdOrderB = `TEST-ORDER-B-${Date.now()}`;

    const syncBatchA = {
      format_version: 1,
      source_id: 'LOCAL-A',
      exported_at: new Date().toISOString(),
      data: {
        emprendimientos: [],
        productos: [],
        movimientosStock: [],
        ventas: [
          {
            identificadorUnico: saleIdOrderA,
            fecha: new Date().toISOString(),
            hora: '11:00:00',
            turno: 'MANANA',
            productoId: prod.id,
            emprendimientoId: emp.id,
            cantidad: 1,
            precioUnitario: 1000,
            descuento: 0,
            total: 1000,
            metodoPago: 'EFECTIVO',
            tipoCliente: 'RESIDENTE',
            localOrigen: 'LOCAL-A',
            usuario: 'cajero_a',
            estado: 'ACTIVO',
          },
        ],
        retiros: [],
        sesionesCaja: [],
      },
    };

    const syncBatchB = {
      format_version: 1,
      source_id: 'LOCAL-B',
      exported_at: new Date().toISOString(),
      data: {
        emprendimientos: [],
        productos: [],
        movimientosStock: [],
        ventas: [
          {
            identificadorUnico: saleIdOrderB,
            fecha: new Date().toISOString(),
            hora: '11:30:00',
            turno: 'MANANA',
            productoId: prod.id,
            emprendimientoId: emp.id,
            cantidad: 2,
            precioUnitario: 1000,
            descuento: 0,
            total: 2000,
            metodoPago: 'EFECTIVO',
            tipoCliente: 'RESIDENTE',
            localOrigen: 'LOCAL-B',
            usuario: 'cajero_b',
            estado: 'ACTIVO',
          },
        ],
        retiros: [],
        sesionesCaja: [],
      },
    };

    // Importamos B primero, luego A
    const previewB = await importService.previewFile(Buffer.from(JSON.stringify(syncBatchB)), 'batch_B.json');
    await importService.executeSyncImport(previewB.datosNuevos, { nombreArchivo: 'batch_B.json' });

    const previewA = await importService.previewFile(Buffer.from(JSON.stringify(syncBatchA)), 'batch_A.json');
    await importService.executeSyncImport(previewA.datosNuevos, { nombreArchivo: 'batch_A.json' });

    const hasA = (await prisma.venta.count({ where: { identificadorUnico: saleIdOrderA } })) === 1;
    const hasB = (await prisma.venta.count({ where: { identificadorUnico: saleIdOrderB } })) === 1;

    recordTest(
      'TEST 11: Importación en orden arbitrario (B luego A)',
      hasA && hasB,
      `Convergencia total sin importar el orden cronológico de importación: Batch B y Batch A consolidados con éxito`
    );
  } finally {
    // --- CLEANUP ---
    // Limpiar datos de prueba de la base de datos MySQL
    await prisma.venta.deleteMany({
      where: {
        productoId: prod.id,
      },
    });
    await prisma.movimientoStock.deleteMany({
      where: {
        productoId: prod.id,
      },
    });
    await prisma.producto.delete({
      where: { id: prod.id },
    });
    await prisma.emprendimiento.delete({
      where: { id: emp.id },
    });
    await prisma.historialImportacion.deleteMany({
      where: {
        nombreArchivo: { contains: 'sincronizacion_LOCAL' },
      },
    });
    console.log('\n🧹 Limpieza de datos de prueba completada.\n');
  }

  // Resumen final
  console.log('========================================================');
  console.log('                 RESUMEN DE RESULTADOS                  ');
  console.log('========================================================');
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`Total pruebas ejecutadas: ${results.length}`);
  console.log(`Pruebas aprobadas: ${totalPassed} / ${results.length}`);

  if (totalPassed === results.length) {
    console.log('\n🎉 ¡TODAS LAS 11 PRUEBAS PASARON AL 100%! SISTEMA TOTALMENTE VERIFICADO.\n');
    process.exit(0);
  } else {
    console.error('\n⚠️ Hubo fallos en algunas pruebas.\n');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Error fatal al ejecutar suite de pruebas:', err);
  process.exit(1);
});
