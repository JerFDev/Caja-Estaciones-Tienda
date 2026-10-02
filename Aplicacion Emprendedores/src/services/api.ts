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

  async confirmImport(datosNuevos: any, nombreArchivo: string): Promise<any> {
    const res = await fetch(`${API_BASE}/import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datosNuevos, nombreArchivo }),
    });
    return handleResponse<any>(res);
  },
};
