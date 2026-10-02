export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';
export type TipoCliente = 'TURISTA' | 'RESIDENTE';
export type Turno = 'MANANA' | 'TARDE';
export type TipoMovimientoStock = 'INGRESO' | 'AJUSTE' | 'DEVOLUCION' | 'BAJA';
export type EstadoRegistro = 'ACTIVO' | 'ANULADO';

export interface Configuracion {
  id: string;
  localCodigo: string;
  localNombre: string;
  permitirStockNegativo: boolean;
  porcentajeRetencionDefecto: number;
  turnoActual: Turno;
  fechaActualizacion?: string;
}

export interface Emprendimiento {
  id: string;
  codigo: string; // ej: "AKM", "TDE"
  nombre: string;
  responsable: string;
  telefono?: string | null;
  direccion?: string | null;
  alias?: string | null;
  cvu?: string | null;
  mail?: string | null;
  rubro?: string | null;
  porcentajeRetencion: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  _count?: {
    productos?: number;
    ventas?: number;
    retiros?: number;
  };
}

export interface Producto {
  id: string;
  codigo: string; // ej: "AKM001"
  emprendimientoId: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  activo: boolean;
  stockMinimoAlerta: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  emprendimiento?: Emprendimiento;
  stockCalculado?: number; // Stock actual computado: ingresos - ventas + ajustes
}

export interface MovimientoStock {
  id: string;
  operacionUuid: string;
  productoId: string;
  cantidad: number;
  tipoMovimiento: TipoMovimientoStock;
  fecha: string;
  observaciones?: string | null;
  usuario?: string | null;
  fechaCreacion?: string;
  producto?: Producto;
}

export interface Venta {
  id: string;
  identificadorUnico: string;
  fecha: string;
  hora: string;
  turno: Turno;
  productoId: string;
  emprendimientoId: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  total: number;
  metodoPago: MetodoPago;
  tipoCliente: TipoCliente;
  localOrigen: string;
  usuario?: string | null;
  estado: EstadoRegistro;
  motivoAnulacion?: string | null;
  observaciones?: string | null;
  fechaCreacion?: string;
  producto?: Producto;
  emprendimiento?: Emprendimiento;
}

export interface Retiro {
  id: string;
  identificadorUnico: string;
  emprendimientoId: string;
  fecha: string;
  monto: number;
  observaciones?: string | null;
  usuario?: string | null;
  estado: EstadoRegistro;
  motivoAnulacion?: string | null;
  localOrigen: string;
  fechaCreacion?: string;
  emprendimiento?: Emprendimiento;
}

export interface SaldoEmprendimiento {
  id: string;
  codigo: string;
  nombre: string;
  responsable: string;
  rubro?: string | null;
  porcentajeRetencion: number;
  ventasTotales: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  cantidadVentas: number;
  unidadesVendidas: number;
  totalRetiros: number;
  montoRetencion: number;
  saldoEfectivoDisponible: number; // ventasEfectivo - totalRetiros - montoRetencion
  unidadesIngresadas: number;
  stockActual: number;
}

export interface DashboardStats {
  ventasHoy: number;
  montoHoy: number;
  ventasMes: number;
  montoMes: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  unidadesVendidasTotal: number;
  emprendimientosActivos: number;
  productosActivos: number;
  efectivoCajaChica: number;
  totalRetirado: number;
  productosBajoStock: Array<{
    id: string;
    codigo: string;
    nombre: string;
    emprendimientoCodigo: string;
    emprendimientoNombre: string;
    stock: number;
    stockMinimo: number;
  }>;
  ultimasVentas: Venta[];
  ingresosStockHoy: number;
  retirosHoy: number;
  ultimosMovimientosStock?: MovimientoStock[];
  ultimosRetiros?: Retiro[];
  ventasPorTurno: {
    manana: { cantidad: number; total: number };
    tarde: { cantidad: number; total: number };
  };
  ventasPorTipoCliente: {
    residentes: { cantidad: number; total: number };
    turistas: { cantidad: number; total: number };
  };
}

export interface ImportPreviewResult {
  valido: boolean;
  mensaje: string;
  resumen: {
    totalEncontradas: number;
    nuevas: number;
    duplicadas: number;
    errores: number;
  };
  detallesErrores: string[];
  datosNuevos?: {
    ventas: any[];
    retiros: any[];
    movimientosStock: any[];
    emprendimientosNuevos: any[];
    productosNuevos: any[];
  };
}

export interface SesionCaja {
  id: string;
  montoInicial: number;
  fechaApertura: string | Date;
  fechaCierre?: string | Date | null;
  turno: Turno;
  usuarioApertura?: string | null;
  usuarioCierre?: string | null;
  estado: 'ABIERTA' | 'CERRADA';
  montoVentasEfectivo?: number | null;
  montoVentasTransferencia?: number | null;
  montoRetiros?: number | null;
  montoEsperadoEfectivo?: number | null;
  montoRealContado?: number | null;
  diferencia?: number | null;
  observaciones?: string | null;
  fechaCreacion?: string | Date;
}

export interface SesionCajaActualInfo {
  abierta: boolean;
  sesion: SesionCaja | null;
  totalesEnVivo?: {
    ventasEfectivo: number;
    ventasTransferencia: number;
    totalVentas: number;
    cantidadVentas: number;
    totalRetiros: number;
    montoEsperadoEfectivo: number;
  };
}

export interface AperturaCajaDto {
  montoInicial: number;
  turno?: Turno;
  usuario?: string;
  observaciones?: string;
}

export interface CierreCajaDto {
  montoRealContado: number;
  usuario?: string;
  observaciones?: string;
}

export interface DailySalesStats {
  fecha: string;
  totalVentas: number;
  totalEfectivo: number;
  totalTransferencia: number;
  cantidadVentas: number;
  unidadesVendidas: number;
  ventasPorEmprendimiento: Array<{
    emprendimientoId: string;
    codigo: string;
    nombre: string;
    responsable: string;
    total: number;
    cantidadVentas: number;
    unidades: number;
    efectivo: number;
    transferencia: number;
  }>;
  ventasPorTurno: {
    manana: { cantidad: number; total: number; unidades: number };
    tarde: { cantidad: number; total: number; unidades: number };
  };
  ventasPorTipoCliente: {
    residentes: { cantidad: number; total: number };
    turistas: { cantidad: number; total: number };
  };
  listadoVentas: Venta[];
}

export type UserRole = 'ADMIN' | 'EMPRENDEDOR';

export interface UserSession {
  username: string;
  nombre: string;
  role: UserRole;
}

