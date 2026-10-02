import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileJson, CheckCircle, Calendar, Filter } from 'lucide-react';
import { api } from '../services/api';
import { Emprendimiento } from '../types';

export const ExportPage: React.FC = () => {
  const [entrepreneurs, setEntrepreneurs] = useState<Emprendimiento[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedType, setSelectedType] = useState('TODO');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    api.getEntrepreneurs(true).then(setEntrepreneurs).catch(console.error);
  }, []);

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
          Generación de planillas compatibles con Microsoft Excel / Google Sheets y copias de seguridad
        </p>
      </div>

      {/* Tarjeta de Exportación XLSX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-orange-50 text-orange-700 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Planilla Consolidada (.xlsx)</h3>
            <p className="text-xs text-slate-500">
              Exporta las hojas formateadas con ventas, stock, retiros y estados de cuenta
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
              <option value="TODO">Todas las Hojas (Ventas, Stock, Retiros, Saldos)</option>
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
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Descargar Excel (.xlsx)</span>
        </button>
      </div>

      {/* Tarjeta de Backup JSON */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Copia de Seguridad Completa (.json)</h3>
            <p className="text-xs text-slate-500">
              Archivo con la totalidad de registros para respaldo informático, migración o diagnóstico
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Este archivo contiene toda la base de datos local estructurada (emprendimientos, productos,
          movimientos, ventas, retiros y auditoría). Puedes guardarlo en una unidad USB como resguardo.
        </p>

        <button
          onClick={handleExportJson}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Descargar Backup JSON (.json)</span>
        </button>
      </div>
    </div>
  );
};
