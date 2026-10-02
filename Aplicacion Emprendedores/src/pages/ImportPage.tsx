import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw,
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
      alert(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setAnalyzing(false);
      // Reset input to allow re-selecting the same file
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmConsolidation = async () => {
    if (!preview || !preview.datosNuevos || !selectedFile) return;

    try {
      setImporting(true);
      const res = await api.confirmImport(preview.datosNuevos, selectedFile.name);
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
    <div className="space-y-6 max-w-4xl">
      {/* Cabecera */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Consolidación de Datos Multi-Local
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Importación de archivos Excel generados en otras terminales sin duplicación de operaciones
        </p>
      </div>

      {/* Zona de Carga de Archivo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-8 text-center transition-colors">
          <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-base font-extrabold text-slate-800">
            {selectedFile ? selectedFile.name : 'Selecciona o arrastra una planilla Excel (.xlsx)'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Archivos exportados desde otros locales o ferias de Tienda Creativa
          </p>

          <label className="mt-4 inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Examinar Archivo</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {analyzing && (
          <div className="flex items-center justify-center space-x-2 text-slate-500 font-bold text-sm py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-600" />
            <span>Validando estructura, productos y detectando duplicados...</span>
          </div>
        )}

        {/* Resumen de Pre-Importación */}
        {preview && (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-slate-600" />
              <h3 className="font-extrabold text-lg text-slate-900">Informe de Pre-Consolidación</h3>
            </div>

            {/* Tarjetas de Conteo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Encontradas</span>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {preview.resumen.totalEncontradas}
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <span className="text-xs font-bold text-orange-700 uppercase">Nuevas a Consolidar</span>
                <p className="text-2xl font-black text-orange-700 mt-1">
                  {preview.resumen.nuevas}
                </p>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-700 uppercase">Ya Existentes</span>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {preview.resumen.duplicadas}
                </p>
                <span className="text-[10px] text-amber-600 block mt-0.5">Se omiten (sin duplicar)</span>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <span className="text-xs font-bold text-red-700 uppercase">Errores</span>
                <p className="text-2xl font-black text-red-700 mt-1">
                  {preview.resumen.errores}
                </p>
              </div>
            </div>

            {/* Alerta de Errores */}
            {preview.detallesErrores.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Se detectaron inconsistencias en algunas filas:</span>
                </div>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1 font-mono">
                  {preview.detallesErrores.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón de Confirmación */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar y Descartar
              </button>

              <button
                type="button"
                onClick={handleConfirmConsolidation}
                disabled={importing || preview.resumen.nuevas === 0}
                className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-3 rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{importing ? 'Consolidando...' : `Confirmar e Importar ${preview.resumen.nuevas} Registros`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Éxito de la Importación */}
        {importSuccess && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-orange-600 mx-auto" />
            <h3 className="text-xl font-black text-orange-900">¡Consolidación Exitosa!</h3>
            <p className="text-sm text-orange-700 font-medium">
              Se han incorporado a la base de datos local:{' '}
              <strong>{importSuccess.ventasInsertadas} ventas</strong> y{' '}
              <strong>{importSuccess.retirosInsertados} retiros</strong> sin duplicados.
            </p>
            <button
              onClick={handleReset}
              className="mt-3 inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-sm"
            >
              <span>Importar Otro Archivo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
