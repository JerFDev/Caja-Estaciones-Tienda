import React, { useState } from 'react';
import {
  CalendarRange,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Percent,
  Users,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';
import {
  MetricCard,
  SimpleBarChart,
  MultiLineChart,
  BarChartItem,
  LineSeries,
} from './charts/AnalyticsCharts';
import { Venta, Emprendimiento } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface HistoricalEvolutionDashboardProps {
  sales: Venta[];
  ventures: Emprendimiento[];
  availableYears: number[];
}

export const HistoricalEvolutionDashboard: React.FC<HistoricalEvolutionDashboardProps> = ({
  sales,
  ventures,
  availableYears,
}) => {
  // Colors for multi-year curves
  const YEAR_COLORS: { [key: number]: string } = {
    2026: '#ea580c', // orange-600
    2025: '#4f46e5', // indigo-600
    2024: '#059669', // emerald-600
    2023: '#d97706', // amber-600
    2022: '#9333ea', // purple-600
  };

  // Ensure default years list has at least [2023, 2024, 2025, 2026] if user wants to see structure
  const allYearsSorted = Array.from(
    new Set([...availableYears, 2023, 2024, 2025, 2026])
  ).sort((a, b) => b - a);

  // Selected years to compare (by default select top 3 or available years)
  const [selectedYears, setSelectedYears] = useState<number[]>(() => {
    if (availableYears.length > 0) {
      // Pick available years + at least previous year if available
      return availableYears.slice(0, 3);
    }
    return [2026, 2025];
  });

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter((y) => y !== year));
      }
    } else {
      setSelectedYears([...selectedYears, year].sort((a, b) => b - a));
    }
  };

  const activeSales = sales.filter((s) => s.estado === 'ACTIVO');

  // Compute metrics for each selected year
  const yearStats = selectedYears.map((year) => {
    const yearSales = activeSales.filter((s) => new Date(s.fecha).getFullYear() === year);
    const total = yearSales.reduce((sum, s) => sum + s.total, 0);
    const count = yearSales.length;
    const units = yearSales.reduce((sum, s) => sum + s.cantidad, 0);
    const ticketProm = count > 0 ? Math.round(total / count) : 0;
    const activeVenturesInYear = new Set(yearSales.map((s) => s.emprendimientoId)).size;

    return {
      year,
      total,
      count,
      units,
      ticketProm,
      activeVentures: activeVenturesInYear || (yearSales.length > 0 ? 1 : 0),
    };
  });

  // Chart 1: Comparación Anual de Ventas (Bar chart of years)
  const annualBarData: BarChartItem[] = allYearsSorted
    .slice()
    .reverse()
    .map((yr) => {
      const yrSales = activeSales.filter((s) => new Date(s.fecha).getFullYear() === yr);
      const sum = yrSales.reduce((acc, s) => acc + s.total, 0);
      return {
        label: String(yr),
        value: sum,
        color: selectedYears.includes(yr)
          ? YEAR_COLORS[yr] || 'bg-orange-500'
          : 'bg-slate-300',
      };
    });

  // Chart 2: Evolución Mensual Cruzada (MultiLineChart Ene-Dic)
  const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const multiLineSeries: LineSeries[] = selectedYears.map((yr) => {
    const yrSales = activeSales.filter((s) => new Date(s.fecha).getFullYear() === yr);
    const monthlyData = new Array(12).fill(0);
    yrSales.forEach((s) => {
      const m = new Date(s.fecha).getMonth();
      if (m >= 0 && m < 12) {
        monthlyData[m] += s.total;
      }
    });

    return {
      id: String(yr),
      name: `Año ${yr}`,
      color: YEAR_COLORS[yr] || '#ea580c',
      data: monthlyData,
    };
  });

  // Chart 3: Unidades Vendidas Anuales (Bar chart)
  const annualUnitsData: BarChartItem[] = allYearsSorted
    .slice()
    .reverse()
    .map((yr) => {
      const yrSales = activeSales.filter((s) => new Date(s.fecha).getFullYear() === yr);
      const units = yrSales.reduce((acc, s) => acc + s.cantidad, 0);
      return {
        label: String(yr),
        value: units,
        color: 'bg-indigo-500 hover:bg-indigo-600',
      };
    });

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* SELECTOR INTERACTIVO DE AÑOS A COMPARAR */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-100 text-orange-700 rounded-2xl">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              Comparador de Años Históricos
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Selecciona los años para contrastar ventas, unidades y evolución en el tiempo
            </p>
          </div>
        </div>

        {/* Badges de selección de año */}
        <div className="flex items-center flex-wrap gap-2">
          {allYearsSorted.map((yr) => {
            const isSelected = selectedYears.includes(yr);
            const color = YEAR_COLORS[yr] || '#ea580c';

            return (
              <button
                key={yr}
                type="button"
                onClick={() => toggleYear(yr)}
                className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>Año {yr}</span>
                {isSelected && <span className="text-[10px] text-orange-400 font-black">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* COMPARATIVA DE TABLAS / KPIs POR CADA AÑO SELECCIONADO */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {yearStats.map((st) => (
          <div
            key={st.year}
            className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-xs space-y-3 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: YEAR_COLORS[st.year] || '#ea580c' }}
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-black uppercase text-slate-400">Balance Anual</span>
              <span
                className="text-xs font-black px-2.5 py-0.5 rounded-full text-white shadow-xs"
                style={{ backgroundColor: YEAR_COLORS[st.year] || '#ea580c' }}
              >
                {st.year}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-bold block">Ventas Anuales</span>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(st.total)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Operaciones</span>
                <span className="font-black text-slate-800 text-sm">{st.count} ventas</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Productos</span>
                <span className="font-black text-slate-800 text-sm">{st.units} u.</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Ticket Prom.</span>
                <span className="font-black text-slate-800 text-sm">{formatCurrency(st.ticketProm)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Emprendimientos</span>
                <span className="font-black text-slate-800 text-sm">{st.activeVentures} con ventas</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* GRÁFICO 1: EVOLUCIÓN MENSUAL CRUZADA ENTRE AÑOS */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-800">
              Evolución Mensual Comparada entre Años (Enero - Diciembre)
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Curvas superpuestas mes a mes para detectar estacionalidad, altas y bajas interanuales
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl self-start sm:self-center">
            {selectedYears.join(' vs ')}
          </span>
        </div>

        <MultiLineChart labels={monthLabels} series={multiLineSeries} height={240} />
      </div>

      {/* ============================================================ */}
      {/* GRÁFICOS COMPARATIVOS ANUALES: FACTURACIÓN Y UNIDADES */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparación de Facturación Anual */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">Comparación de Ventas por Año</h3>
              <p className="text-xs text-slate-400 font-medium">Facturación acumulada anual</p>
            </div>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <SimpleBarChart
            data={annualBarData}
            height={200}
            emptyMessage="Sin ventas registradas en los años disponibles"
          />
        </div>

        {/* Comparación de Unidades Vendidas por Año */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">Unidades Vendidas por Año</h3>
              <p className="text-xs text-slate-400 font-medium">Volumen de artículos entregados</p>
            </div>
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
          </div>
          <SimpleBarChart
            data={annualUnitsData}
            height={200}
            valueFormatter={(v) => `${v} u.`}
            barColor="bg-indigo-600 hover:bg-indigo-700"
            emptyMessage="Sin unidades registradas"
          />
        </div>
      </div>
    </div>
  );
};
