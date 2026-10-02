import React from 'react';
import { Filter, RotateCcw, Calendar, Building2, Package, Tag } from 'lucide-react';
import { Emprendimiento, Producto } from '../../types';

export interface DashboardFilterState {
  year: string; // 'TODOS' | '2026' | '2025' ...
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  ventureId: string; // 'TODOS' | id
  productId: string; // 'TODOS' | id
}

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  onChange: (updated: DashboardFilterState) => void;
  onReset: () => void;
  availableYears: number[];
  ventures: Emprendimiento[];
  products: Producto[];
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  onChange,
  onReset,
  availableYears,
  ventures,
  products,
}) => {
  // Count active filters
  let activeCount = 0;
  if (filters.year !== 'TODOS') activeCount++;
  if (filters.dateFrom) activeCount++;
  if (filters.dateTo) activeCount++;
  if (filters.ventureId !== 'TODOS') activeCount++;
  if (filters.productId !== 'TODOS') activeCount++;

  // Filter products by selected venture if any
  const filteredProducts = filters.ventureId !== 'TODOS'
    ? products.filter((p) => p.emprendimientoId === filters.ventureId)
    : products;

  const handleYearChange = (yr: string) => {
    // If selecting a specific year, we can clear the custom dates or keep them
    onChange({
      ...filters,
      year: yr,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Filtros de Análisis
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Segmenta los datos por período, emprendimiento y producto
            </p>
          </div>
          {activeCount > 0 && (
            <span className="ml-2 bg-orange-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
              {activeCount} activo{activeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-orange-200 transition-colors cursor-pointer self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {/* Filtro: Año */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 mb-1 flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Año</span>
          </label>
          <select
            value={filters.year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="TODOS">Todos los años</option>
            {availableYears.map((yr) => (
              <option key={yr} value={String(yr)}>
                Año {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Fecha Desde */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
            Fecha Desde
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          />
        </div>

        {/* Filtro: Fecha Hasta */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          />
        </div>

        {/* Filtro: Emprendimiento */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 mb-1 flex items-center space-x-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>Emprendimiento</span>
          </label>
          <select
            value={filters.ventureId}
            onChange={(e) =>
              onChange({
                ...filters,
                ventureId: e.target.value,
                productId: 'TODOS', // Reset product if venture changes
              })
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="TODOS">Todos los emprendimientos</option>
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                [{v.codigo}] {v.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Producto */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 mb-1 flex items-center space-x-1">
            <Package className="w-3 h-3 text-slate-400" />
            <span>Producto</span>
          </label>
          <select
            value={filters.productId}
            onChange={(e) => onChange({ ...filters, productId: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="TODOS">Todos los productos</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.codigo}] {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
