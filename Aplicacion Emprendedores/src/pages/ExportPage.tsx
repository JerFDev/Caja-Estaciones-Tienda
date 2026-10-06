import React, { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  Calendar,
  Filter,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import { Emprendimiento } from "../types";
import { useAuth } from "../context/AuthContext";

export const ExportPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [entrepreneurs, setEntrepreneurs] = useState<Emprendimiento[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedType, setSelectedType] = useState("TODO");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearCountdown, setClearCountdown] = useState(10);
  const [clearingImports, setClearingImports] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.getEntrepreneurs(true).then(setEntrepreneurs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!showClearModal || clearCountdown <= 0) return;
    const timer = window.setTimeout(
      () => setClearCountdown((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [showClearModal, clearCountdown]);

  const handleOpenClearModal = () => {
    setClearCountdown(10);
    setClearFeedback(null);
    setShowClearModal(true);
  };

  const handleClearImportedData = async () => {
    try {
      setClearingImports(true);
      const result = await api.clearAllData();
      setClearFeedback(
        `Sistema vacío: ${result.emprendimientosEliminados} emprendimientos, ${result.productosEliminados} productos, ${result.ventasEliminadas} ventas, ${result.retirosEliminados} retiros, ${result.movimientosStockEliminados} movimientos y ${result.sesionesCajaEliminadas} sesiones de caja eliminados.`,
      );
      setShowClearModal(false);
    } catch (error: any) {
      alert(error.message || "No se pudo limpiar la información importada.");
    } finally {
      setClearingImports(false);
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
        const err = await res
          .json()
          .catch(() => ({ error: "Error al exportar" }));
        alert(err.error || "Error al generar el archivo.");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Reporte_Tienda_Creativa_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(e.message || "Error al descargar el archivo.");
    }
  };

  const handleExportJson = async () => {
    const url = api.getExportJsonUrl();
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Error al exportar" }));
        alert(err.error || "Error al generar el archivo.");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Backup_Tienda_Creativa_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(e.message || "Error al descargar el archivo.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabecera */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Exportación de Datos
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Generación de planillas compatibles con Microsoft Excel / Google
          Sheets y copias de seguridad
        </p>
      </div>

      {/* Tarjeta de Exportación XLSX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-orange-50 text-orange-700 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">
              Planilla Consolidada (.xlsx)
            </h3>
            <p className="text-xs text-slate-500">
              Exporta operaciones y catálogos de emprendimientos y productos
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
              <option value="TODO">Todas las Hojas</option>
              <option value="VENTAS">Sólo Ventas</option>
              <option value="STOCK">Sólo Stock y Existencias</option>
              <option value="RETIROS">Sólo Retiros de Efectivo</option>
              <option value="SALDOS">Sólo Resumen de Saldos Financieros</option>
              <option value="EMPRENDIMIENTOS">Sólo Emprendimientos</option>
              <option value="PRODUCTOS">Sólo Productos</option>
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

      {isAdmin && (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={handleOpenClearModal}
            className="inline-flex items-center space-x-2 border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar todos los datos</span>
          </button>
          {clearFeedback && (
            <p role="status" className="text-xs font-semibold text-emerald-700">
              {clearFeedback}
            </p>
          )}
        </div>
      )}

      {/* Tarjeta de Backup JSON */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">
              Copia de Seguridad Completa (.json)
            </h3>
            <p className="text-xs text-slate-500">
              Archivo con la totalidad de registros para respaldo informático,
              migración o diagnóstico
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Este archivo contiene toda la base de datos local estructurada
          (emprendimientos, productos, movimientos, ventas, retiros y
          auditoría). Puedes guardarlo en una unidad USB como resguardo.
        </p>

        <button
          onClick={handleExportJson}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Descargar Backup JSON (.json)</span>
        </button>
      </div>

      {isAdmin && showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-imports-title"
            className="w-full max-w-md space-y-5 rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="clear-imports-title"
                  className="text-lg font-black text-slate-900"
                >
                  ¿Estás seguro?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Esto no se puede deshacer. Asegúrate de descargar la planilla
                  antes de borrarla. Se eliminarán todos los emprendimientos,
                  productos, ventas, retiros, movimientos de stock, sesiones de
                  caja e historiales para dejar los paneles sin datos.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearingImports}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearImportedData}
                disabled={clearCountdown > 0 || clearingImports}
                className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {clearingImports
                    ? "Limpiando..."
                    : clearCountdown > 0
                      ? `Espera ${clearCountdown} s`
                      : "Borrar todos los datos"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
