import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Tag,
  Share2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Users,
  Award,
  BookOpen,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { api } from "../../services/api";
import {
  Emprendimiento,
  ExpedienteMunicipal,
  PresenciaDigital,
  HitoExpediente,
} from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

interface Props {
  ventureId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

type TabType = "timeline" | "datos" | "redes" | "comercial" | "intervenciones";

export const VentureExpedienteModal: React.FC<Props> = ({
  ventureId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [tab, setTab] = useState<TabType>("timeline");
  const [loading, setLoading] = useState(true);
  const [expediente, setExpediente] = useState<ExpedienteMunicipal | null>(null);
  const [redes, setRedes] = useState<PresenciaDigital[]>([]);

  // Submodales para registrar intervenciones rápidas
  const [modalTipo, setModalTipo] = useState<
    "fiscalizacion" | "reunion" | "seguimiento" | "servicio" | "red" | null
  >(null);

  // Form states
  const [formFisc, setFormFisc] = useState({ resultado: "APROBADA", motivo: "", observaciones: "" });
  const [formReu, setFormReu] = useState({ responsable: "", tema: "", acuerdos: "", observaciones: "" });
  const [formSeg, setFormSeg] = useState({ tipo: "CONTACTO", responsable: "", motivo: "", observacion: "", proximoContacto: "" });
  const [formServ, setFormServ] = useState({ servicioMunicipalId: "", responsable: "", observaciones: "" });
  const [serviciosCatalogo, setServiciosCatalogo] = useState<any[]>([]);
  const [formRed, setFormRed] = useState({ canal: "INSTAGRAM", url: "", observaciones: "" });
  const [savingAction, setSavingAction] = useState(false);

  // Edición rápida de datos
  const [editingDatos, setEditingDatos] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    nombreFantasia: "",
    responsable: "",
    documento: "",
    cuit: "",
    telefono: "",
    direccion: "",
    mail: "",
    rubro: "",
    descripcion: "",
    alias: "",
    cvu: "",
    cbu: "",
    estado: "ACTIVO",
    porcentajeRetencion: 0,
  });

  useEffect(() => {
    if (isOpen && ventureId) {
      loadExpediente();
    }
  }, [isOpen, ventureId]);

