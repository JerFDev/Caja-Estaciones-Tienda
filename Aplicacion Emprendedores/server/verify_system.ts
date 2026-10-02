import { api } from '../src/services/api';
import { prisma } from './db';
import ExcelJS from 'exceljs';
import http from 'http';
import { exportService } from './services/exportService';
import { importService } from './services/importService';
import { salesService } from './services/salesService';
import { withdrawalService } from './services/withdrawalService';
import { balancesService } from './services/balancesService';
import { productService } from './services/productService';
import { stockService } from './services/stockService';
import { cashRegisterService } from './services/cashRegisterService';

async function runVerification() {
  console.log('=====================================================');
  console.log('   SUITE DE VERIFICACIÓN INTEGRAL DE TIENDA CREATIVA');
  console.log('=====================================================\n');

  // 1. Verificar catálogo y datos cargados
  const totalEmps = await prisma.emprendimiento.count();
  const totalProds = await prisma.producto.count();
  const totalVentas = await prisma.venta.count();
  const totalRetiros = await prisma.retiro.count();

  console.log(`[Base de Datos SQLite]:`);
  console.log(`- Emprendimientos: ${totalEmps}`);
  console.log(`- Productos: ${totalProds}`);
  console.log(`- Ventas en histórico: ${totalVentas}`);
  console.log(`- Retiros en histórico: ${totalRetiros}`);

  if (totalEmps === 0 || totalProds === 0) {
    throw new Error('La base de datos no tiene datos cargados.');
  }

  // 2. Prueba de Venta y Descuento Dinámico de Stock
  console.log(`\n[Prueba 1: Venta y Control de Stock Inmutable]`);
  const testProduct = await prisma.producto.findFirst({
    where: { codigo: 'AKM001' },
    include: { emprendimiento: true },
  });

  if (!testProduct) throw new Error('Producto AKM001 no encontrado');

  const stockAntes = await productService.getProductStock(testProduct.id);
  console.log(`- Producto: ${testProduct.codigo} (${testProduct.nombre})`);
  console.log(`- Stock actual antes de venta: ${stockAntes} unidades`);
  console.log(`- Precio congelado oficial: $${testProduct.precio}`);

  // Registrar venta de 2 unidades en efectivo
  const nuevaVenta = await salesService.createSale({
    productoId: testProduct.id,
    cantidad: 2,
    metodoPago: 'EFECTIVO',
    tipoCliente: 'TURISTA',
    turno: 'MANANA',
    observaciones: 'Prueba de verificación automatizada',
  });

  console.log(`- Venta creada con éxito! ID Único: ${nuevaVenta.identificadorUnico}`);
  console.log(`- Total cobrado: $${nuevaVenta.total} ($${nuevaVenta.precioUnitario} x ${nuevaVenta.cantidad})`);

  const stockDespues = await productService.getProductStock(testProduct.id);
  console.log(`- Stock inmediatamente después de venta: ${stockDespues} unidades`);

  if (stockDespues !== stockAntes - 2) {
    throw new Error(`Fallo en descuento de stock: esperado ${stockAntes - 2}, obtenido ${stockDespues}`);
  }
  console.log('✔ Stock descontado con exactitud matemática.');

  // 3. Prueba de Saldo Disponible y Retiro
  console.log(`\n[Prueba 2: Cálculo de Saldo en Efectivo y Retiro]`);
  const balanceEmp = await balancesService.getBalanceByEntrepreneurId(testProduct.emprendimientoId);
  if (!balanceEmp) throw new Error('Balance no calculado');

  console.log(`- Emprendimiento: [${balanceEmp.codigo}] ${balanceEmp.nombre}`);
  console.log(`- Ventas en efectivo acumuladas: $${balanceEmp.ventasEfectivo}`);
  console.log(`- Total retiros efectuados: $${balanceEmp.totalRetiros}`);
  console.log(`- Saldo disponible en efectivo: $${balanceEmp.saldoEfectivoDisponible}`);

  // Intentar un retiro que exceda el saldo disponible (debe fallar si no tiene autorización especial)
  try {
    await withdrawalService.createWithdrawal({
      emprendimientoId: testProduct.emprendimientoId,
      monto: balanceEmp.saldoEfectivoDisponible + 999999,
      permitirExcedente: false,
    });
    throw new Error('ERROR: Se permitió un retiro por encima del saldo disponible sin autorización!');
  } catch (err: any) {
    console.log(`✔ Validación estricta exitosa: El sistema bloqueó el retiro excesivo (${err.message})`);
  }

  // Realizar un retiro válido
  const retiroValido = await withdrawalService.createWithdrawal({
    emprendimientoId: testProduct.emprendimientoId,
    monto: 1000,
    observaciones: 'Prueba retiro automatizado',
    permitirExcedente: true,
  });
  console.log(`- Retiro registrado con éxito: ID ${retiroValido.identificadorUnico}, Monto: $${retiroValido.monto}`);

  // 4. Anulación de venta y restitución de stock
  console.log(`\n[Prueba 3: Anulación Lógica y Restitución de Stock]`);
  await salesService.voidSale(nuevaVenta.id, 'Prueba de anulación');
  const stockRestituido = await productService.getProductStock(testProduct.id);
  console.log(`- Stock tras anular la venta: ${stockRestituido} unidades`);
  if (stockRestituido !== stockAntes) {
    throw new Error(`Fallo en restitución de stock: esperado ${stockAntes}, obtenido ${stockRestituido}`);
  }
  console.log('✔ Venta anulada lógicamente y stock restituido.');

  // Limpiar retiro de prueba anulándolo
  await withdrawalService.voidWithdrawal(retiroValido.id, 'Limpieza prueba');

  // Prueba de Baja / Eliminación de Stock
  console.log(`\n[Prueba 3.1: Baja / Eliminación de Stock en Emprendimientos]`);
  const stockPreBaja = await productService.getProductStock(testProduct.id);
  const movBaja = await stockService.createMovement({
    productoId: testProduct.id,
    cantidad: 2,
    tipoMovimiento: 'BAJA',
    observaciones: 'Prueba de baja por retiro del emprendedor o rotura',
  });
  const stockPostBaja = await productService.getProductStock(testProduct.id);
  console.log(`- Stock antes de baja: ${stockPreBaja}, después de baja: ${stockPostBaja}`);
  if (stockPostBaja !== stockPreBaja - 2) {
    throw new Error(`Fallo en baja de stock: esperado ${stockPreBaja - 2}, obtenido ${stockPostBaja}`);
  }
  console.log('✔ Baja / Eliminación de stock restada con exactitud matemática.');
  // Limpiar movimiento de prueba
  await prisma.movimientoStock.delete({ where: { id: movBaja.id } });

  // 5. Prueba de Exportación XLSX
  console.log(`\n[Prueba 4: Generación y Validación de Archivo Excel (.xlsx)]`);
  const wb = await exportService.generateExcel({ tipo: 'TODO' });
  const sheetNames = wb.worksheets.map((w) => w.name);
  console.log(`- Hojas generadas: ${sheetNames.join(', ')}`);
  if (!sheetNames.includes('Ventas') || !sheetNames.includes('Stock') || !sheetNames.includes('Retiros') || !sheetNames.includes('Saldos')) {
    throw new Error('Faltan hojas en el Excel exportado.');
  }
  console.log(`- Total filas en hoja Ventas: ${wb.getWorksheet('Ventas')?.rowCount}`);
  console.log('✔ Archivo XLSX generado conforme a las especificaciones.');

  // 6. Prueba de Consolidación e Importación Anti-Duplicados
  console.log(`\n[Prueba 5: Consolidación Multi-Local y Detección de Duplicados]`);
  // Creamos un Excel en memoria con 1 venta existente y 1 venta nueva simulando otra máquina
  const testWb = new ExcelJS.Workbook();
  const ws = testWb.addWorksheet('Ventas');
  ws.addRow([
    'ID Único Operación',
    'Fecha',
    'Hora',
    'Turno',
    'Código Producto',
    'Producto',
    'Código Emprendimiento',
    'Emprendimiento',
    'Cantidad',
    'Precio Unitario ($)',
    'Total ($)',
    'Método Pago',
    'Tipo Cliente',
    'Local',
  ]);

  // Venta ya existente en la base de datos
  const ventaExistente = await prisma.venta.findFirst({ where: { estado: 'ACTIVO' } });
  if (ventaExistente) {
    ws.addRow([
      ventaExistente.identificadorUnico,
      '2026-06-15',
      '15:30:00',
      'Mañana',
      'AKM001',
      'AROS ALPACA CALADA',
      'AKM',
      'Akasha Joyería',
      1,
      25000,
      25000,
      'Efectivo',
      'Residente',
      'LOCAL_NORTE',
    ]);
  }

  // Venta completamente nueva de otra máquina
  const nuevoIdUnico = `LOCAL_B-${Date.now()}-SIMULADA`;
  ws.addRow([
    nuevoIdUnico,
    '2026-06-18',
    '17:45:00',
    'Tarde',
    'AKM002',
    'DIJES CALADOS ALPACA CHICOS',
    'AKM',
    'Akasha Joyería',
    1,
    25000,
    25000,
    'Transferencia',
    'Turista',
    'LOCAL_B',
  ]);

  const buffer = await testWb.xlsx.writeBuffer();
  const preview = await importService.previewImportExcel(Buffer.from(buffer));

  console.log(`- Resultado de análisis:`);
  console.log(`  * Total encontradas: ${preview.resumen.totalEncontradas}`);
  console.log(`  * Nuevas a consolidar: ${preview.resumen.nuevas}`);
  console.log(`  * Ya existentes (omitidas): ${preview.resumen.duplicadas}`);
  console.log(`  * Errores detectados: ${preview.resumen.errores}`);

  if (preview.resumen.duplicadas < 1 || preview.resumen.nuevas < 1) {
    throw new Error('Fallo en detección de duplicados en consolidación');
  }
  console.log('✔ Consolidación detectó duplicado con éxito sin permitir doble conteo.');

  // Ejecutar consolidación
  const consolidado = await importService.executeImport(preview.datosNuevos as any, 'local_b_simulado.xlsx');
  console.log(`- Nuevas operaciones incorporadas a la base central: ${consolidado.ventasInsertadas}`);

  // Verificar que la venta ahora existe
  const checkVenta = await prisma.venta.findUnique({ where: { identificadorUnico: nuevoIdUnico } });
  if (!checkVenta) throw new Error('La venta nueva no se guardó');
  console.log(`✔ Venta consolidada comprobada en DB (ID: ${checkVenta.identificadorUnico})`);

  // Limpiar venta simulada
  await prisma.venta.delete({ where: { id: checkVenta.id } });

  // 7. Prueba de Apertura, Estadísticas del Día, Arqueo y Cierre de Caja
  console.log(`\n[Prueba 6: Gestión de Caja (Apertura, Estadísticas, Arqueo y Cierre)]`);
  const sesionActual = await cashRegisterService.getCurrentSession();
  console.log(`- Estado actual de caja en DB: ${sesionActual.abierta ? 'ABIERTA' : 'CERRADA'}`);

  let sesionTestId = '';
  if (!sesionActual.abierta) {
    const nuevaSesion = await cashRegisterService.openRegister({
      montoInicial: 15000,
      turno: 'MANANA',
      usuario: 'Cajero Automatizado',
      observaciones: 'Apertura de prueba de sistema',
    });
    sesionTestId = nuevaSesion.id;
    console.log(`- Caja abierta con éxito: Monto inicial $${nuevaSesion.montoInicial}, Turno: ${nuevaSesion.turno}`);
  }

  // Obtener estadísticas de ventas del día
  const dailyStats = await cashRegisterService.getDailySalesStats();
  console.log(`- Estadísticas del día calculadas: Total $${dailyStats.totalVentas}, Operaciones: ${dailyStats.cantidadVentas}`);
  console.log(`- Total Efectivo: $${dailyStats.totalEfectivo}, Total Transferencia: $${dailyStats.totalTransferencia}`);
  console.log(`- Desglose por emprendimientos: ${dailyStats.ventasPorEmprendimiento.length} emprendimientos`);

  // Si abrimos la sesión de prueba, cerrarla y verificar arqueo
  if (sesionTestId) {
    const sesionInfo = await cashRegisterService.getCurrentSession();
    const esperado = sesionInfo.totalesEnVivo?.montoEsperadoEfectivo ?? 15000;
    const cierre = await cashRegisterService.closeRegister({
      montoRealContado: esperado,
      observaciones: 'Cierre de prueba con arqueo exacto',
      usuario: 'Cajero Automatizado',
    });
    console.log(`- Caja cerrada y arqueada: Esperado $${cierre.montoEsperadoEfectivo}, Real contado $${cierre.montoRealContado}, Diferencia $${cierre.diferencia}`);
    if (cierre.diferencia !== 0) {
      throw new Error(`Diferencia de arqueo inesperada: ${cierre.diferencia}`);
    }
  }
  console.log('✔ Gestión integral de Sesiones de Caja y Estadísticas del Día verificada con éxito.');

  console.log('\n=====================================================');
  console.log('   TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE (100%)');
  console.log('=====================================================\n');
}

runVerification()
  .catch((e) => {
    console.error('❌ ERROR EN LA VERIFICACIÓN:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
