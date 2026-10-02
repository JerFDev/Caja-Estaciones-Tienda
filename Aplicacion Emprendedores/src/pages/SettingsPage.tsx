import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { Configuracion, Turno } from '../types';

interface SettingsPageProps {
  config: Configuracion | null;
  onConfigChange: (c: Configuracion) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ config, onConfigChange }) => {
  const [formData, setFormData] = useState({
    localCodigo: '',
    localNombre: '',
    permitirStockNegativo: false,
    porcentajeRetencionDefecto: 0,
    turnoActual: 'MANANA' as Turno,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        localCodigo: config.localCodigo,
        localNombre: config.localNombre,
        permitirStockNegativo: config.permitirStockNegativo,
        porcentajeRetencionDefecto: config.porcentajeRetencionDefecto,
        turnoActual: config.turnoActual,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateConfig(formData);
      onConfigChange(updated);
      setFeedback('Configuración guardada correctamente.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Cabecera */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configuración del Sistema</h2>
        <p className="text-sm text-slate-500 font-medium">
          Identificación de la terminal de trabajo, reglas de stock y parámetros contables
        </p>
      </div>

      {feedback && (
        <div className="bg-orange-50 text-orange-800 border border-orange-200 p-3 rounded-xl text-sm font-bold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-orange-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Identificación del Local */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2">
            Identificación de la Terminal / Local
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Código del Local (Prefijo único)
              </label>
              <input
                type="text"
                placeholder="LOCAL_01"
                value={formData.localCodigo}
                onChange={(e) => setFormData({ ...formData, localCodigo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-sm font-mono font-bold uppercase border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Se utiliza para generar identificadores únicos de venta y evitar colisiones entre computadoras.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Nombre del Espacio / Local
              </label>
              <input
                type="text"
                placeholder="Tienda Creativa - Estaciones"
                value={formData.localNombre}
                onChange={(e) => setFormData({ ...formData, localNombre: e.target.value })}
                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Parámetros Operativos */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2">
            Reglas de Operación y Turnos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Turno Predeterminado
              </label>
              <select
                value={formData.turnoActual}
                onChange={(e) => setFormData({ ...formData, turnoActual: e.target.value as Turno })}
                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
              >
                <option value="MANANA">Turno Mañana</option>
                <option value="TARDE">Turno Tarde</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                % Retención por Defecto
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.porcentajeRetencionDefecto}
                onChange={(e) =>
                  setFormData({ ...formData, porcentajeRetencionDefecto: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Permitir Stock Negativo */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.permitirStockNegativo}
                onChange={(e) => setFormData({ ...formData, permitirStockNegativo: e.target.checked })}
                className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500"
              />
              <span className="font-bold text-slate-800 text-sm">
                Permitir ventas con stock negativo
              </span>
            </label>
            <p className="text-xs text-slate-500 pl-8 leading-relaxed">
              Si está desmarcado, el sistema bloqueará las ventas que superen el stock disponible actual,
              evitando discrepancias físicas de inventario.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