  const loadExpediente = async () => {
    if (!ventureId) return;
    try {
      setLoading(true);
      const [exp, redesList, serviciosList] = await Promise.all([
        api.getMunicipalExpediente(ventureId),
        api.getPresenciaDigital(ventureId),
        api.getServiciosMunicipales(),
      ]);
      setExpediente(exp);
      setRedes(redesList);
      setServiciosCatalogo(serviciosList);

      const v = exp.emprendimiento;
      setFormData({
        nombre: v.nombre,
        nombreFantasia: v.nombreFantasia || "",
        responsable: v.responsable,
        documento: v.documento || "",
        cuit: v.cuit || "",
        telefono: v.telefono || "",
        direccion: v.direccion || "",
        mail: v.mail || "",
        rubro: v.rubro || "",
        descripcion: v.descripcion || "",
        alias: v.alias || "",
        cvu: v.cvu || "",
        cbu: v.cbu || "",
        estado: v.estado || "ACTIVO",
        porcentajeRetencion: v.porcentajeRetencion || 0,
      });
    } catch (error) {
      console.error("Error al cargar expediente:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureId) return;
    try {
      setSavingAction(true);
      await api.updateMunicipalEntrepreneur(ventureId, formData);
      setEditingDatos(false);
      await loadExpediente();
      if (onUpdated) onUpdated();
    } catch (error: any) {
      alert(error.message || "Error al actualizar datos.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleCrearFiscalizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureId) return;
    try {
      setSavingAction(true);
      await api.createFiscalizacion({
        emprendimientoId: ventureId,
        resultado: formFisc.resultado,
        motivo: formFisc.motivo,
        observaciones: formFisc.observaciones,
      });
      setModalTipo(null);
      setFormFisc({ resultado: "APROBADA", motivo: "", observaciones: "" });
      await loadExpediente();
    } catch (e: any) {
      alert(e.message || "Error al guardar fiscalización.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleCrearReunion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureId) return;
    try {
      setSavingAction(true);
      await api.createReunion({
        emprendimientoId: ventureId,
        responsable: formReu.responsable,
        tema: formReu.tema,
        acuerdos: formReu.acuerdos,
        observaciones: formReu.observaciones,
      });
      setModalTipo(null);
      setFormReu({ responsable: "", tema: "", acuerdos: "", observaciones: "" });
      await loadExpediente();
    } catch (e: any) {
      alert(e.message || "Error al guardar reunión.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleCrearSeguimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureId) return;
    try {
      setSavingAction(true);
      await api.createSeguimiento({
        emprendimientoId: ventureId,
        tipo: formSeg.tipo,
        responsable: formSeg.responsable,
        motivo: formSeg.motivo,
        observacion: formSeg.observacion,
        proximoContacto: formSeg.proximoContacto || undefined,
      });
      setModalTipo(null);
      setFormSeg({ tipo: "CONTACTO", responsable: "", motivo: "", observacion: "", proximoContacto: "" });
      await loadExpediente();
    } catch (e: any) {
      alert(e.message || "Error al guardar seguimiento.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleOtorgarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureId || !formServ.servicioMunicipalId) return;
    try {
      setSavingAction(true);
      await api.otorgarServicio({
        emprendimientoId: ventureId,
        servicioMunicipalId: formServ.servicioMunicipalId,
        responsable: formServ.responsable,
        observaciones: formServ.observaciones,
      });
      setModalTipo(null);
      setFormServ({ servicioMunicipalId: "", responsable: "", observaciones: "" });
      await loadExpediente();
    } catch (e: any) {
      alert(e.message || "Error al registrar servicio.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleGuardarRed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureId || !formRed.url) return;
    try {
      setSavingAction(true);
      await api.upsertPresenciaDigital({
        emprendimientoId: ventureId,
        canal: formRed.canal,
        url: formRed.url,
        observaciones: formRed.observaciones,
      });
      setModalTipo(null);
      setFormRed({ canal: "INSTAGRAM", url: "", observaciones: "" });
      const updatedRedes = await api.getPresenciaDigital(ventureId);
      setRedes(updatedRedes);
    } catch (e: any) {
      alert(e.message || "Error al guardar red social.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteRed = async (id: string) => {
    if (!confirm("¿Eliminar este canal digital?")) return;
    try {
      await api.deletePresenciaDigital(id);
      if (ventureId) {
        const updatedRedes = await api.getPresenciaDigital(ventureId);
        setRedes(updatedRedes);
      }
    } catch (e: any) {
      alert(e.message || "Error al eliminar canal.");
    }
  };

  if (!isOpen) return null;

  const emp = expediente?.emprendimiento;

  const renderBadgeEstado = (estado?: string) => {
    switch (estado) {
      case "ACTIVO":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">ACTIVO</span>;
      case "INACTIVO":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">INACTIVO</span>;
      case "SUSPENDIDO":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">SUSPENDIDO</span>;
      case "FINALIZADO":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">FINALIZADO</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{estado || "ACTIVO"}</span>;
    }
  };

  const renderTimelineIcon = (tipo: HitoExpediente["tipo"]) => {
    switch (tipo) {
      case "ALTA":
        return <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0"><Building2 className="w-4 h-4" /></div>;
      case "COLECTIVO":
        return <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0"><Users className="w-4 h-4" /></div>;
      case "POSTULACION":
        return <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0"><FileText className="w-4 h-4" /></div>;
      case "EDICION":
        return <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0"><ShoppingBag className="w-4 h-4" /></div>;
      case "FISCALIZACION":
        return <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0"><ClipboardCheck className="w-4 h-4" /></div>;
      case "CAPACITACION":
        return <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0"><BookOpen className="w-4 h-4" /></div>;
      case "REUNION":
        return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0"><MessageSquare className="w-4 h-4" /></div>;
      case "SERVICIO":
        return <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0"><Award className="w-4 h-4" /></div>;
      case "SEGUIMIENTO":
        return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0"><Clock className="w-4 h-4" /></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0"><Sparkles className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Encabezado Ficha Integral */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 shrink-0 border-b border-slate-700 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs uppercase px-2.5 py-1 bg-orange-500 text-white font-black rounded-lg shadow-xs tracking-wider">
                CÓDIGO OFICIAL: {emp?.codigo || "..."}
              </span>
              {renderBadgeEstado(emp?.estado)}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{emp?.nombre}</span>
              {emp?.nombreFantasia && (
                <span className="text-sm font-semibold text-slate-300">
                  ("{emp.nombreFantasia}")
                </span>
              )}
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Titular / Responsable: <span className="text-white font-bold">{emp?.responsable}</span>
              {emp?.cuit && <span> • CUIT: {emp.cuit}</span>}
              {emp?.rubro && <span> • Rubro: {emp.rubro}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Cerrar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de navegación de pestañas */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center gap-2 overflow-x-auto shrink-0 select-none">
          <button
            onClick={() => setTab("timeline")}
            className={`py-3.5 px-4 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "timeline"
                ? "border-orange-600 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>LÍNEA DE TIEMPO / EXPEDIENTE</span>
          </button>

          <button
            onClick={() => setTab("datos")}
            className={`py-3.5 px-4 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "datos"
                ? "border-orange-600 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>DATOS INSTITUCIONALES</span>
          </button>

          <button
            onClick={() => setTab("redes")}
            className={`py-3.5 px-4 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "redes"
                ? "border-orange-600 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>PRESENCIA DIGITAL ({redes.length})</span>
          </button>

          <button
            onClick={() => setTab("comercial")}
            className={`py-3.5 px-4 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "comercial"
                ? "border-orange-600 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>RESUMEN COMERCIAL (POS)</span>
          </button>

          <button
            onClick={() => setTab("intervenciones")}
            className={`py-3.5 px-4 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "intervenciones"
                ? "border-orange-600 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>ACCIONES MUNICIPALES</span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold">
              Cargando historial municipal del emprendimiento...
            </div>
          ) : (
            <>
              {/* TAB 1: LÍNEA DE TIEMPO / EXPEDIENTE */}
              {tab === "timeline" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        Expediente Histórico del Emprendimiento
                      </h3>
                      <p className="text-xs text-slate-500">
                        Registro cronológico de todas las interacciones, postulaciones, participaciones y controles municipales.
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
                      {expediente?.lineaDeTiempo.length || 0} hitos registrados
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {expediente?.lineaDeTiempo.map((hito) => (
                      <div key={hito.id} className="relative flex items-start gap-4 group">
                        <div className="absolute -left-6 mt-1">
                          {renderTimelineIcon(hito.tipo)}
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex-1 ml-4 transition-all group-hover:border-slate-300 group-hover:shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {hito.titulo}
                            </span>
                            <div className="flex items-center gap-2">
                              {hito.badge && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {hito.badge}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-slate-400">
                                {formatDateTime(hito.fecha)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                            {hito.descripcion}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: DATOS INSTITUCIONALES */}
              {tab === "datos" && (
                <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        Ficha Institucional y Documentación
                      </h3>
                      <p className="text-xs text-slate-500">
                        Información permanente, fiscal y de contacto registrada en la Municipalidad.
                      </p>
                    </div>
                    {!editingDatos ? (
                      <button
                        onClick={() => setEditingDatos(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Editar Datos
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingDatos(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Cancelar Edición
                      </button>
                    )}
                  </div>

                  {editingDatos ? (
                    <form onSubmit={handleSaveDatos} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial *</label>
                          <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Fantasía</label>
                          <input
                            type="text"
                            value={formData.nombreFantasia}
                            onChange={(e) => setFormData({ ...formData, nombreFantasia: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Responsable Titular *</label>
                          <input
                            type="text"
                            required
                            value={formData.responsable}
                            onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Documento / DNI</label>
                          <input
                            type="text"
                            value={formData.documento}
                            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">CUIT / CUIL</label>
                          <input
                            type="text"
                            value={formData.cuit}
                            onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Estado Municipal</label>
                          <select
                            value={formData.estado}
                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                          >
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="INACTIVO">INACTIVO</option>
                            <option value="SUSPENDIDO">SUSPENDIDO</option>
                            <option value="FINALIZADO">FINALIZADO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Rubro Principal</label>
                          <input
                            type="text"
                            value={formData.rubro}
                            onChange={(e) => setFormData({ ...formData, rubro: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Retención (%)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.porcentajeRetencion}
                            onChange={(e) => setFormData({ ...formData, porcentajeRetencion: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                          <input
                            type="email"
                            value={formData.mail}
                            onChange={(e) => setFormData({ ...formData, mail: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Dirección / Taller</label>
                        <input
                          type="text"
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Notas de la Actividad</label>
                        <textarea
                          rows={3}
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingDatos(false)}
                          className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingAction}
                          className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                        >
                          {savingAction ? "Guardando..." : "Guardar Cambios"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-3">
                        <div>
                          <span className="text-slate-400 block font-semibold">Código Oficial Municipal</span>
                          <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {emp?.codigo}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Nombre Comercial</span>
                          <span className="font-bold text-slate-800 text-sm">{emp?.nombre}</span>
                        </div>
                        {emp?.nombreFantasia && (
                          <div>
                            <span className="text-slate-400 block font-semibold">Nombre de Fantasía</span>
                            <span className="font-semibold text-slate-700">{emp.nombreFantasia}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 block font-semibold">Responsable / Titular</span>
                          <span className="font-bold text-slate-800">{emp?.responsable}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">DNI / Documento</span>
                          <span className="font-semibold text-slate-700">{emp?.documento || "No informado"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">CUIT / CUIL</span>
                          <span className="font-semibold text-slate-700">{emp?.cuit || "No informado"}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-slate-400 block font-semibold">Rubro</span>
                          <span className="font-bold text-slate-800">{emp?.rubro || "General"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Teléfono</span>
                          <span className="font-semibold text-slate-700">{emp?.telefono || "No informado"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Email</span>
                          <span className="font-semibold text-slate-700">{emp?.mail || "No informado"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Dirección</span>
                          <span className="font-semibold text-slate-700">{emp?.direccion || "No informada"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Datos Bancarios / Cobro</span>
                          <span className="font-mono text-slate-700">Alias: {emp?.alias || "—"} | CVU: {emp?.cvu || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Retención Municipal Pactada</span>
                          <span className="font-bold text-orange-600">{emp?.porcentajeRetencion}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRESENCIA DIGITAL */}
              {tab === "redes" && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">Canales y Presencia Digital</h3>
                      <p className="text-xs text-slate-500">
                        Redes sociales, catálogos online y vías de difusión pública del emprendimiento.
                      </p>
                    </div>
                    <button
                      onClick={() => setModalTipo("red")}
                      className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Canal</span>
                    </button>
                  </div>

                  {redes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 font-semibold text-xs">
                      No se han registrado redes sociales ni presencia digital todavía.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {redes.map((r) => (
                        <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                              {r.canal}
                            </span>
                            <div className="font-mono text-xs font-bold text-slate-800 break-all mt-1">
                              {r.url}
                            </div>
                            {r.observaciones && (
                              <p className="text-[11px] text-slate-500">{r.observaciones}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteRed(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar canal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: RESUMEN COMERCIAL */}
              {tab === "comercial" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="pb-2 border-b border-slate-200">
                    <h3 className="font-black text-slate-900 text-base">Operaciones Comerciales Vinculadas</h3>
                    <p className="text-xs text-slate-500">
                      Datos generados en el Punto de Venta (POS). No duplicados: se consultan directamente del motor de ventas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-500 font-bold block">Total Facturado</span>
                      <span className="text-xl font-black text-slate-900 mt-1 block">
                        {formatCurrency(expediente?.resumenComercial.montoTotalFacturado || 0)}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-500 font-bold block">Tickets Emitidos</span>
                      <span className="text-xl font-black text-slate-900 mt-1 block">
                        {expediente?.resumenComercial.totalVentas || 0} operaciones
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-500 font-bold block">Retiros Realizados</span>
                      <span className="text-xl font-black text-slate-900 mt-1 block">
                        {formatCurrency(expediente?.resumenComercial.totalRetirado || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ACCIONES MUNICIPALES */}
              {tab === "intervenciones" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="pb-2 border-b border-slate-200">
                    <h3 className="font-black text-slate-900 text-base">Acompañamiento y Acciones Municipales</h3>
                    <p className="text-xs text-slate-500">
                      Registra nuevas fiscalizaciones, reuniones, servicios otorgados o seguimientos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      onClick={() => setModalTipo("fiscalizacion")}
                      className="p-4 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <ClipboardCheck className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-extrabold text-xs text-slate-800">Nueva Fiscalización</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Control de calidad y bromatología.</p>
                    </button>

                    <button
                      onClick={() => setModalTipo("reunion")}
                      className="p-4 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <MessageSquare className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-extrabold text-xs text-slate-800">Nueva Reunión</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Minutas, acuerdos y firmas.</p>
                    </button>

                    <button
                      onClick={() => setModalTipo("servicio")}
                      className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <Award className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-extrabold text-xs text-slate-800">Otorgar Servicio</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Asesoría, formalización o apoyo.</p>
                    </button>

                    <button
                      onClick={() => setModalTipo("seguimiento")}
                      className="p-4 bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <Clock className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-extrabold text-xs text-slate-800">Nuevo Seguimiento</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Contacto, visita o llamada.</p>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Dinámico para Crear Intervención */}
        {modalTipo && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm capitalize">
                  {modalTipo === "fiscalizacion" && "Registrar Fiscalización"}
                  {modalTipo === "reunion" && "Registrar Reunión"}
                  {modalTipo === "seguimiento" && "Registrar Seguimiento / Contacto"}
                  {modalTipo === "servicio" && "Otorgar Servicio Municipal"}
                  {modalTipo === "red" && "Agregar Canal Digital"}
                </h3>
                <button onClick={() => setModalTipo(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Fiscalización */}
              {modalTipo === "fiscalizacion" && (
                <form onSubmit={handleCrearFiscalizacion} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Resultado de la Fiscalización *</label>
                    <select
                      value={formFisc.resultado}
                      onChange={(e) => setFormFisc({ ...formFisc, resultado: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="APROBADA">APROBADA</option>
                      <option value="OBSERVADA">OBSERVADA</option>
                      <option value="REQUIERE_CORRECCION">REQUIERE CORRECCIÓN</option>
                      <option value="RECHAZADA">RECHAZADA</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Motivo / Alcance</label>
                    <input
                      type="text"
                      placeholder="Ej: Control bromatológico, etiquetado..."
                      value={formFisc.motivo}
                      onChange={(e) => setFormFisc({ ...formFisc, motivo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                    <textarea
                      rows={3}
                      placeholder="Detalles técnicos y plazos..."
                      value={formFisc.observaciones}
                      onChange={(e) => setFormFisc({ ...formFisc, observaciones: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalTipo(null)} className="px-4 py-2 border border-slate-300 rounded-xl cursor-pointer">Cancelar</button>
                    <button type="submit" disabled={savingAction} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer">Guardar</button>
                  </div>
                </form>
              )}

              {/* Reunión */}
              {modalTipo === "reunion" && (
                <form onSubmit={handleCrearReunion} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Responsable Municipal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del funcionario..."
                      value={formReu.responsable}
                      onChange={(e) => setFormReu({ ...formReu, responsable: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tema Principal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Plan de ferias, financiamiento..."
                      value={formReu.tema}
                      onChange={(e) => setFormReu({ ...formReu, tema: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Acuerdos Pactados</label>
                    <textarea
                      rows={2}
                      placeholder="Compromisos asumidos..."
                      value={formReu.acuerdos}
                      onChange={(e) => setFormReu({ ...formReu, acuerdos: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalTipo(null)} className="px-4 py-2 border border-slate-300 rounded-xl cursor-pointer">Cancelar</button>
                    <button type="submit" disabled={savingAction} className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl cursor-pointer">Guardar</button>
                  </div>
                </form>
              )}

              {/* Seguimiento */}
              {modalTipo === "seguimiento" && (
                <form onSubmit={handleCrearSeguimiento} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tipo de Interacción *</label>
                      <select
                        value={formSeg.tipo}
                        onChange={(e) => setFormSeg({ ...formSeg, tipo: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="CONTACTO">CONTACTO</option>
                        <option value="LLAMADA">LLAMADA</option>
                        <option value="MENSAJE">MENSAJE</option>
                        <option value="VISITA">VISITA</option>
                        <option value="SEGUIMIENTO">SEGUIMIENTO</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Responsable *</label>
                      <input
                        type="text"
                        required
                        value={formSeg.responsable}
                        onChange={(e) => setFormSeg({ ...formSeg, responsable: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Motivo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Consulta por espacio..."
                      value={formSeg.motivo}
                      onChange={(e) => setFormSeg({ ...formSeg, motivo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observación / Detalle *</label>
                    <textarea
                      rows={2}
                      required
                      value={formSeg.observacion}
                      onChange={(e) => setFormSeg({ ...formSeg, observacion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Próximo Contacto (Agenda)</label>
                    <input
                      type="date"
                      value={formSeg.proximoContacto}
                      onChange={(e) => setFormSeg({ ...formSeg, proximoContacto: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalTipo(null)} className="px-4 py-2 border border-slate-300 rounded-xl cursor-pointer">Cancelar</button>
                    <button type="submit" disabled={savingAction} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl cursor-pointer">Guardar</button>
                  </div>
                </form>
              )}

              {/* Servicio */}
              {modalTipo === "servicio" && (
                <form onSubmit={handleOtorgarServicio} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Servicio Municipal *</label>
                    <select
                      required
                      value={formServ.servicioMunicipalId}
                      onChange={(e) => setFormServ({ ...formServ, servicioMunicipalId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="">Selecciona un servicio...</option>
                      {serviciosCatalogo.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Responsable / Área</label>
                    <input
                      type="text"
                      placeholder="Ej: Dirección de Empleo..."
                      value={formServ.responsable}
                      onChange={(e) => setFormServ({ ...formServ, responsable: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                    <textarea
                      rows={2}
                      value={formServ.observaciones}
                      onChange={(e) => setFormServ({ ...formServ, observaciones: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalTipo(null)} className="px-4 py-2 border border-slate-300 rounded-xl cursor-pointer">Cancelar</button>
                    <button type="submit" disabled={savingAction} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer">Otorgar</button>
                  </div>
                </form>
              )}

              {/* Red Digital */}
              {modalTipo === "red" && (
                <form onSubmit={handleGuardarRed} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Canal Digital *</label>
                    <select
                      value={formRed.canal}
                      onChange={(e) => setFormRed({ ...formRed, canal: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="TIKTOK">TikTok</option>
                      <option value="WEB">Sitio Web</option>
                      <option value="WHATSAPP_BUSINESS">WhatsApp Business</option>
                      <option value="GOOGLE_MAPS">Google Maps</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Usuario / Enlace URL *</label>
                    <input
                      type="text"
                      required
                      placeholder="@usuario o https://..."
                      value={formRed.url}
                      onChange={(e) => setFormRed({ ...formRed, url: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observación</label>
                    <input
                      type="text"
                      placeholder="Canal verificado, catálogo disponible..."
                      value={formRed.observaciones}
                      onChange={(e) => setFormRed({ ...formRed, observaciones: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalTipo(null)} className="px-4 py-2 border border-slate-300 rounded-xl cursor-pointer">Cancelar</button>
                    <button type="submit" disabled={savingAction} className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl cursor-pointer">Guardar</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
