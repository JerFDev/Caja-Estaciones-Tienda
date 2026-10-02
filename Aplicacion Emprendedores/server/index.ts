import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { initConfig, prisma } from './db';
import { entrepreneurService } from './services/entrepreneurService';
import { productService } from './services/productService';
import { stockService } from './services/stockService';
import { salesService } from './services/salesService';
import { withdrawalService } from './services/withdrawalService';
import { balancesService } from './services/balancesService';
import { statisticsService } from './services/statisticsService';
import { exportService } from './services/exportService';
import { importService } from './services/importService';
import { cashRegisterService } from './services/cashRegisterService';

const app = express();
const port = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURACIÓN ---
app.get('/api/config', async (req, res) => {
  try {
    const config = await prisma.configuracion.findFirst();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const { localCodigo, localNombre, permitirStockNegativo, porcentajeRetencionDefecto, turnoActual } = req.body;
    const config = await prisma.configuracion.findFirst();
    const id = config?.id || 'config_default';

    const updated = await prisma.configuracion.upsert({
      where: { id },
      update: {
        ...(localCodigo && { localCodigo }),
        ...(localNombre && { localNombre }),
        ...(permitirStockNegativo !== undefined && { permitirStockNegativo }),
        ...(porcentajeRetencionDefecto !== undefined && { porcentajeRetencionDefecto }),
        ...(turnoActual && { turnoActual }),
      },
      create: {
        id,
        localCodigo: localCodigo || 'LOCAL_01',
        localNombre: localNombre || 'Tienda Creativa',
        permitirStockNegativo: permitirStockNegativo || false,
        porcentajeRetencionDefecto: porcentajeRetencionDefecto || 0.0,
        turnoActual: turnoActual || 'MANANA',
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- EMPRENDIMIENTOS ---
app.get('/api/entrepreneurs', async (req, res) => {
  try {
    const list = await entrepreneurService.getAll(req.query.inactivos === 'true');
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/entrepreneurs/:id', async (req, res) => {
  try {
    const item = await entrepreneurService.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Emprendimiento no encontrado' });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/entrepreneurs', async (req, res) => {
  try {
    const nuevo = await entrepreneurService.create(req.body);
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/entrepreneurs/:id', async (req, res) => {
  try {
    const updated = await entrepreneurService.update(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/entrepreneurs/:id/toggle', async (req, res) => {
  try {
    const updated = await entrepreneurService.toggleActivo(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- PRODUCTOS ---
app.get('/api/products', async (req, res) => {
  try {
    const productos = await productService.getAll({
      emprendimientoId: req.query.emprendimientoId as string,
      search: req.query.search as string,
      soloActivos: req.query.inactivos !== 'true',
    });
    res.json(productos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/next-code/:emprendimientoId', async (req, res) => {
  try {
    const nextCode = await productService.generateNextCode(req.params.emprendimientoId);
    res.json({ nextCode });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/products/code/:code', async (req, res) => {
  try {
    const prod = await productService.getByCode(req.params.code);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(prod);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const prod = await productService.getById(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(prod);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const prod = await productService.create(req.body);
    res.status(201).json(prod);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updated = await productService.update(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/products/:id/toggle', async (req, res) => {
  try {
    const updated = await productService.toggleActivo(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- STOCK ---
app.get('/api/stock/movements', async (req, res) => {
  try {
    const movs = await stockService.getMovements({
      productoId: req.query.productoId as string,
      emprendimientoId: req.query.emprendimientoId as string,
      tipoMovimiento: req.query.tipoMovimiento as string,
      fechaDesde: req.query.fechaDesde as string,
      fechaHasta: req.query.fechaHasta as string,
    });
    res.json(movs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stock/movements', async (req, res) => {
  try {
    const mov = await stockService.createMovement(req.body);
    res.status(201).json(mov);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/stock/low', async (req, res) => {
  try {
    const low = await stockService.getLowStockProducts();
    res.json(low);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- VENTAS ---
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await salesService.getSales({
      fechaDesde: req.query.fechaDesde as string,
      fechaHasta: req.query.fechaHasta as string,
      emprendimientoId: req.query.emprendimientoId as string,
      metodoPago: req.query.metodoPago as string,
      tipoCliente: req.query.tipoCliente as string,
      turno: req.query.turno as string,
      estado: req.query.estado as string,
      search: req.query.search as string,
    });
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const sale = await salesService.createSale(req.body);
    res.status(201).json(sale);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sales/:id/void', async (req, res) => {
  try {
    const { motivo, usuario } = req.body;
    const voided = await salesService.voidSale(req.params.id, motivo, usuario);
    res.json(voided);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- SESIONES DE CAJA Y ARQUEO ---
app.get('/api/caja/sesion-actual', async (_req, res) => {
  try {
    const info = await cashRegisterService.getCurrentSession();
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/caja/abrir', async (req, res) => {
  try {
    const sesion = await cashRegisterService.openRegister(req.body);
    res.status(201).json(sesion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/caja/cerrar', async (req, res) => {
  try {
    const sesion = await cashRegisterService.closeRegister(req.body);
    res.json(sesion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/caja/cerrar-abiertas', async (req, res) => {
  try {
    const usuario = req.body?.usuario || 'emprendedor';
    const cerradas = await cashRegisterService.closeAnyOpenSession(usuario);
    res.json({ success: true, cerradas });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/caja/ventas-dia', async (req, res) => {
  try {
    const stats = await cashRegisterService.getDailySalesStats(req.query.fecha as string);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/caja/historial', async (_req, res) => {
  try {
    const list = await cashRegisterService.getSessionHistory();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- RETIROS ---
app.get('/api/withdrawals', async (req, res) => {
  try {
    const retiros = await withdrawalService.getWithdrawals({
      emprendimientoId: req.query.emprendimientoId as string,
      fechaDesde: req.query.fechaDesde as string,
      fechaHasta: req.query.fechaHasta as string,
      estado: req.query.estado as string,
    });
    res.json(retiros);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/withdrawals', async (req, res) => {
  try {
    const ret = await withdrawalService.createWithdrawal(req.body);
    res.status(201).json(ret);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/withdrawals/:id/void', async (req, res) => {
  try {
    const { motivo, usuario } = req.body;
    const voided = await withdrawalService.voidWithdrawal(req.params.id, motivo, usuario);
    res.json(voided);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- SALDOS ---
app.get('/api/balances', async (req, res) => {
  try {
    const list = await balancesService.getBalances(req.query.inactivos === 'true');
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/balances/:id', async (req, res) => {
  try {
    const balance = await balancesService.getBalanceByEntrepreneurId(req.params.id);
    if (!balance) return res.status(404).json({ error: 'Emprendimiento no encontrado' });
    res.json(balance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ESTADÍSTICAS Y DASHBOARD ---
app.get('/api/statistics/dashboard', async (req, res) => {
  try {
    const stats = await statisticsService.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- EXPORTACIÓN ---
app.get('/api/export/excel', async (req, res) => {
  try {
    const workbook = await exportService.generateExcel({
      fechaDesde: req.query.fechaDesde as string,
      fechaHasta: req.query.fechaHasta as string,
      emprendimientoId: req.query.emprendimientoId as string,
      tipo: (req.query.tipo as any) || 'TODO',
    });

    const filename = `Reporte_Tienda_Creativa_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export/json', async (req, res) => {
  try {
    const jsonStr = await exportService.generateJsonBackup();
    const filename = `backup_tienda_creativa_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonStr);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- IMPORTACIÓN Y CONSOLIDACIÓN ---
app.post('/api/import/preview', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    const preview = await importService.previewImportExcel(req.file.buffer);
    res.json(preview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import/confirm', async (req, res) => {
  try {
    const { datosNuevos, nombreArchivo, usuario } = req.body;
    if (!datosNuevos) {
      return res.status(400).json({ error: 'No hay datos válidos para importar.' });
    }

    const resultado = await importService.executeImport(datosNuevos, nombreArchivo || 'archivo_externo.xlsx', usuario);
    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Inicializar y escuchar
initConfig().then(() => {
  app.listen(port, () => {
    console.log(`[API Local] Servidor ejecutándose en http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('[API Local] Error fatal al iniciar:', err);
  process.exit(1);
});
