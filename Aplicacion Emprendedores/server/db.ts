import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export async function initConfig() {
  const config = await prisma.configuracion.findFirst();
  if (!config) {
    await prisma.configuracion.create({
      data: {
        id: 'config_default',
        localCodigo: 'LOCAL_01',
        localNombre: 'Tienda Creativa - Estaciones',
        permitirStockNegativo: false,
        porcentajeRetencionDefecto: 0.0,
        turnoActual: 'MANANA',
      },
    });
  }
}
