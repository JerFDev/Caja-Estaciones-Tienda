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

export type EstadoEmprendimiento = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'FINALIZADO';

export interface Emprendimiento {
  id: string;
  codigo: string; // ej: "AKM", "TDE", "EMP-025" (Código oficial municipal)
  nombre: string;
  nombreFantasia?: string | null;
  responsable: string;
  documento?: string | null;
  cuit?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  alias?: string | null;
  cvu?: string | null;
  cbu?: string | null;
  mail?: string | null;
  rubro?: string | null;
  descripcion?: string | null;
  porcentajeRetencion: number;
  activo: boolean;
  estado?: EstadoEmprendimiento | string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  colectivos?: any[];
  presenciaDigital?: any[];
  _count?: {
    productos?: number;
    ventas?: number;
    retiros?: number;
    postulaciones?: number;
    colectivos?: number;
    participaciones?: number;
    fiscalizaciones?: number;
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
  tipoArchivo?: 'JSON_SYNC' | 'EXCEL';
  nombreArchivo?: string;
  archivoHash?: string;
  yaImportado?: boolean;
  importacionPreviaInfo?: {
    fecha: string | Date;
    nombreArchivo: string;
    sourceId?: string | null;
  } | null;
  sourceId?: string;
  sourceName?: string;
  exportedAt?: string;
  resumen: {
    totalEncontradas: number;
    nuevas: number;
    duplicadas: number;
    errores: number;
    emprendimientosNuevos?: number;
    emprendimientosActualizados?: number;
    productosNuevos?: number;
    productosActualizados?: number;
    productosConflictos?: number;
    ventasNuevas?: number;
    ventasDuplicadas?: number;
    movimientosNuevos?: number;
    movimientosDuplicados?: number;
    retirosNuevos?: number;
    retirosDuplicados?: number;
    sesionesNuevas?: number;
    sesionesDuplicadas?: number;
  };
  detallesErrores: string[];
  detallesConflictos?: string[];
  datosNuevos?: {
    emprendimientos?: any[];
    emprendimientosActualizar?: any[];
    productos?: any[];
    productosActualizar?: any[];
    ventas?: any[];
    retiros?: any[];
    movimientosStock?: any[];
    sesionesCaja?: any[];
    archivoHash?: string;
    sourceId?: string;
  };
}

export interface SesionCaja {
  id: string;
  identificadorUnico?: string | null;
  localOrigen?: string;
  montoInicial: number;
  fechaApertura: string | Date;
  fechaCierre?: string | Date | null;
  turno: Turno;
  encargado1Id?: string | null;
  encargado2Id?: string | null;
  encargadosTexto?: string | null;
  encargado1?: Emprendimiento | null;
  encargado2?: Emprendimiento | null;
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
  ultimoFondoCierre?: number;
}

export interface AperturaCajaDto {
  montoInicial: number;
  turno?: Turno;
  encargado1Id?: string;
  encargado2Id?: string;
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

// ==========================================
// --- INTERFACES DE GESTIÓN MUNICIPAL ---
// ==========================================

export interface Convocatoria {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  estado: 'BORRADOR' | 'ABIERTA' | 'CERRADA' | 'FINALIZADA' | 'CANCELADA' | string;
  requisitos?: string | null;
  observaciones?: string | null;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  postulaciones?: Postulacion[];
  _count?: { postulaciones: number };
}

export interface Postulacion {
  id: string;
  convocatoriaId: string;
  emprendimientoId: string;
  fecha: string;
  estado: 'PENDIENTE' | 'EN_EVALUACION' | 'APROBADA' | 'RECHAZADA' | 'DESISTIDA' | string;
  observaciones?: string | null;
  evaluacion?: string | null;
  usuarioResponsable?: string | null;
  fechaResolucion?: string | null;
  convocatoria?: Convocatoria;
  emprendimiento?: Emprendimiento;
}

export interface Colectivo {
  id: string;
  nombre: string;
  descripcion?: string | null;
  orientacion?: string | null;
  imagen?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  emprendimientos?: EmprendimientoColectivo[];
  _count?: { emprendimientos: number };
}

export interface EmprendimientoColectivo {
  id: string;
  emprendimientoId: string;
  colectivoId: string;
  fechaIngreso: string;
  fechaSalida?: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'FINALIZADO' | string;
  observaciones?: string | null;
  colectivo?: Colectivo;
  emprendimiento?: Emprendimiento;
}

export interface LocalMunicipal {
  id: string;
  codigo: string;
  nombre: string;
  direccion?: string | null;
  descripcion?: string | null;
  capacidad?: number;
  activo: boolean;
  _count?: { participaciones: number };
}

export interface Edicion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  estado: 'PLANIFICADA' | 'ABIERTA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA' | string;
  observaciones?: string | null;
  locales?: Array<{ id: string; local: LocalMunicipal }>;
  participaciones?: ParticipacionEdicion[];
  _count?: { participaciones: number; locales: number };
}

export interface ParticipacionEdicion {
  id: string;
  edicionId: string;
  emprendimientoId: string;
  localId?: string | null;
  colectivoId?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  estado: 'CONFIRMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA' | string;
  observaciones?: string | null;
  edicion?: Edicion;
  emprendimiento?: Emprendimiento;
  local?: LocalMunicipal | null;
  colectivo?: Colectivo | null;
}

export interface Fiscalizacion {
  id: string;
  emprendimientoId: string;
  productoId?: string | null;
  fecha: string;
  usuario: string;
  resultado: 'PENDIENTE' | 'APROBADA' | 'OBSERVADA' | 'RECHAZADA' | 'REQUIERE_CORRECCION' | string;
  observaciones?: string | null;
  motivo?: string | null;
  emprendimiento?: Emprendimiento;
  producto?: Producto | null;
}

export interface Capacitacion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fecha: string;
  duracion?: string | null;
  lugar?: string | null;
  responsable?: string | null;
  estado: 'PLANIFICADA' | 'EN_CURSO' | 'REALIZADA' | 'CANCELADA' | string;
  observaciones?: string | null;
  participantes?: Array<{
    id: string;
    emprendimientoId: string;
    asistencia: boolean;
    estado: string;
    observaciones?: string | null;
    emprendimiento: Emprendimiento;
  }>;
  _count?: { participantes: number };
}

