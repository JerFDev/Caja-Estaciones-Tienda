import {
  Configuracion,
  Emprendimiento,
  Producto,
  MovimientoStock,
  Venta,
  Retiro,
  SaldoEmprendimiento,
  DashboardStats,
  ImportPreviewResult,
  SesionCaja,
  SesionCajaActualInfo,
  AperturaCajaDto,
  CierreCajaDto,
  DailySalesStats,
  Convocatoria,
  Postulacion,
  Colectivo,
  LocalMunicipal,
  Edicion,
  ParticipacionEdicion,
  Fiscalizacion,
  Capacitacion,
  ReunionMunicipal,
  PresenciaDigital,
  ServicioMunicipal,
  EmprendimientoServicio,
  SeguimientoMunicipal,
  AuditoriaMunicipalLog,
  ExpedienteMunicipal,
  DashboardMunicipalStats,
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Ocurrió un error en la solicitud.');
  }
  return res.json();
}

export const api = {
  // Configuración
  async getConfig(): Promise<Configuracion> {
    const res = await fetch(`${API_BASE}/config`);
    return handleResponse<Configuracion>(res);
  },

  async updateConfig(data: Partial<Configuracion>): Promise<Configuracion> {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Configuracion>(res);
  },

  // Emprendimientos
  async getEntrepreneurs(inactivos = false): Promise<Emprendimiento[]> {
    const res = await fetch(`${API_BASE}/entrepreneurs?inactivos=${inactivos}`);
    return handleResponse<Emprendimiento[]>(res);
  },

  async getEntrepreneurById(id: string): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/entrepreneurs/${id}`);
    return handleResponse<Emprendimiento>(res);
  },

  async createEntrepreneur(data: Partial<Emprendimiento>): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/entrepreneurs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Emprendimiento>(res);
  },

  async updateEntrepreneur(id: string, data: Partial<Emprendimiento>): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/entrepreneurs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Emprendimiento>(res);
  },

  async toggleEntrepreneurActive(id: string): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/entrepreneurs/${id}/toggle`, {
      method: 'PATCH',
    });
    return handleResponse<Emprendimiento>(res);
  },

  // Productos
  async getProducts(filtros?: {
    emprendimientoId?: string;
    search?: string;
    inactivos?: boolean;
  }): Promise<Producto[]> {
    const params = new URLSearchParams();
    if (filtros?.emprendimientoId) params.append('emprendimientoId', filtros.emprendimientoId);
    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.inactivos) params.append('inactivos', 'true');
    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    return handleResponse<Producto[]>(res);
  },

  async getProductByCode(code: string): Promise<Producto> {
    const res = await fetch(`${API_BASE}/products/code/${encodeURIComponent(code)}`);
    return handleResponse<Producto>(res);
  },

  async getNextProductCode(emprendimientoId: string): Promise<{ nextCode: string }> {
    const res = await fetch(`${API_BASE}/products/next-code/${emprendimientoId}`);
    return handleResponse<{ nextCode: string }>(res);
  },

  async createProduct(data: {
    codigo?: string;
    emprendimientoId: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    stockMinimoAlerta?: number;
    stockInicial?: number;
  }): Promise<Producto> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Producto>(res);
  },

  async updateProduct(id: string, data: Partial<Producto>): Promise<Producto> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Producto>(res);
  },

  async toggleProductActive(id: string): Promise<Producto> {
    const res = await fetch(`${API_BASE}/products/${id}/toggle`, {
      method: 'PATCH',
    });
    return handleResponse<Producto>(res);
  },

  // Stock
  async getStockMovements(filtros?: {
    productoId?: string;
    emprendimientoId?: string;
    tipoMovimiento?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<MovimientoStock[]> {
    const params = new URLSearchParams();
    if (filtros?.productoId) params.append('productoId', filtros.productoId);
    if (filtros?.emprendimientoId) params.append('emprendimientoId', filtros.emprendimientoId);
    if (filtros?.tipoMovimiento) params.append('tipoMovimiento', filtros.tipoMovimiento);
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    const res = await fetch(`${API_BASE}/stock/movements?${params.toString()}`);
    return handleResponse<MovimientoStock[]>(res);
  },

  async createStockMovement(data: {
    productoId: string;
    cantidad: number;
    tipoMovimiento: 'INGRESO' | 'AJUSTE' | 'DEVOLUCION' | 'BAJA';
    observaciones?: string;
    fecha?: string;
  }): Promise<MovimientoStock> {
    const res = await fetch(`${API_BASE}/stock/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<MovimientoStock>(res);
  },

  async getLowStock(): Promise<Producto[]> {
    const res = await fetch(`${API_BASE}/stock/low`);
    return handleResponse<Producto[]>(res);
  },

  // Ventas
  async getSales(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    emprendimientoId?: string;
    metodoPago?: string;
    tipoCliente?: string;
    turno?: string;
    estado?: string;
    search?: string;
  }): Promise<Venta[]> {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.emprendimientoId) params.append('emprendimientoId', filtros.emprendimientoId);
    if (filtros?.metodoPago) params.append('metodoPago', filtros.metodoPago);
    if (filtros?.tipoCliente) params.append('tipoCliente', filtros.tipoCliente);
    if (filtros?.turno) params.append('turno', filtros.turno);
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.search) params.append('search', filtros.search);
    const res = await fetch(`${API_BASE}/sales?${params.toString()}`);
    return handleResponse<Venta[]>(res);
  },

  async createSale(data: {
    productoCodigo?: string;
    productoId?: string;
    cantidad: number;
    descuento?: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    tipoCliente: 'TURISTA' | 'RESIDENTE';
    turno?: 'MANANA' | 'TARDE';
    observaciones?: string;
  }): Promise<Venta> {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Venta>(res);
  },

  async voidSale(id: string, motivo: string): Promise<Venta> {
    const res = await fetch(`${API_BASE}/sales/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });
    return handleResponse<Venta>(res);
  },

  // Sesión y Arqueo de Caja
  async getCashRegisterCurrentSession(): Promise<SesionCajaActualInfo> {
    const res = await fetch(`${API_BASE}/caja/sesion-actual`);
    return handleResponse<SesionCajaActualInfo>(res);
  },

  async openCashRegister(data: AperturaCajaDto): Promise<SesionCaja> {
    const res = await fetch(`${API_BASE}/caja/abrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<SesionCaja>(res);
  },

  async closeCashRegister(data: CierreCajaDto): Promise<SesionCaja> {
    const res = await fetch(`${API_BASE}/caja/cerrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<SesionCaja>(res);
  },

  async closeAnyOpenRegister(usuario?: string): Promise<{ success: boolean; cerradas: number }> {
    const res = await fetch(`${API_BASE}/caja/cerrar-abiertas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario }),
    });
    return handleResponse<{ success: boolean; cerradas: number }>(res);
  },

  async getDailySalesStats(fecha?: string): Promise<DailySalesStats> {
    const url = fecha ? `${API_BASE}/caja/ventas-dia?fecha=${encodeURIComponent(fecha)}` : `${API_BASE}/caja/ventas-dia`;
    const res = await fetch(url);
    return handleResponse<DailySalesStats>(res);
  },

  async getCashRegisterHistory(): Promise<SesionCaja[]> {
    const res = await fetch(`${API_BASE}/caja/historial`);
    return handleResponse<SesionCaja[]>(res);
  },

  // Retiros
  async getWithdrawals(filtros?: {
    emprendimientoId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
  }): Promise<Retiro[]> {
    const params = new URLSearchParams();
    if (filtros?.emprendimientoId) params.append('emprendimientoId', filtros.emprendimientoId);
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.estado) params.append('estado', filtros.estado);
    const res = await fetch(`${API_BASE}/withdrawals?${params.toString()}`);
    return handleResponse<Retiro[]>(res);
  },

  async createWithdrawal(data: {
    emprendimientoId: string;
    monto: number;
    observaciones?: string;
    permitirExcedente?: boolean;
  }): Promise<Retiro> {
    const res = await fetch(`${API_BASE}/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Retiro>(res);
  },

  async voidWithdrawal(id: string, motivo: string): Promise<Retiro> {
    const res = await fetch(`${API_BASE}/withdrawals/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });
    return handleResponse<Retiro>(res);
  },

  // Saldos
  async getBalances(inactivos = false): Promise<SaldoEmprendimiento[]> {
    const res = await fetch(`${API_BASE}/balances?inactivos=${inactivos}`);
    return handleResponse<SaldoEmprendimiento[]>(res);
  },

  async getBalanceById(id: string): Promise<SaldoEmprendimiento> {
    const res = await fetch(`${API_BASE}/balances/${id}`);
    return handleResponse<SaldoEmprendimiento>(res);
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/statistics/dashboard`);
    return handleResponse<DashboardStats>(res);
  },

  // Exportación
  getExportExcelUrl(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    emprendimientoId?: string;
    tipo?: string;
  }): string {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.emprendimientoId) params.append('emprendimientoId', filtros.emprendimientoId);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    return `${API_BASE}/export/excel?${params.toString()}`;
  },

  getExportJsonUrl(): string {
    return `${API_BASE}/export/json`;
  },

  getExportSyncJsonUrl(): string {
    return `${API_BASE}/export/sync-json`;
  },

  // Importación
  async previewImport(file: File): Promise<ImportPreviewResult> {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await fetch(`${API_BASE}/import/preview`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ImportPreviewResult>(res);
  },

  async confirmImport(
    datosNuevos: any,
    nombreArchivo: string,
    archivoHash?: string,
    sourceId?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datosNuevos, nombreArchivo, archivoHash, sourceId }),
    });
    return handleResponse<any>(res);
  },

  async clearAllData(): Promise<{
    ventasEliminadas: number;
    retirosEliminados: number;
    movimientosStockEliminados: number;
    productosEliminados: number;
    emprendimientosEliminados: number;
    sesionesCajaEliminadas: number;
  }> {
    const res = await fetch(`${API_BASE}/data`, { method: "DELETE" });
    return handleResponse(res);
  },

  // ==========================================
  // --- MÓDULO DE GESTIÓN MUNICIPAL ---
  // ==========================================

  async getMunicipalDashboard(): Promise<DashboardMunicipalStats> {
    const res = await fetch(`${API_BASE}/municipal/dashboard`);
    return handleResponse<DashboardMunicipalStats>(res);
  },

  async getMunicipalAuditLogs(filtros?: { entidad?: string; entidadId?: string; limit?: number }): Promise<AuditoriaMunicipalLog[]> {
    const params = new URLSearchParams();
    if (filtros?.entidad) params.append("entidad", filtros.entidad);
    if (filtros?.entidadId) params.append("entidadId", filtros.entidadId);
    if (filtros?.limit) params.append("limit", filtros.limit.toString());
    const res = await fetch(`${API_BASE}/municipal/auditoria?${params.toString()}`);
    return handleResponse<AuditoriaMunicipalLog[]>(res);
  },

  async getMunicipalEntrepreneurs(filtros?: { search?: string; estado?: string }): Promise<Emprendimiento[]> {
    const params = new URLSearchParams();
    if (filtros?.search) params.append("search", filtros.search);
    if (filtros?.estado) params.append("estado", filtros.estado);
    const res = await fetch(`${API_BASE}/municipal/emprendimientos?${params.toString()}`);
    return handleResponse<Emprendimiento[]>(res);
  },

  async getMunicipalEntrepreneurById(id: string): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/municipal/emprendimientos/${id}`);
    return handleResponse<Emprendimiento>(res);
  },

  async getMunicipalExpediente(id: string): Promise<ExpedienteMunicipal> {
    const res = await fetch(`${API_BASE}/municipal/emprendimientos/${id}/expediente`);
    return handleResponse<ExpedienteMunicipal>(res);
  },

  async createMunicipalEntrepreneur(data: any): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/municipal/emprendimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Emprendimiento>(res);
  },

  async updateMunicipalEntrepreneur(id: string, data: any): Promise<Emprendimiento> {
    const res = await fetch(`${API_BASE}/municipal/emprendimientos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Emprendimiento>(res);
  },

  // Convocatorias
  async getConvocatorias(todas = true): Promise<Convocatoria[]> {
    const res = await fetch(`${API_BASE}/municipal/convocatorias?todas=${todas}`);
    return handleResponse<Convocatoria[]>(res);
  },

  async getConvocatoriaById(id: string): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE}/municipal/convocatorias/${id}`);
    return handleResponse<Convocatoria>(res);
  },

  async createConvocatoria(data: any): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE}/municipal/convocatorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Convocatoria>(res);
  },

  async updateConvocatoria(id: string, data: any): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE}/municipal/convocatorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Convocatoria>(res);
  },

  // Postulaciones
  async getPostulaciones(filtros?: { convocatoriaId?: string; emprendimientoId?: string; estado?: string }): Promise<Postulacion[]> {
    const params = new URLSearchParams();
    if (filtros?.convocatoriaId) params.append("convocatoriaId", filtros.convocatoriaId);
    if (filtros?.emprendimientoId) params.append("emprendimientoId", filtros.emprendimientoId);
    if (filtros?.estado) params.append("estado", filtros.estado);
    const res = await fetch(`${API_BASE}/municipal/postulaciones?${params.toString()}`);
    return handleResponse<Postulacion[]>(res);
  },

  async createPostulacion(data: { convocatoriaId: string; emprendimientoId: string; observaciones?: string }): Promise<Postulacion> {
    const res = await fetch(`${API_BASE}/municipal/postulaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Postulacion>(res);
  },

  async updatePostulacionEstado(id: string, data: { estado: string; evaluacion?: string; observaciones?: string }): Promise<Postulacion> {
    const res = await fetch(`${API_BASE}/municipal/postulaciones/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Postulacion>(res);
  },

  // Colectivos
  async getColectivos(): Promise<Colectivo[]> {
    const res = await fetch(`${API_BASE}/municipal/colectivos`);
    return handleResponse<Colectivo[]>(res);
  },

  async getColectivoById(id: string): Promise<Colectivo> {
    const res = await fetch(`${API_BASE}/municipal/colectivos/${id}`);
    return handleResponse<Colectivo>(res);
  },

  async createColectivo(data: any): Promise<Colectivo> {
    const res = await fetch(`${API_BASE}/municipal/colectivos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Colectivo>(res);
  },

  async updateColectivo(id: string, data: any): Promise<Colectivo> {
    const res = await fetch(`${API_BASE}/municipal/colectivos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Colectivo>(res);
  },

  async addMiembroColectivo(colectivoId: string, data: { emprendimientoId: string; observaciones?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/municipal/colectivos/${colectivoId}/miembros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async removeMiembroColectivo(membresiaId: string, motivo?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/municipal/colectivos/miembros/${membresiaId}/baja`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    return handleResponse<any>(res);
  },

  // Locales
  async getLocales(): Promise<LocalMunicipal[]> {
    const res = await fetch(`${API_BASE}/municipal/locales`);
    return handleResponse<LocalMunicipal[]>(res);
  },

  async createLocal(data: any): Promise<LocalMunicipal> {
    const res = await fetch(`${API_BASE}/municipal/locales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<LocalMunicipal>(res);
  },

  async updateLocal(id: string, data: any): Promise<LocalMunicipal> {
    const res = await fetch(`${API_BASE}/municipal/locales/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<LocalMunicipal>(res);
  },

  // Ediciones
  async getEdiciones(): Promise<Edicion[]> {
    const res = await fetch(`${API_BASE}/municipal/ediciones`);
    return handleResponse<Edicion[]>(res);
  },

  async getEdicionById(id: string): Promise<Edicion> {
    const res = await fetch(`${API_BASE}/municipal/ediciones/${id}`);
    return handleResponse<Edicion>(res);
  },

  async createEdicion(data: any): Promise<Edicion> {
    const res = await fetch(`${API_BASE}/municipal/ediciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Edicion>(res);
  },

  async updateEdicion(id: string, data: any): Promise<Edicion> {
    const res = await fetch(`${API_BASE}/municipal/ediciones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Edicion>(res);
  },

  async createParticipacion(data: any): Promise<ParticipacionEdicion> {
    const res = await fetch(`${API_BASE}/municipal/participaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ParticipacionEdicion>(res);
  },

  async updateParticipacionEstado(id: string, data: { estado: string; observaciones?: string }): Promise<ParticipacionEdicion> {
    const res = await fetch(`${API_BASE}/municipal/participaciones/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ParticipacionEdicion>(res);
  },

  // Fiscalizaciones
  async getFiscalizaciones(filtros?: { emprendimientoId?: string; resultado?: string }): Promise<Fiscalizacion[]> {
    const params = new URLSearchParams();
    if (filtros?.emprendimientoId) params.append("emprendimientoId", filtros.emprendimientoId);
    if (filtros?.resultado) params.append("resultado", filtros.resultado);
    const res = await fetch(`${API_BASE}/municipal/fiscalizaciones?${params.toString()}`);
    return handleResponse<Fiscalizacion[]>(res);
  },

  async createFiscalizacion(data: any): Promise<Fiscalizacion> {
    const res = await fetch(`${API_BASE}/municipal/fiscalizaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Fiscalizacion>(res);
  },

  // Capacitaciones
  async getCapacitaciones(): Promise<Capacitacion[]> {
    const res = await fetch(`${API_BASE}/municipal/capacitaciones`);
    return handleResponse<Capacitacion[]>(res);
  },

  async createCapacitacion(data: any): Promise<Capacitacion> {
    const res = await fetch(`${API_BASE}/municipal/capacitaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Capacitacion>(res);
  },

  async addParticipanteCapacitacion(capacitacionId: string, data: { emprendimientoId: string; observaciones?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/municipal/capacitaciones/${capacitacionId}/participantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Reuniones
  async getReuniones(filtros?: { emprendimientoId?: string }): Promise<ReunionMunicipal[]> {
    const params = new URLSearchParams();
    if (filtros?.emprendimientoId) params.append("emprendimientoId", filtros.emprendimientoId);
    const res = await fetch(`${API_BASE}/municipal/reuniones?${params.toString()}`);
    return handleResponse<ReunionMunicipal[]>(res);
  },

  async createReunion(data: any): Promise<ReunionMunicipal> {
    const res = await fetch(`${API_BASE}/municipal/reuniones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ReunionMunicipal>(res);
  },

  // Presencia Digital & Redes Sociales
  async getRedesSociales(filtros?: { canal?: string; search?: string }): Promise<PresenciaDigital[]> {
    const params = new URLSearchParams();
    if (filtros?.canal) params.append("canal", filtros.canal);
    if (filtros?.search) params.append("search", filtros.search);
    const res = await fetch(`${API_BASE}/municipal/redes-sociales?${params.toString()}`);
    return handleResponse<PresenciaDigital[]>(res);
  },

  async getPresenciaDigital(emprendimientoId: string): Promise<PresenciaDigital[]> {
    const res = await fetch(`${API_BASE}/municipal/emprendimientos/${emprendimientoId}/presencia-digital`);
    return handleResponse<PresenciaDigital[]>(res);
  },

  async upsertPresenciaDigital(data: any): Promise<PresenciaDigital> {
    const res = await fetch(`${API_BASE}/municipal/presencia-digital`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<PresenciaDigital>(res);
  },

  async updatePresenciaDigital(id: string, data: any): Promise<PresenciaDigital> {
    const res = await fetch(`${API_BASE}/municipal/presencia-digital/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<PresenciaDigital>(res);
  },

  async updateSeguidores(id: string, seguidores: number): Promise<PresenciaDigital> {
    const res = await fetch(`${API_BASE}/municipal/presencia-digital/${id}/seguidores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seguidores }),
    });
    return handleResponse<PresenciaDigital>(res);
  },

  async deletePresenciaDigital(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/municipal/presencia-digital/${id}`, {
      method: "DELETE",
    });
    return handleResponse<any>(res);
  },

  // Servicios Municipales
  async getServiciosMunicipales(): Promise<ServicioMunicipal[]> {
    const res = await fetch(`${API_BASE}/municipal/servicios`);
    return handleResponse<ServicioMunicipal[]>(res);
  },

  async createServicioMunicipal(data: any): Promise<ServicioMunicipal> {
    const res = await fetch(`${API_BASE}/municipal/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ServicioMunicipal>(res);
  },

  async getServiciosOtorgados(filtros?: { emprendimientoId?: string }): Promise<EmprendimientoServicio[]> {
    const params = new URLSearchParams();
    if (filtros?.emprendimientoId) params.append("emprendimientoId", filtros.emprendimientoId);
    const res = await fetch(`${API_BASE}/municipal/servicios-otorgados?${params.toString()}`);
    return handleResponse<EmprendimientoServicio[]>(res);
  },

  async otorgarServicio(data: any): Promise<EmprendimientoServicio> {
    const res = await fetch(`${API_BASE}/municipal/servicios-otorgados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<EmprendimientoServicio>(res);
  },

  // Seguimientos
  async getSeguimientos(filtros?: { emprendimientoId?: string; pendientes?: boolean }): Promise<SeguimientoMunicipal[]> {
    const params = new URLSearchParams();
    if (filtros?.emprendimientoId) params.append("emprendimientoId", filtros.emprendimientoId);
    if (filtros?.pendientes) params.append("pendientes", "true");
    const res = await fetch(`${API_BASE}/municipal/seguimientos?${params.toString()}`);
    return handleResponse<SeguimientoMunicipal[]>(res);
  },

  async createSeguimiento(data: any): Promise<SeguimientoMunicipal> {
    const res = await fetch(`${API_BASE}/municipal/seguimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SeguimientoMunicipal>(res);
  },
};
