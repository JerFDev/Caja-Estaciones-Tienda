import React, { useState } from 'react';
import { formatCurrency } from '../../../utils/formatters';

// -------------------------------------------------------------
// 1. MetricCard
// -------------------------------------------------------------
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string; // e.g. "text-orange-600 bg-orange-50"
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-orange-600 bg-orange-50',
  trend,
  trendPositive,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-orange-300' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 truncate pr-2">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      {(subtitle || trend) && (
        <div className="text-xs text-slate-500 font-semibold flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="truncate">{subtitle}</span>
          {trend && (
            <span
              className={`font-black ml-2 px-1.5 py-0.5 rounded text-[11px] ${
                trendPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 2. SimpleBarChart
// -------------------------------------------------------------
export interface BarChartItem {
  label: string;
  sublabel?: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarChartItem[];
  height?: number;
  valueFormatter?: (val: number) => string;
  barColor?: string;
  emptyMessage?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  height = 220,
  valueFormatter = (v) => formatCurrency(v),
  barColor = 'bg-orange-500 hover:bg-orange-600',
  emptyMessage = 'Sin datos disponibles para el período',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"
      >
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full space-y-2">
      {/* Chart container */}
      <div
        style={{ height }}
        className="flex items-end justify-between gap-1.5 sm:gap-2.5 pt-8 pb-1 px-2 border-b border-slate-200 relative select-none"
      >
        {data.map((item, idx) => {
          const pct = Math.max(4, Math.round((item.value / maxValue) * 100));
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-7 z-20 bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-90 duration-100">
                  <span className="block text-slate-300 text-[10px]">{item.label}</span>
                  <span>{valueFormatter(item.value)}</span>
                </div>
              )}

              {/* Bar */}
              <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                <div
                  style={{ height: `${pct}%` }}
                  className={`w-full rounded-t-xl transition-all duration-300 ${
                    item.color || barColor
                  } ${isHovered ? 'brightness-110 shadow-md' : ''}`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-xs font-bold truncate max-w-[60px] text-center mt-2 ${
                  isHovered ? 'text-orange-600 font-black' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. MultiLineChart (Evolución Histórica / Comparación Interanual)
// -------------------------------------------------------------
export interface LineSeries {
  id: string;
  name: string;
  color: string;
  data: number[]; // Typically 12 points for Jan-Dec, or X points
}

interface MultiLineChartProps {
  labels: string[]; // e.g. ['Ene', 'Feb', 'Mar', ...]
  series: LineSeries[];
  height?: number;
  valueFormatter?: (val: number) => string;
  emptyMessage?: string;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  labels,
  series,
  height = 240,
  valueFormatter = (v) => formatCurrency(v),
  emptyMessage = 'Sin datos históricos suficientes para comparar',
}) => {
  const [activePoint, setActivePoint] = useState<{
    seriesName: string;
    seriesColor: string;
    label: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const activeSeries = series.filter((s) => s.data && s.data.length > 0);

  if (activeSeries.length === 0 || activeSeries.every((s) => s.data.every((v) => v === 0))) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"
      >
        {emptyMessage}
      </div>
    );
  }

  // Find max value across all series
  const allValues = activeSeries.flatMap((s) => s.data);
  const maxValue = Math.max(...allValues, 100);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const getCoordinates = (val: number, index: number, total: number) => {
    const x = paddingX + (index / Math.max(1, total - 1)) * chartW;
    const y = paddingTop + chartH - (val / maxValue) * chartH;
    return { x, y };
  };

  return (
    <div className="w-full space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
        {activeSeries.map((s) => (
          <div key={s.id} className="flex items-center space-x-2">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.name}</span>
          </div>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-slate-50/40 rounded-2xl p-2 border border-slate-100">
        {activePoint && (
          <div
            className="absolute z-20 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activePoint.seriesColor }}
              />
              <span className="text-slate-300 font-semibold">{activePoint.seriesName}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{activePoint.label}</span>
            </div>
            <p className="font-black text-white text-xs mt-0.5">
              {valueFormatter(activePoint.value)}
            </p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + chartH * (1 - pct);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={pct === 0 ? 'none' : '4 4'}
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono font-bold"
                >
                  {Math.round(maxValue * pct) > 1000
                    ? `$${Math.round((maxValue * pct) / 1000)}k`
                    : Math.round(maxValue * pct)}
                </text>
              </g>
            );
          })}

          {/* Series lines */}
          {activeSeries.map((s) => {
            const points = s.data.map((val, idx) =>
              getCoordinates(val, idx, labels.length)
            );
            const pathD = points.reduce(
              (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
              ''
            );

            return (
              <g key={s.id}>
                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Points */}
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={activePoint?.seriesName === s.name && activePoint?.label === labels[i] ? '6' : '4'}
                    fill="#ffffff"
                    stroke={s.color}
                    strokeWidth="3"
                    className="cursor-pointer hover:r-6 transition-all"
                    onMouseEnter={() =>
                      setActivePoint({
                        seriesName: s.name,
                        seriesColor: s.color,
                        label: labels[i],
                        value: s.data[i],
                        x: pt.x,
                        y: pt.y,
                      })
                    }
                    onMouseLeave={() => setActivePoint(null)}
                  />
                ))}
              </g>
            );
          })}

          {/* X axis labels */}
          {labels.map((lbl, idx) => {
            const x = paddingX + (idx / Math.max(1, labels.length - 1)) * chartW;
            return (
              <text
                key={idx}
                x={x}
                y={svgHeight - 10}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-bold"
              >
                {lbl}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. DonutChart
// -------------------------------------------------------------
export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutItem[];
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (val: number) => string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerLabel,
  centerValue,
  valueFormatter = (v) => formatCurrency(v),
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        Sin operaciones registradas para este desglose
      </div>
    );
  }

  // Calculate SVG arc strokes
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPct = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {data.map((item, idx) => {
            const pct = item.value / total;
            const strokeDashoffset = circumference * (1 - pct);
            const rotation = accumulatedPct * 360;
            accumulatedPct += pct;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transformOrigin: 'center',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'stroke-dashoffset 0.5s ease',
                }}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {centerLabel && (
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              {centerLabel}
            </span>
          )}
          <span className="text-sm font-black text-slate-800 leading-tight">
            {centerValue || formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legend with percentages */}
      <div className="space-y-3 w-full max-w-xs">
        {data.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 truncate pr-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-bold text-slate-700 truncate">{item.label}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-slate-900 block">
                  {valueFormatter(item.value)}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{pct}% del total</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. RankingBarList (Rankings visuales con barra de porcentaje)
// -------------------------------------------------------------
export interface RankingItem {
  id: string;
  rank?: number;
  title: string;
  subtitle?: string;
  value: number;
  secondaryText?: string;
  badge?: string;
  badgeColor?: string;
}

interface RankingBarListProps {
  items: RankingItem[];
  valueFormatter?: (val: number) => string;
  barColor?: string;
  emptyMessage?: string;
}

export const RankingBarList: React.FC<RankingBarListProps> = ({
  items,
  valueFormatter = (v) => formatCurrency(v),
  barColor = 'bg-orange-500',
  emptyMessage = 'Sin elementos para mostrar',
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pct = Math.min(100, Math.max(3, Math.round((item.value / maxValue) * 100)));
        const rankNum = item.rank ?? idx + 1;

        return (
          <div key={item.id} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 truncate pr-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    rankNum === 1
                      ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                      : rankNum === 2
                      ? 'bg-slate-300 text-slate-800'
                      : rankNum === 3
                      ? 'bg-amber-700/20 text-amber-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {rankNum}
                </span>
                <div className="truncate">
                  <span className="font-extrabold text-slate-800 truncate block">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-[11px] text-slate-400 font-medium truncate block">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-black text-slate-900 block text-xs">
                  {valueFormatter(item.value)}
                </span>
                {item.secondaryText && (
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {item.secondaryText}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
