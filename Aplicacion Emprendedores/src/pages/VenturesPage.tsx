import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, CheckCircle, XCircle, Phone, Mail, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { Emprendimiento } from '../types';
import { VentureDetailModal } from '../components/ventures/VentureDetailModal';
import { useAuth } from '../context/AuthContext';

export const VenturesPage: React.FC = () => {
  const { isEmprendedor } = useAuth();
  const [ventures, setVentures] = useState<Emprendimiento[]>([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ficha Detallada de Emprendimiento
  const [selectedVentureForDetail, setSelectedVentureForDetail] = useState<Emprendimiento | null>(null);

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingVenture, setEditingVenture] = useState<Emprendimiento | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    responsable: '',
    telefono: '',
    direccion: '',
    alias: '',
    cvu: '',
    mail: '',
    rubro: '',
    porcentajeRetencion: 0,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadVentures();
  }, [includeInactive]);

  const loadVentures = async () => {
    try {
      setLoading(true);
      const data = await api.getEntrepreneurs(includeInactive);
      setVentures(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingVenture(null);
    setFormData({
      codigo: '',
      nombre: '',
      responsable: '',
      telefono: '',
      direccion: '',
      alias: '',
      cvu: '',
      mail: '',
      rubro: '',
      porcentajeRetencion: 0,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (v: Emprendimiento) => {
    setEditingVenture(v);
    setFormData({
      codigo: v.codigo,
      nombre: v.nombre,
      responsable: v.responsable,
      telefono: v.telefono || '',
      direccion: v.direccion || '',
      alias: v.alias || '',
      cvu: v.cvu || '',
      mail: v.mail || '',
      rubro: v.rubro || '',
      porcentajeRetencion: v.porcentajeRetencion || 0,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.responsable.trim()) {
      setModalError('Código, Nombre y Responsable son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      if (editingVenture) {
        await api.updateEntrepreneur(editingVenture.id, formData);
      } else {
        await api.createEntrepreneur(formData);
      }

      setShowModal(false);
      await loadVentures();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar emprendimiento.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.toggleEntrepreneurActive(id);
      await loadVentures();
    } catch (e: any) {
      alert(e.message || 'Error al alternar estado.');
    }
  };

  const filtered = ventures.filter(
    (v) =>
      v.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      v.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      v.responsable?.toLowerCase().includes(search.toLowerCase()) ||
      (v.rubro && v.rubro.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Emprendimientos Participantes</h2>
          <p className="text-sm text-slate-500 font-medium">
            Directorio maestro de marcas, responsables, datos bancarios y rubros
          </p>
        </div>
        {!isEmprendedor && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer self-start"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Emprendimiento</span>
          </button>
        )}
      </div>

      {isEmprendedor && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center space-x-3 text-orange-950 text-xs font-bold shadow-xs">
          <span className="text-base shrink-0">👤</span>
          <span>
            <strong>Modo Emprendedor:</strong> Selecciona tu emprendimiento para consultar tus ventas, saldo disponible y solicitar retiros de efectivo.
          </span>
        </div>
      )}

      {/* Buscador y Filtro */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código (ej: TDE), nombre, responsable o rubro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer select-none self-end sm:self-center">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
          />
          <span>Mostrar inactivos</span>
        </label>
      </div>

      {/* Grid de Emprendimientos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold">
            Cargando emprendimientos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold">
            No se encontraron emprendimientos registrados.
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVentureForDetail(v)}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all cursor-pointer group ${
                v.activo
                  ? 'border-slate-200 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5'
                  : 'border-slate-200 bg-slate-50/70 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-black bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg">
                      {v.codigo}
                    </span>
                    {v.rubro && (
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {v.rubro}
                      </span>
                    )}
                  </div>
                  {!isEmprendedor && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(v);
                        }}
                        className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 cursor-pointer"
                        title="Editar datos básicos"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(v.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer"
                        title={v.activo ? 'Desactivar' : 'Activar'}
                      >
                        {v.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 mt-2 leading-snug group-hover:text-orange-700 transition-colors">
                  {v.nombre}
                </h3>
                <p className="text-xs font-semibold text-slate-500">Resp: {v.responsable}</p>

                {/* Datos de contacto y pago */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  {v.telefono && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{v.telefono}</span>
                    </div>
                  )}
                  {v.mail && (
                    <div className="flex items-center space-x-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{v.mail}</span>
                    </div>
                  )}
                  {v.alias && (
                    <div className="flex items-center space-x-2 truncate font-mono text-[11px] bg-orange-50 text-orange-800 p-1.5 rounded-lg border border-orange-100">
                      <CreditCard className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="truncate font-bold">Alias: {v.alias}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conteo de productos y acceso a ficha */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>{v._count?.productos ?? 0} productos registrados</span>
                  <span>{v.porcentajeRetencion}% retención</span>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-orange-600 group-hover:text-orange-700 pt-1">
                  <span>Abrir Ficha de Gestión</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-xl text-slate-900">
              {editingVenture ? 'Editar Emprendimiento' : 'Nuevo Emprendimiento'}
            </h3>

            {modalError && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-xs font-bold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Código (3-4 letras)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="AKM"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    disabled={!!editingVenture}
                    className="w-full px-3 py-2 text-base font-mono font-black uppercase border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Nombre Comercial / Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Trama Deco"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Nombre y Apellido del Responsable
                </label>
                <input
                  type="text"
                  placeholder="Ej: Jesica Fornasier"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Rubro / Categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Joyería, Cuero, Deco..."
                    value={formData.rubro}
                    onChange={(e) => setFormData({ ...formData, rubro: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    % Retención Espacio
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.porcentajeRetencion}
                    onChange={(e) =>
                      setFormData({ ...formData, porcentajeRetencion: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Dirección física del emprendimiento"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 2944..."
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.mail}
                    onChange={(e) => setFormData({ ...formData, mail: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Alias Bancario
                  </label>
                  <input
                    type="text"
                    placeholder="alias.mp"
                    value={formData.alias}
                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    CVU / CBU
                  </label>
                  <input
                    type="text"
                    placeholder="00000031..."
                    value={formData.cvu}
                    onChange={(e) => setFormData({ ...formData, cvu: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Emprendimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha Completa del Emprendimiento */}
      <VentureDetailModal
        venture={selectedVentureForDetail}
        isOpen={!!selectedVentureForDetail}
        onClose={() => setSelectedVentureForDetail(null)}
        onVentureUpdated={loadVentures}
      />
    </div>
  );
};
