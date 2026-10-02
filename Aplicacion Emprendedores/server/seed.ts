import { prisma } from './db';
import ExcelJS from 'exceljs';
import fs from 'fs';

function extractCellText(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if ('richText' in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((t: any) => t.text).join('').trim();
    }
    if ('result' in val) {
      const res = (val as any).result;
      return res !== null && res !== undefined ? String(res).trim() : '';
    }
    if ('text' in val) {
      return String((val as any).text).trim();
    }
  }
  return String(val).trim();
}

function extractCellNumber(cell: ExcelJS.Cell): number {
  const val = cell.value;
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') {
    if ('result' in val) {
      const res = Number((val as any).result);
      return isNaN(res) ? 0 : res;
    }
    if ('richText' in val && Array.isArray((val as any).richText)) {
      const txt = (val as any).richText.map((t: any) => t.text).join('');
      const n = Number(txt);
      return isNaN(n) ? 0 : n;
    }
  }
  const parsed = Number(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function extractCellDate(cell: ExcelJS.Cell): Date {
  const val = cell.value;
  if (val instanceof Date) return val;
  if (val && typeof val === 'object' && 'result' in val && (val as any).result instanceof Date) {
    return (val as any).result;
  }
  if (val) {
    const s = extractCellText(cell);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

async function seed() {
  console.log('--- Iniciando Carga de Datos Iniciales / Migración ---');

  const defaultExcelPath = 'C:\\Users\\lucas\\Downloads\\Caja Estaciones Tienda Creativa 1° Edicion - completa.xlsx';
  const hasOriginalExcel = fs.existsSync(defaultExcelPath);

  if (hasOriginalExcel) {
    console.log(`Encontrado archivo de 1° Edición en: ${defaultExcelPath}`);
    console.log('Migrando datos históricos a la base de datos local SQLite...');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(defaultExcelPath);

    // 1. Emprendimientos
    const wsEmp = workbook.getWorksheet('Códigos Emprendedorxs');
    const empMap = new Map<string, string>(); // codigo -> id

    if (wsEmp) {
      console.log('Procesando Emprendimientos...');
      wsEmp.eachRow(async (row, rowNumber) => {
        if (rowNumber > 2) {
          const codigo = extractCellText(row.getCell(2)).toUpperCase();
          const nombre = extractCellText(row.getCell(3));
          const responsable = extractCellText(row.getCell(4)) || 'Responsable';
          const telefono = extractCellText(row.getCell(5)) || null;
          const direccion = extractCellText(row.getCell(6)) || null;
          const alias = extractCellText(row.getCell(7)) || null;
          const cvu = extractCellText(row.getCell(8)) || null;
          const mail = extractCellText(row.getCell(9)) || null;
          const rubro = extractCellText(row.getCell(10)) || null;

          if (codigo && nombre) {
            const emp = await prisma.emprendimiento.upsert({
              where: { codigo },
              update: { nombre, responsable, telefono, direccion, alias, cvu, mail, rubro, activo: true },
              create: { codigo, nombre, responsable, telefono, direccion, alias, cvu, mail, rubro, activo: true },
            });
            empMap.set(codigo, emp.id);
          }
        }
      });
      // Wait a moment for promises
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const totalEmps = await prisma.emprendimiento.count();
      console.log(`Emprendimientos guardados en DB: ${totalEmps}`);
      
      const allEmps = await prisma.emprendimiento.findMany();
      allEmps.forEach(e => empMap.set(e.codigo, e.id));
    }

    // 2. Productos
    const wsProd = workbook.getWorksheet('Stock FINAL');
    const prodMap = new Map<string, { id: string; empId: string; precio: number }>();

    if (wsProd) {
      console.log('Procesando Catálogo de Productos...');
      for (let r = 4; r <= wsProd.rowCount; r++) {
        const row = wsProd.getRow(r);
        const codigo = extractCellText(row.getCell(1)).toUpperCase();
        const precio = extractCellNumber(row.getCell(3));
        const nombre = extractCellText(row.getCell(4));

        if (codigo && nombre) {
          const empCodigo = codigo.substring(0, 3);
          const empId = empMap.get(empCodigo);

          if (empId) {
            const prod = await prisma.producto.upsert({
              where: { codigo },
              update: { nombre, precio, activo: true },
              create: { codigo, emprendimientoId: empId, nombre, precio, activo: true, stockMinimoAlerta: 2 },
            });
            prodMap.set(codigo, { id: prod.id, empId, precio });
          }
        }
      }
      const totalProds = await prisma.producto.count();
      console.log(`Productos guardados en DB: ${totalProds}`);
      
      const allProds = await prisma.producto.findMany();
      allProds.forEach(p => prodMap.set(p.codigo, { id: p.id, empId: p.emprendimientoId, precio: p.precio }));
    }

    // 3. Ingresos de Stock
    const wsStock = workbook.getWorksheet('Ingreso de STOCK');
    if (wsStock) {
      console.log('Procesando Movimientos de Ingreso de Stock...');
      let stockCount = 0;
      for (let r = 5; r <= wsStock.rowCount; r++) {
        const row = wsStock.getRow(r);
        const codProd = extractCellText(row.getCell(1)).toUpperCase();
        const cantidad = extractCellNumber(row.getCell(3));
        const fecha = extractCellDate(row.getCell(2));

        if (codProd && cantidad > 0) {
          const prodInfo = prodMap.get(codProd);
          if (prodInfo) {
            const opUuid = `HIST-STOCK-${r}-${codProd}`;
            const exists = await prisma.movimientoStock.findUnique({
              where: { operacionUuid: opUuid },
            });

            if (!exists) {
              await prisma.movimientoStock.create({
                data: {
                  operacionUuid: opUuid,
                  productoId: prodInfo.id,
                  cantidad,
                  tipoMovimiento: 'INGRESO',
                  fecha,
                  observaciones: 'Carga inicial desde planilla 1° Edición',
                  usuario: 'migracion',
                },
              });
              stockCount++;
            }
          }
        }
      }
      console.log(`Nuevos movimientos de stock creados: ${stockCount}`);
    }

    // 4. Ventas
    const wsVentas = workbook.getWorksheet('Ventas');
    if (wsVentas) {
      console.log('Procesando Ventas históricas...');
      let ventasCount = 0;
      for (let r = 5; r <= wsVentas.rowCount; r++) {
        const row = wsVentas.getRow(r);
        const fecha = extractCellDate(row.getCell(1));
        const turnoVal = extractCellText(row.getCell(2)).toUpperCase();
        const codProd = extractCellText(row.getCell(3)).toUpperCase();
        const pagoVal = extractCellText(row.getCell(4)).toUpperCase();
        const clienteVal = extractCellText(row.getCell(5));
        const cantidad = extractCellNumber(row.getCell(6)) || 1;
        const totVal = extractCellNumber(row.getCell(8));

        if (codProd) {
          const prodInfo = prodMap.get(codProd);
          if (prodInfo) {
            const precioUnitario = prodInfo.precio;
            const total = totVal > 0 ? totVal : cantidad * precioUnitario;
            const turno = turnoVal.includes('T') ? 'TARDE' : 'MANANA';
            const metodoPago = pagoVal === 'T' || pagoVal.includes('TRANS') ? 'TRANSFERENCIA' : 'EFECTIVO';
            const tipoCliente = clienteVal.toLowerCase().includes('tur') ? 'TURISTA' : 'RESIDENTE';

            const idUnico = `HIST-VENTA-${r}-${codProd}`;
            const exists = await prisma.venta.findUnique({
              where: { identificadorUnico: idUnico },
            });

            if (!exists) {
              await prisma.venta.create({
                data: {
                  identificadorUnico: idUnico,
                  fecha,
                  hora: '14:00:00',
                  turno,
                  productoId: prodInfo.id,
                  emprendimientoId: prodInfo.empId,
                  cantidad,
                  precioUnitario,
                  total,
                  metodoPago,
                  tipoCliente,
                  localOrigen: 'LOCAL_01',
                  usuario: 'migracion',
                  estado: 'ACTIVO',
                  observaciones: 'Venta migrada desde planilla 1° Edición',
                },
              });
              ventasCount++;
            }
          }
        }
      }
      console.log(`Nuevas ventas históricas creadas: ${ventasCount}`);
    }

    // 5. Retiros
    const wsRetiros = workbook.getWorksheet('RETIROS por emprendedor');
    if (wsRetiros) {
      console.log('Procesando Retiros históricos...');
      let retirosCount = 0;
      for (let r = 5; r <= wsRetiros.rowCount; r++) {
        const row = wsRetiros.getRow(r);
        const codEmp = extractCellText(row.getCell(2)).toUpperCase();
        const fecha = extractCellDate(row.getCell(4));
        const monto = extractCellNumber(row.getCell(5));
        const obs = extractCellText(row.getCell(6));

        if (codEmp && monto > 0) {
          const empId = empMap.get(codEmp);
          if (empId) {
            const idUnico = `HIST-RETIRO-${r}-${codEmp}`;
            const exists = await prisma.retiro.findUnique({
              where: { identificadorUnico: idUnico },
            });

            if (!exists) {
              await prisma.retiro.create({
                data: {
                  identificadorUnico: idUnico,
                  emprendimientoId: empId,
                  fecha,
                  monto,
                  observaciones: obs || 'Retiro migrado desde planilla 1° Edición',
                  usuario: 'migracion',
                  localOrigen: 'LOCAL_01',
                  estado: 'ACTIVO',
                },
              });
              retirosCount++;
            }
          }
        }
      }
      console.log(`Nuevos retiros históricos creados: ${retirosCount}`);
    }

    // Clean scratch check
    if (fs.existsSync('scratch_check.ts')) {
      fs.unlinkSync('scratch_check.ts');
    }

    console.log('✅ Migración de datos históricos completada exitosamente.');
  }
}

seed()
  .catch((e) => {
    console.error('Error durante la carga:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