export interface ReunionMunicipal {
  id: string;
  emprendimientoId: string;
  fecha: string;
  responsable: string;
  tema: string;
  acuerdos?: string | null;
  observaciones?: string | null;
  estado: string;
  emprendimiento?: Emprendimiento;
}

export interface PresenciaDigital {
  id: string;
  emprendimientoId: string;
  canal: string;
  url: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'EN_REVISION' | string;
  fechaRevision?: string | null;
  observaciones?: string | null;
}

export interface ServicioMunicipal {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  _count?: { participaciones: number };
}

export interface EmprendimientoServicio {
  id: string;
  servicioMunicipalId: string;
  emprendimientoId: string;
  fecha: string;
  estado: 'SOLICITADO' | 'EN_TRAMITE' | 'OTORGADO' | 'FINALIZADO' | 'RECHAZADO' | string;
  responsable?: string | null;
  observaciones?: string | null;
  servicio?: ServicioMunicipal;
  emprendimiento?: Emprendimiento;
}

export interface SeguimientoMunicipal {
  id: string;
  emprendimientoId: string;
  fecha: string;
  tipo: string;
  responsable: string;
  motivo: string;
  observacion: string;
  proximoContacto?: string | null;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO' | string;
  emprendimiento?: Emprendimiento;
}

export interface AuditoriaMunicipalLog {
  id: string;
  entidad: string;
  entidadId: string;
  accion: string;
  usuario: string;
  datosAnteriores?: string | null;
  datosNuevos?: string | null;
  detallesJson?: string | null;
  fecha: string;
}

export interface HitoExpediente {
  id: string;
  fecha: string;
  tipo: 'ALTA' | 'COLECTIVO' | 'POSTULACION' | 'EDICION' | 'FISCALIZACION' | 'CAPACITACION' | 'REUNION' | 'SERVICIO' | 'SEGUIMIENTO' | 'ESTADO';
  titulo: string;
  descripcion: string;
  estado?: string;
  badge?: string;
}

export interface ExpedienteMunicipal {
  emprendimiento: Emprendimiento;
  resumenComercial: {
    totalVentas: number;
    montoTotalFacturado: number;
    totalRetirado: number;
  };
  lineaDeTiempo: HitoExpediente[];
}

export interface DashboardMunicipalStats {
  emprendimientos: {
    total: number;
    activos: number;
    inactivos: number;
  };
  convocatorias: {
    total: number;
    abiertas: number;
  };
  postulaciones: {
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    total: number;
  };
  colectivos: {
    total: number;
  };
  ediciones: {
    total: number;
    enCurso: number;
  };
  locales: {
    total: number;
  };
  fiscalizaciones: {
    aprobadas: number;
    observadas: number;
    rechazadas: number;
    total: number;
  };
  capacitaciones: {
    total: number;
  };
  seguimientos: {
    pendientes: number;
  };
  ultimasPostulaciones: any[];
  ultimosSeguimientos: any[];
}


