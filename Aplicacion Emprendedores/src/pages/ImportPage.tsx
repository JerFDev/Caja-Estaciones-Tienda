import React, { useState } from 'react';
import {
  UploadCloud,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Building2,
  Package,
  ShoppingCart,
  Boxes,
  Banknote,
  Clock,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { ImportPreviewResult } from '../types';

export const ImportPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<any | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreview(null);
    setImportSuccess(null);

    try {
      setAnalyzing(true);
      const res = await api.previewImport(file);
      setPreview(res);
    } catch (err: any) {
      alert(err.message || 'Error al procesar el archivo.');
    } finally {
      setAnalyzing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmConsolidation = async () => {
    if (!preview || !preview.datosNuevos || !selectedFile) return;

    try {
      setImporting(true);
      const res = await api.confirmImport(
        preview.datosNuevos,
        selectedFile.name,
        preview.archivoHash,
        preview.sourceId
      );
      setImportSuccess(res);
      setPreview(null);
    } catch (err: any) {
      alert(err.message || 'Error al consolidar la información.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setImportSuccess(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabecera */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Consolidación de Datos Multi-Local
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Integración segura de archivos generados en terminales offline con garantía absoluta de cero duplicados
        </p>
      </div>

      {/* Zona de Carga de Archivo */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-3xl p-8 sm:p-10 text-center transition-all bg-slate-50/50">
          <UploadCloud className="w-14 h-14 text-orange-500 mx-auto mb-3" />
          <p className="text-lg font-black text-slate-800">
            {selectedFile ? selectedFile.name : 'Arrastra o selecciona el archivo para consolidar'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Soporta archivos de sincronización <strong>.json</strong> (recomendado) o planillas <strong>.xlsx</strong> provenientes de otras terminales.
          </p>

          <label className="mt-5 inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-3 rounded-2xl shadow-md shadow-orange-600/20 transition-all cursor-pointer">
            <FileJson className="w-5 h-5" />
            <span>Examinar Archivo</span>
            <input
              type="file"
              accept=".json,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {analyzing && (
          <div className="flex flex-col items-center justify-center space-y-2 py-6 text-slate-600">
            <RefreshCw className="w-7 h-7 animate-spin text-orange-600" />
            <p className="font-bold text-sm">Analizando archivo, comprobando identificadores únicos y calculando integridad SHA-256...</p>
          </div>
        )}

        {/* Resumen de Pre-Consolidación */}
        {preview && (
          <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {/* Encabezado del archivo analizado */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-orange-400" />
                  <span className="font-black text-base">Archivo: {preview.nombreArchivo}</span>
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-lg border border-slate-700">
                    {preview.tipoArchivo || 'SYNC'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                  {preview.sourceId && (
                    <span>
                      Terminal Origen: <strong className="text-white">{preview.sourceId}</strong>
                    </span>
                  )}
                  {preview.exportedAt && (
                    <span>
                      Exportado el: <strong className="text-white">{new Date(preview.exportedAt).toLocaleString('es-AR')}</strong>
                    </span>
                  )}
                  {preview.archivoHash && (
                    <span className="font-mono text-[11px] text-slate-400">
                      SHA-256: {preview.archivoHash.substring(0, 16)}...
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {preview.valido ? (
                  <span className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-black">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Estructura Verificada</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-black">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Archivo con Errores</span>
                  </span>
                )}
              </div>
            </div>

            {/* Alerta de Archivo ya importado previamente */}
            {preview.yaImportado && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start space-x-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-black text-sm text-amber-950">
                    ⚠️ Este archivo ya fue importado previamente
                  </p>
                  <p>
                    Se registró una importación con este mismo contenido el{' '}
                    <strong>
                      {preview.importacionPreviaInfo?.fecha
                        ? new Date(preview.importacionPreviaInfo.fecha).toLocaleString('es-AR')
                        : 'anteriormente'}
                    </strong>
                    .
                  </p>
                  <p className="text-amber-800">
                    <strong>Protección activa:</strong> El sistema validará los identificadores únicos y omitirá automáticamente todas las operaciones ya registradas. No se duplicará ninguna venta ni movimiento de stock.
                  </p>
                </div>
              </div>
            )}

            {/* Tarjetas Principales de Conteo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Operaciones</span>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {preview.resumen.totalEncontradas}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">En el archivo</span>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Nuevas a Consolidar</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {preview.resumen.nuevas}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Se incorporarán</span>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Ya Existentes</span>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {preview.resumen.duplicadas}
                </p>
                <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Omitidas (0 duplicados)</span>
              </div>

              <div className={`p-4 rounded-2xl border ${preview.resumen.errores > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${preview.resumen.errores > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                  Inconsistencias
                </span>
                <p className={`text-2xl font-black mt-1 ${preview.resumen.errores > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                  {preview.resumen.errores}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Filas con fallas</span>
              </div>
            </div>

            {/* Desglose por Tipo de Registro */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Desglose Detallado por Módulo
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                {/* Ventas */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-orange-600 font-bold">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Ventas</span>
                  </div>
                  <p className="text-base font-black text-slate-800">
                    +{preview.resumen.ventasNuevas ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {preview.resumen.ventasDuplicadas ?? 0} ya existentes
                  </span>
                </div>

                {/* Movimientos de Stock */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-purple-600 font-bold">
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Stock</span>
                  </div>
                  <p className="text-base font-black text-slate-800">
                    +{preview.resumen.movimientosNuevos ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {preview.resumen.movimientosDuplicados ?? 0} ya existentes
                  </span>
                </div>

                {/* Retiros */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-rose-600 font-bold">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Retiros</span>
                  </div>
                  <p className="text-base font-black text-slate-800">
                    +{preview.resumen.retirosNuevos ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {preview.resumen.retirosDuplicados ?? 0} ya existentes
                  </span>
                </div>

                {/* Sesiones de Caja */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-600 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Cajas</span>
                  </div>
                  <p className="text-base font-black text-slate-800">
                    +{preview.resumen.sesionesNuevas ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {preview.resumen.sesionesDuplicadas ?? 0} ya existentes
                  </span>
                </div>

                {/* Emprendimientos */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-teal-600 font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Emprendimientos</span>
                  </div>
                  <p className="text-base font-black text-slate-800">
                    +{preview.resumen.emprendimientosNuevos ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {preview.resumen.emprendimientosActualizados ?? 0} actualizados
                  </span>
                </div>

                {/* Productos */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-cyan-600 font-bold">
                    <Package className="w-3.5 h-3.5" />
                    <span>Productos</span>
                  </div>
                  <p className="text-base font-black text-slate-800">
                    +{preview.resumen.productosNuevos ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {preview.resumen.productosActualizados ?? 0} actualizados
                  </span>
                </div>
              </div>
            </div>

            {/* Conflictos de Catálogo / Precio Detectados */}
            {preview.detallesConflictos && preview.detallesConflictos.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Diferencias de catálogo detectadas (no alteran ventas pasadas):</span>
                </div>
                <ul className="list-disc list-inside text-xs text-blue-800 space-y-1 font-mono">
                  {preview.detallesConflictos.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alerta de Errores Críticos */}
            {preview.detallesErrores && preview.detallesErrores.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-red-900 font-bold text-xs">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Se detectaron inconsistencias en el archivo:</span>
                </div>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1 font-mono">
                  {preview.detallesErrores.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl cursor-pointer"
              >
                Cancelar y Descartar
              </button>

              <button
                type="button"
                onClick={handleConfirmConsolidation}
                disabled={importing || !preview.valido || preview.resumen.nuevas === 0}
                className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-black px-7 py-3.5 rounded-2xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>
                  {importing
                    ? 'Consolidando en base de datos...'
                    : preview.resumen.nuevas === 0
                    ? 'Sin datos nuevos para consolidar'
                    : `Confirmar e Importar ${preview.resumen.nuevas} Registros Nuevos`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Éxito de la Consolidación */}
        {importSuccess && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-7 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto" />
            <h3 className="text-2xl font-black text-emerald-950">¡Consolidación Exitosa!</h3>
            <p className="text-sm text-emerald-800 font-medium max-w-lg mx-auto">
              Se han incorporado de forma atómica a la base de datos MySQL local:
            </p>

            <div className="inline-flex flex-wrap justify-center gap-3 pt-2">
              <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-xl text-xs">
                {importSuccess.ventasInsertadas} ventas
              </span>
              <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-xl text-xs">
                {importSuccess.movimientosInsertados} movimientos de stock
              </span>
              <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-xl text-xs">
                {importSuccess.retirosInsertados} retiros
              </span>
              <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-xl text-xs">
                {importSuccess.sesionesInsertadas} sesiones de caja
              </span>
              {importSuccess.productosInsertados > 0 && (
                <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-xl text-xs">
                  {importSuccess.productosInsertados} productos nuevos
                </span>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-md transition-colors"
              >
                <span>Importar Otro Archivo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
