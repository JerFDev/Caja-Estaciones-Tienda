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
import { municipalEntrepreneurshipService } from './services/municipalEntrepreneurshipService';
import { convocatoriaService } from './services/convocatoriaService';
import { colectivoService } from './services/colectivoService';
import { edicionService } from './services/edicionService';
import { acompanamientoService } from './services/acompanamientoService';
import { municipalStatisticsService } from './services/municipalStatisticsService';
import { municipalAuditService } from './services/municipalAuditService';

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

app.get('/api/export/sync-json', async (req, res) => {
  try {
    const { filename, json } = await exportService.generateSyncJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(json);
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

    const originalName = req.file.originalname || 'archivo_externo';
    const preview = await importService.previewFile(req.file.buffer, originalName);
    res.json(preview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import/confirm', async (req, res) => {
  try {
    const { datosNuevos, nombreArchivo, archivoHash, sourceId, usuario } = req.body;
    if (!datosNuevos) {
      return res.status(400).json({ error: 'No hay datos válidos para importar.' });
    }

    const resultado = await importService.executeSyncImport(datosNuevos, {
      nombreArchivo: nombreArchivo || 'archivo_sincronizado.json',
      archivoHash: archivoHash || datosNuevos.archivoHash,
      sourceId: sourceId || datosNuevos.sourceId,
      usuario,
    });
    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// --- MÓDULO DE GESTIÓN MUNICIPAL ---
// ==========================================

// Dashboard Municipal
app.get("/api/municipal/dashboard", async (_req, res) => {
  try {
    const stats = await municipalStatisticsService.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auditoría
app.get("/api/municipal/auditoria", async (req, res) => {
  try {
    const logs = await municipalAuditService.getAuditLogs({
      entidad: req.query.entidad as string,
      entidadId: req.query.entidadId as string,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Emprendimientos Municipales
app.get("/api/municipal/emprendimientos", async (req, res) => {
  try {
    const list = await municipalEntrepreneurshipService.getAll({
      search: req.query.search as string,
      estado: req.query.estado as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/municipal/emprendimientos/:id", async (req, res) => {
  try {
    const emp = await municipalEntrepreneurshipService.getById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Emprendimiento no encontrado" });
    res.json(emp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/municipal/emprendimientos/:id/expediente", async (req, res) => {
  try {
    const exp = await municipalEntrepreneurshipService.getExpediente(req.params.id);
    res.json(exp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/emprendimientos", async (req, res) => {
  try {
    const nuevo = await municipalEntrepreneurshipService.create(req.body, req.body.usuario || "administrador");
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/emprendimientos/:id", async (req, res) => {
  try {
    const actualizado = await municipalEntrepreneurshipService.update(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Convocatorias
app.get("/api/municipal/convocatorias", async (req, res) => {
  try {
    const list = await convocatoriaService.getAllConvocatorias(req.query.todas !== "false");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/municipal/convocatorias/:id", async (req, res) => {
  try {
    const item = await convocatoriaService.getConvocatoriaById(req.params.id);
    if (!item) return res.status(404).json({ error: "Convocatoria no encontrada" });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/convocatorias", async (req, res) => {
  try {
    const nueva = await convocatoriaService.createConvocatoria(req.body, req.body.usuario || "administrador");
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/convocatorias/:id", async (req, res) => {
  try {
    const actualizada = await convocatoriaService.updateConvocatoria(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Postulaciones
app.get("/api/municipal/postulaciones", async (req, res) => {
  try {
    const list = await convocatoriaService.getPostulaciones({
      convocatoriaId: req.query.convocatoriaId as string,
      emprendimientoId: req.query.emprendimientoId as string,
      estado: req.query.estado as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/postulaciones", async (req, res) => {
  try {
    const nueva = await convocatoriaService.createPostulacion(req.body, req.body.usuario || "administrador");
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/postulaciones/:id/estado", async (req, res) => {
  try {
    const actualizada = await convocatoriaService.updatePostulacionEstado(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Colectivos
app.get("/api/municipal/colectivos", async (_req, res) => {
  try {
    const list = await colectivoService.getAllColectivos();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/municipal/colectivos/:id", async (req, res) => {
  try {
    const col = await colectivoService.getColectivoById(req.params.id);
    if (!col) return res.status(404).json({ error: "Colectivo no encontrado" });
    res.json(col);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/colectivos", async (req, res) => {
  try {
    const nuevo = await colectivoService.createColectivo(req.body, req.body.usuario || "administrador");
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/colectivos/:id", async (req, res) => {
  try {
    const actualizado = await colectivoService.updateColectivo(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/municipal/colectivos/:id/miembros", async (req, res) => {
  try {
    const membresia = await colectivoService.addMiembro(
      req.params.id,
      req.body.emprendimientoId,
      req.body.observaciones,
      req.body.usuario || "administrador"
    );
    res.status(201).json(membresia);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/colectivos/miembros/:membresiaId/baja", async (req, res) => {
  try {
    const actualizada = await colectivoService.removeMiembro(
      req.params.membresiaId,
      req.body.motivo,
      req.body.usuario || "administrador"
    );
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Locales
app.get("/api/municipal/locales", async (_req, res) => {
  try {
    const list = await edicionService.getAllLocales();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/locales", async (req, res) => {
  try {
    const nuevo = await edicionService.createLocal(req.body, req.body.usuario || "administrador");
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/locales/:id", async (req, res) => {
  try {
    const actualizado = await edicionService.updateLocal(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Ediciones
app.get("/api/municipal/ediciones", async (_req, res) => {
  try {
    const list = await edicionService.getAllEdiciones();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/municipal/ediciones/:id", async (req, res) => {
  try {
    const ed = await edicionService.getEdicionById(req.params.id);
    if (!ed) return res.status(404).json({ error: "Edición no encontrada" });
    res.json(ed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/ediciones", async (req, res) => {
  try {
    const nueva = await edicionService.createEdicion(req.body, req.body.usuario || "administrador");
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/ediciones/:id", async (req, res) => {
  try {
    const actualizada = await edicionService.updateEdicion(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/municipal/participaciones", async (req, res) => {
  try {
    const part = await edicionService.addParticipacion(req.body, req.body.usuario || "administrador");
    res.status(201).json(part);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/participaciones/:id/estado", async (req, res) => {
  try {
    const actualizada = await edicionService.updateParticipacionEstado(req.params.id, req.body, req.body.usuario || "administrador");
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Fiscalizaciones
app.get("/api/municipal/fiscalizaciones", async (req, res) => {
  try {
    const list = await acompanamientoService.getFiscalizaciones({
      emprendimientoId: req.query.emprendimientoId as string,
      resultado: req.query.resultado as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/fiscalizaciones", async (req, res) => {
  try {
    const nueva = await acompanamientoService.createFiscalizacion(req.body, req.body.usuario || "inspector");
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Capacitaciones
app.get("/api/municipal/capacitaciones", async (_req, res) => {
  try {
    const list = await acompanamientoService.getAllCapacitaciones();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/capacitaciones", async (req, res) => {
  try {
    const nueva = await acompanamientoService.createCapacitacion(req.body, req.body.usuario || "administrador");
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/municipal/capacitaciones/:id/participantes", async (req, res) => {
  try {
    const part = await acompanamientoService.addParticipanteCapacitacion(
      req.params.id,
      req.body.emprendimientoId,
      req.body.observaciones
    );
    res.status(201).json(part);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reuniones
app.get("/api/municipal/reuniones", async (req, res) => {
  try {
    const list = await acompanamientoService.getReuniones({
      emprendimientoId: req.query.emprendimientoId as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/reuniones", async (req, res) => {
  try {
    const nueva = await acompanamientoService.createReunion(req.body, req.body.usuario || "administrador");
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Presencia Digital & Redes Sociales
app.get("/api/municipal/redes-sociales", async (req, res) => {
  try {
    const list = await acompanamientoService.getAllRedesSociales({
      canal: req.query.canal as string,
      search: req.query.search as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/municipal/emprendimientos/:id/presencia-digital", async (req, res) => {
  try {
    const list = await acompanamientoService.getPresenciaDigital(req.params.id);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/presencia-digital", async (req, res) => {
  try {
    const pd = await acompanamientoService.upsertPresenciaDigital(req.body);
    res.status(201).json(pd);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/presencia-digital/:id", async (req, res) => {
  try {
    const updated = await acompanamientoService.updatePresenciaDigital(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/municipal/presencia-digital/:id/seguidores", async (req, res) => {
  try {
    const updated = await acompanamientoService.updateSeguidores(req.params.id, req.body.seguidores);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/municipal/presencia-digital/:id", async (req, res) => {
  try {
    const deleted = await acompanamientoService.deletePresenciaDigital(req.params.id);
    res.json(deleted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Servicios Municipales
app.get("/api/municipal/servicios", async (_req, res) => {
  try {
    const list = await acompanamientoService.getAllServiciosMunicipales();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/servicios", async (req, res) => {
  try {
    const nuevo = await acompanamientoService.createServicioMunicipal(req.body);
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/municipal/servicios-otorgados", async (req, res) => {
  try {
    const list = await acompanamientoService.getServiciosOtorgados({
      emprendimientoId: req.query.emprendimientoId as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/servicios-otorgados", async (req, res) => {
  try {
    const nuevo = await acompanamientoService.otorgarServicio(req.body, req.body.usuario || "administrador");
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Seguimientos
app.get("/api/municipal/seguimientos", async (req, res) => {
  try {
    const list = await acompanamientoService.getSeguimientos({
      emprendimientoId: req.query.emprendimientoId as string,
      soloPendientes: req.query.pendientes === "true",
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/municipal/seguimientos", async (req, res) => {
  try {
    const nuevo = await acompanamientoService.createSeguimiento(req.body, req.body.usuario || "administrador");
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
