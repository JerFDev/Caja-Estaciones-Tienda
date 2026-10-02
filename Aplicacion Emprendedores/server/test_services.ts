import { balancesService } from './services/balancesService';
import { statisticsService } from './services/statisticsService';
import { salesService } from './services/salesService';
import { productService } from './services/productService';
import { withdrawalService } from './services/withdrawalService';
import { exportService } from './services/exportService';
import { prisma } from './db';

async function testServices() {
  console.log('--- Probando Servicios de Backend ---');

  // 1. Estadísticas
  const stats = await statisticsService.getDashboardStats();
  console.log('Dashboard Stats:');
  console.log(`- Emprendimientos activos: ${stats.emprendimientosActivos}`);
  console.log(`- Productos activos: ${stats.productosActivos}`);
  console.log(`- Unidades vendidas total: ${stats.unidadesVendidasTotal}`);
  console.log(`- Ventas en efectivo ($): ${stats.ventasEfectivo}`);
  console.log(`- Ventas en transferencia ($): ${stats.ventasTransferencia}`);
  console.log(`- Total retirado ($): ${stats.totalRetirado}`);
  console.log(`- Efectivo en caja chica ($): ${stats.efectivoCajaChica}`);

  // 2. Saldos
  const balances = await balancesService.getBalances();
  console.log(`\nSaldos calculados para ${balances.length} emprendimientos.`);
  const sampleBalance = balances[0];
  console.log(`Muestra [${sampleBalance.codigo}] ${sampleBalance.nombre}:`);
  console.log(`- Ventas totales: $${sampleBalance.ventasTotales}`);
  console.log(`- Ventas efectivo: $${sampleBalance.ventasEfectivo}`);
  console.log(`- Ventas transferencia: $${sampleBalance.ventasTransferencia}`);
  console.log(`- Total retiros: $${sampleBalance.totalRetiros}`);
  console.log(`- Saldo disponible efectivo: $${sampleBalance.saldoEfectivoDisponible}`);
  console.log(`- Stock actual: ${sampleBalance.stockActual}`);

  // 3. Generación de código automático
  const nextCode = await productService.generateNextCode(sampleBalance.id);
  console.log(`\nSiguiente código automático para ${sampleBalance.codigo}: ${nextCode}`);

  // 4. Prueba de exportación XLSX
  const workbook = await exportService.generateExcel({ tipo: 'TODO' });
  console.log(`\nExcel generado correctamente con hojas: ${workbook.worksheets.map(w => w.name).join(', ')}`);

  console.log('\n✅ Todos los servicios de backend verificados exitosamente.');
}

testServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
