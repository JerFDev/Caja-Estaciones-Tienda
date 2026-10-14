import React, { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Emprendimiento } from '../types';

export const ExportPage: React.FC = () => {
  const [entrepreneurs, setEntrepreneurs] = useState<Emprendimiento[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedType, setSelectedType] = useState('TODO');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [downloadingSync, setDownloadingSync] = useState(false);

  useEffect(() => {
    api.getEntrepreneurs(true).then(setEntrepreneurs).catch(console.error);
  }, []);

  const handleExportSyncJson = async () => {
    try {
      setDownloadingSync(true);
      const url = api.getExportSyncJsonUrl();
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al exportar' }));
        alert(err.error || 'Error al generar el archivo de sincronización.');
        return;
      }

      const disposition = res.headers.get('Content-Disposition');
      let filename = `sincronizacion_${new Date().toISOString().split('T')[0]}.json`;
      if (disposition && disposition.includes('filename="')) {
        filename = disposition.split('filename="')[1].split('"')[0];
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(e.message || 'Error al descargar el archivo de sincronización.');
    } finally {
      setDownloadingSync(false);
    }
  };

  const handleExportExcel = async () => {
    const url = api.getExportExcelUrl({
      tipo: selectedType,
      emprendimientoId: selectedEmpId || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
    });
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al exportar' }));
        alert(err.error || 'Error al generar el archivo.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Reporte_Tienda_Creativa_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(e.message || 'Error al descargar el archivo.');
    }
  };

  const handleExportJson = async () => {
    const url = api.getExportJsonUrl();
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al exportar' }));
        alert(err.error || 'Error al generar el archivo.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Backup_Tienda_Creativa_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(e.message || 'Error al descargar el archivo.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabecera */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Exportación de Datos</h2>
        <p className="text-sm text-slate-500 font-medium">
          Sincronización multi-local para traslado en pendrive, planillas Excel y copias de seguridad
        </p>
      </div>

      {/* 1. Tarjeta Destacada: Sincronización Multi-Local (.json) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Share2 className="w-48 h-48" />
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-2xl">
              <Share2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-xl text-white">Sincronización Multi-Local (.json)</h3>
                <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Para trasladar datos de computadoras locales a la computadora principal (vía pendrive u otro medio)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs relative z-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="font-bold text-orange-400 block mb-0.5">✓ Cero Duplicados</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Cada venta, movimiento y retiro lleva un identificador global único. Reimportar el mismo archivo no duplica nada.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="font-bold text-emerald-400 block mb-0.5">✓ Trazabilidad de Stock</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Exporta los movimientos reales e ingresos de stock, permitiendo el recálculo matemático exacto en la PC principal.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="font-bold text-cyan-400 block mb-0.5">✓ Firma de Integridad</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Incluye firma SHA-256 y código de terminal (source_id) para auditoría e identificación de origen.
            </p>
          </div>
        </div>

        <div className="pt-2 relative z-10">
          <button
            onClick={handleExportSyncJson}
            disabled={downloadingSync}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white font-black px-7 py-3.5 rounded-2xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            <span>{downloadingSync ? 'Generando archivo...' : 'Exportar Archivo de Sincronización (.json)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjeta de Exportación XLSX */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900">Planilla de Reporte Excel (.xlsx)</h3>
            <p className="text-xs text-slate-500">
              Exporta planillas visuales con ventas, retiros, stock y saldos para contabilidad o impresión
            </p>
          </div>
        </div>

        {/* Opciones de filtro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Información a Incluir
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-medium"
            >
              <option value="TODO">Todas las Hojas (Ventas, Stock, Retiros, Saldos, Catálogo)</option>
              <option value="VENTAS">Sólo Ventas</option>
              <option value="STOCK">Sólo Stock y Existencias</option>
              <option value="RETIROS">Sólo Retiros de Efectivo</option>
              <option value="SALDOS">Sólo Resumen de Saldos Financieros</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Filtrar por Emprendimiento
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-medium"
            >
              <option value="">Todos los Emprendimientos</option>
              {entrepreneurs.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.codigo}] {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Fecha Desde (Opcional)
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Fecha Hasta (Opcional)
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Descargar Planilla Excel (.xlsx)</span>
        </button>
      </div>

      {/* 3. Tarjeta de Backup Completo */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900">Copia de Seguridad de la Base (.json)</h3>
            <p className="text-xs text-slate-500">
              Volcado completo de la base de datos local para resguardo informático o reinstalación técnica
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Guarda la totalidad de tablas de la base local en un archivo JSON crudo.
        </p>

        <button
          onClick={handleExportJson}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 py-3 rounded-2xl shadow-xs transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Descargar Respaldo Total (.json)</span>
        </button>
      </div>
    </div>
  );
};
