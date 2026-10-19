import React, { useState, useEffect } from "react";
import {
  Landmark,
  LayoutDashboard,
  Users,
  FileText,
  Users2,
  CalendarDays,
  ClipboardCheck,
  ShieldAlert,
  Search,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Tag,
  BookOpen,
  MessageSquare,
  Award,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  X,
  History,
  Instagram,
  TrendingUp,
  Edit3,
  Globe,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import {
  Emprendimiento,
  DashboardMunicipalStats,
  Convocatoria,
  Postulacion,
  Colectivo,
  Edicion,
  LocalMunicipal,
  ParticipacionEdicion,
  Fiscalizacion,
  Capacitacion,
  ReunionMunicipal,
  ServicioMunicipal,
  EmprendimientoServicio,
  SeguimientoMunicipal,
  AuditoriaMunicipalLog,
  PresenciaDigital,
} from "../types";
import { VentureExpedienteModal } from "../components/municipal/VentureExpedienteModal";
import { formatCurrency, formatDateTime } from "../utils/formatters";

type MainTab =
  | "dashboard"
  | "emprendimientos"
  | "convocatorias"
  | "colectivos"
  | "ediciones"
  | "acompanamiento"
  | "redes"
  | "auditoria";

export const MunicipalPage: React.FC = () => {
  const [tab, setTab] = useState<MainTab>("dashboard");
  const [loading, setLoading] = useState(true);

  // Stats Dashboard
  const [stats, setStats] = useState<DashboardMunicipalStats | null>(null);

  // Emprendimientos
  const [ventures, setVentures] = useState<Emprendimiento[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [selectedVentureForExpediente, setSelectedVentureForExpediente] = useState<string | null>(null);
  const [showCreateVentureModal, setShowCreateVentureModal] = useState(false);
  const [ventureForm, setVentureForm] = useState({
    codigo: "",
    nombre: "",
    nombreFantasia: "",
    responsable: "",
    documento: "",
    cuit: "",
    telefono: "",
    direccion: "",
    alias: "",
    cvu: "",
    cbu: "",
    mail: "",
    rubro: "",
    descripcion: "",
    porcentajeRetencion: 0,
    estado: "ACTIVO",
  });
  const [ventureError, setVentureError] = useState<string | null>(null);
  const [savingVenture, setSavingVenture] = useState(false);

  // Convocatorias & Postulaciones
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [showCreateConvModal, setShowCreateConvModal] = useState(false);
  const [convForm, setConvForm] = useState({
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "ABIERTA",
    requisitos: "",
  });
  const [showPostularModal, setShowPostularModal] = useState(false);
  const [postularForm, setPostularForm] = useState({
    convocatoriaId: "",
    emprendimientoId: "",
    observaciones: "",
  });

  // Colectivos
  const [colectivos, setColectivos] = useState<Colectivo[]>([]);
  const [selectedColectivo, setSelectedColectivo] = useState<Colectivo | null>(null);
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [colForm, setColForm] = useState({ nombre: "", descripcion: "", orientacion: "" });
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ colectivoId: "", emprendimientoId: "", observaciones: "" });

  // Ediciones & Locales
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [locales, setLocales] = useState<LocalMunicipal[]>([]);
  const [subTabEdicion, setSubTabEdicion] = useState<"ediciones" | "locales">("ediciones");
  const [showCreateEdicionModal, setShowCreateEdicionModal] = useState(false);
  const [edicionForm, setEdicionForm] = useState({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", estado: "PLANIFICADA" });
  const [showCreateLocalModal, setShowCreateLocalModal] = useState(false);
  const [localForm, setLocalForm] = useState({ codigo: "", nombre: "", direccion: "", capacidad: 1 });
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [partForm, setPartForm] = useState({ edicionId: "", emprendimientoId: "", localId: "", colectivoId: "", observaciones: "" });

  // Acompañamiento
  const [subTabAcomp, setSubTabAcomp] = useState<"fiscalizaciones" | "capacitaciones" | "reuniones" | "servicios" | "seguimientos">("fiscalizaciones");
  const [fiscalizaciones, setFiscalizaciones] = useState<Fiscalizacion[]>([]);
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [reuniones, setReuniones] = useState<ReunionMunicipal[]>([]);
  const [serviciosCatalogo, setServiciosCatalogo] = useState<ServicioMunicipal[]>([]);
  const [serviciosOtorgados, setServiciosOtorgados] = useState<EmprendimientoServicio[]>([]);
  const [seguimientos, setSeguimientos] = useState<SeguimientoMunicipal[]>([]);

  // Redes Sociales & Presencia Digital
  const [redesList, setRedesList] = useState<PresenciaDigital[]>([]);
  const [searchRedes, setSearchRedes] = useState("");
  const [filterCanal, setFilterCanal] = useState("TODOS");
  const [filterRubroRedes, setFilterRubroRedes] = useState("TODOS");
  const [viewModeRedes, setViewModeRedes] = useState<"cards" | "table">("cards");
  const [editingSeguidoresId, setEditingSeguidoresId] = useState<string | null>(null);
  const [nuevoSeguidoresVal, setNuevoSeguidoresVal] = useState<number | string>("");
  const [showAddRedModal, setShowAddRedModal] = useState(false);
  const [addRedForm, setAddRedForm] = useState({
    emprendimientoId: "",
    canal: "INSTAGRAM",
    url: "",
    usuarioRed: "",
    seguidores: 0,
    observaciones: "",
  });

  // Estados para Edición
  const [showEditConvModal, setShowEditConvModal] = useState(false);
  const [editConvForm, setEditConvForm] = useState({
    id: "",
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "ABIERTA",
    requisitos: "",
  });

  const [showEditColModal, setShowEditColModal] = useState(false);
  const [editColForm, setEditColForm] = useState({
    id: "",
    nombre: "",
    descripcion: "",
    orientacion: "",
    puntosVenta: "",
    contacto: "",
    redesSociales: "",
    estado: "ACTIVO",
  });

  const [showEditEdicionModal, setShowEditEdicionModal] = useState(false);
  const [editEdicionForm, setEditEdicionForm] = useState({
    id: "",
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "PLANIFICADA",
    observaciones: "",
  });

  const [showEditLocalModal, setShowEditLocalModal] = useState(false);
  const [editLocalForm, setEditLocalForm] = useState({
    id: "",
    codigo: "",
    nombre: "",
    direccion: "",
    descripcion: "",
    capacidad: 1,
    activo: true,
  });

  const [showEditRedModal, setShowEditRedModal] = useState(false);
  const [editRedForm, setEditRedForm] = useState({
    id: "",
    emprendimientoId: "",
    canal: "INSTAGRAM",
    url: "",
    usuarioRed: "",
    seguidores: 0,
    estado: "ACTIVO",
    observaciones: "",
  });

  // Auditoría
  const [auditLogs, setAuditLogs] = useState<AuditoriaMunicipalLog[]>([]);

  useEffect(() => {
    loadTabContent();
  }, [tab, filterEstado, filterCanal]);

  const loadTabContent = async () => {
    try {
      setLoading(true);
      if (tab === "dashboard") {
        const [data, rList] = await Promise.all([
          api.getMunicipalDashboard(),
          api.getRedesSociales().catch(() => []),
        ]);
        setStats(data);
        setRedesList(rList);
      } else if (tab === "emprendimientos") {
        const data = await api.getMunicipalEntrepreneurs({
          search: searchQuery,
          estado: filterEstado,
        });
        setVentures(data);
      } else if (tab === "convocatorias") {
        const [cList, pList, vList] = await Promise.all([
          api.getConvocatorias(),
          api.getPostulaciones(),
          api.getMunicipalEntrepreneurs(),
        ]);
        setConvocatorias(cList);
        setPostulaciones(pList);
        setVentures(vList);
      } else if (tab === "colectivos") {
        const [cols, vList] = await Promise.all([
          api.getColectivos(),
          api.getMunicipalEntrepreneurs(),
        ]);
        setColectivos(cols);
        setVentures(vList);
      } else if (tab === "ediciones") {
        const [eds, locs, vList] = await Promise.all([
          api.getEdiciones(),
          api.getLocales(),
          api.getMunicipalEntrepreneurs(),
        ]);
        setEdiciones(eds);
        setLocales(locs);
        setVentures(vList);
      } else if (tab === "acompanamiento") {
        const [fList, capList, rList, sCat, sOtorg, segList, vList] = await Promise.all([
          api.getFiscalizaciones(),
          api.getCapacitaciones(),
          api.getReuniones(),
          api.getServiciosMunicipales(),
          api.getServiciosOtorgados(),
          api.getSeguimientos(),
          api.getMunicipalEntrepreneurs(),
        ]);
        setFiscalizaciones(fList);
        setCapacitaciones(capList);
        setReuniones(rList);
        setServiciosCatalogo(sCat);
        setServiciosOtorgados(sOtorg);
        setSeguimientos(segList);
        setVentures(vList);
      } else if (tab === "redes") {
        const [rList, vList] = await Promise.all([
          api.getRedesSociales({
            canal: filterCanal !== "TODOS" ? filterCanal : undefined,
            search: searchRedes.trim() || undefined,
          }),
          api.getMunicipalEntrepreneurs(),
        ]);
        setRedesList(rList);
        setVentures(vList);
      } else if (tab === "auditoria") {
        const logs = await api.getMunicipalAuditLogs({ limit: 100 });
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error("Error al cargar pestaña municipal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchVentures = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await api.getMunicipalEntrepreneurs({
        search: searchQuery,
        estado: filterEstado,
      });
      setVentures(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenture = async (e: React.FormEvent) => {
    e.preventDefault();
    setVentureError(null);
    if (!ventureForm.codigo.trim() || !ventureForm.nombre.trim() || !ventureForm.responsable.trim()) {
      setVentureError("Código Oficial, Nombre y Responsable son obligatorios.");
      return;
    }
    try {
      setSavingVenture(true);
      await api.createMunicipalEntrepreneur(ventureForm);
      setShowCreateVentureModal(false);
      setVentureForm({
        codigo: "",
        nombre: "",
        nombreFantasia: "",
        responsable: "",
        documento: "",
        cuit: "",
        telefono: "",
        direccion: "",
        alias: "",
        cvu: "",
        cbu: "",
        mail: "",
        rubro: "",
        descripcion: "",
        porcentajeRetencion: 0,
        estado: "ACTIVO",
      });
      loadTabContent();
    } catch (error: any) {
      setVentureError(error.message || "Error al crear emprendimiento.");
    } finally {
      setSavingVenture(false);
    }
  };

  const handleCreateConvocatoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createConvocatoria(convForm);
      setShowCreateConvModal(false);
      setConvForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", estado: "ABIERTA", requisitos: "" });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al crear convocatoria.");
    }
  };

  const handlePostular = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPostulacion(postularForm);
      setShowPostularModal(false);
      setPostularForm({ convocatoriaId: "", emprendimientoId: "", observaciones: "" });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al registrar postulación.");
    }
  };

  const handleResolverPostulacion = async (id: string, nuevoEstado: string) => {
    const evaluacion = prompt(`Ingrese dictamen u observaciones para ${nuevoEstado}:`) || "";
    try {
      await api.updatePostulacionEstado(id, { estado: nuevoEstado, evaluacion });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al actualizar estado.");
    }
  };

  const handleCreateColectivo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createColectivo(colForm);
      setShowCreateColModal(false);
      setColForm({ nombre: "", descripcion: "", orientacion: "" });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al crear colectivo.");
    }
  };

  const handleAddMemberColectivo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addMiembroColectivo(addMemberForm.colectivoId, {
        emprendimientoId: addMemberForm.emprendimientoId,
        observaciones: addMemberForm.observaciones,
      });
      setShowAddMemberModal(false);
      setAddMemberForm({ colectivoId: "", emprendimientoId: "", observaciones: "" });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al afiliar miembro.");
    }
  };

  const handleBajaMemberColectivo = async (membresiaId: string) => {
    const motivo = prompt("Ingrese el motivo de la finalización de membresía:") || "Desvinculación administrativa";
    try {
      await api.removeMiembroColectivo(membresiaId, motivo);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al dar de baja.");
    }
  };

  const handleCreateEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEdicion(edicionForm);
      setShowCreateEdicionModal(false);
      setEdicionForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", estado: "PLANIFICADA" });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al crear edición.");
    }
  };

  const handleCreateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLocal(localForm);
      setShowCreateLocalModal(false);
      setLocalForm({ codigo: "", nombre: "", direccion: "", capacidad: 1 });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al crear local/stand.");
    }
  };

  const handleAddParticipacion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createParticipacion(partForm);
      setShowAddPartModal(false);
      setPartForm({ edicionId: "", emprendimientoId: "", localId: "", colectivoId: "", observaciones: "" });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al asignar participación.");
    }
  };

  const handleUpdateSeguidores = async (id: string, seguidores: number) => {
    try {
      await api.updateSeguidores(id, seguidores);
      setEditingSeguidoresId(null);
      setRedesList(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, seguidores, fechaSeguidores: new Date().toISOString() }
            : item
        )
      );
    } catch (error: any) {
      alert(error.message || "Error al actualizar seguidores.");
    }
  };

  const handleCreateRedSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.upsertPresenciaDigital(addRedForm);
      setShowAddRedModal(false);
      setAddRedForm({
        emprendimientoId: "",
        canal: "INSTAGRAM",
        url: "",
        usuarioRed: "",
        seguidores: 0,
        observaciones: "",
      });
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al registrar red social.");
    }
  };

  const handleUpdateConvocatoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateConvocatoria(editConvForm.id, {
        nombre: editConvForm.nombre,
        descripcion: editConvForm.descripcion,
        fechaInicio: editConvForm.fechaInicio,
        fechaFin: editConvForm.fechaFin || undefined,
        estado: editConvForm.estado,
        requisitos: editConvForm.requisitos,
      });
      setShowEditConvModal(false);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al actualizar convocatoria.");
    }
  };

  const handleUpdateColectivo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateColectivo(editColForm.id, {
        nombre: editColForm.nombre,
        descripcion: editColForm.descripcion,
        orientacion: editColForm.orientacion,
        puntosVenta: editColForm.puntosVenta,
        contacto: editColForm.contacto,
        redesSociales: editColForm.redesSociales,
        estado: editColForm.estado,
      });
      setShowEditColModal(false);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al actualizar colectivo.");
    }
  };

  const handleUpdateEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateEdicion(editEdicionForm.id, {
        nombre: editEdicionForm.nombre,
        descripcion: editEdicionForm.descripcion,
        fechaInicio: editEdicionForm.fechaInicio,
        fechaFin: editEdicionForm.fechaFin || undefined,
        estado: editEdicionForm.estado,
        observaciones: editEdicionForm.observaciones,
      });
      setShowEditEdicionModal(false);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al actualizar edición.");
    }
  };

  const handleUpdateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateLocal(editLocalForm.id, {
        codigo: editLocalForm.codigo,
        nombre: editLocalForm.nombre,
        direccion: editLocalForm.direccion,
        descripcion: editLocalForm.descripcion,
        capacidad: Number(editLocalForm.capacidad) || 1,
        activo: editLocalForm.activo,
      });
      setShowEditLocalModal(false);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al actualizar local.");
    }
  };

  const handleEditRedSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updatePresenciaDigital(editRedForm.id, {
        emprendimientoId: editRedForm.emprendimientoId,
        canal: editRedForm.canal,
        url: editRedForm.url,
        usuarioRed: editRedForm.usuarioRed,
        seguidores: Number(editRedForm.seguidores) || 0,
        estado: editRedForm.estado,
        observaciones: editRedForm.observaciones,
      });
      setShowEditRedModal(false);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al actualizar red social.");
    }
  };

  const handleDeleteRedSocial = async (id: string, nombre?: string) => {
    if (!confirm(`¿Estás seguro de desvincular la red social de ${nombre || "este emprendimiento"}?`)) {
      return;
    }
    try {
      await api.deletePresenciaDigital(id);
      loadTabContent();
    } catch (error: any) {
      alert(error.message || "Error al eliminar red social.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Gestión Municipal</span>
              <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full border border-orange-200 uppercase tracking-wide">
                Institucional
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Administración de emprendimientos, convocatorias, colectivos, ferias, controles y expedientes.
            </p>
          </div>
        </div>

        {tab === "emprendimientos" && (
          <button
            onClick={() => setShowCreateVentureModal(true)}
            className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-orange-600/10"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Emprendimiento Municipal</span>
          </button>
        )}

        {tab === "redes" && (
          <button
            onClick={() => setShowAddRedModal(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-pink-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Vincular Red Social</span>
          </button>
        )}
      </div>

      {/* Menú de Navegación de Pestañas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto select-none">
        <button
          onClick={() => setTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "dashboard"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tablero</span>
        </button>

        <button
          onClick={() => setTab("emprendimientos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "emprendimientos"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Emprendimientos</span>
        </button>

        <button
          onClick={() => setTab("convocatorias")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "convocatorias"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Convocatorias & Postulaciones</span>
        </button>

        <button
          onClick={() => setTab("colectivos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "colectivos"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Colectivos & Comunidades</span>
        </button>

        <button
          onClick={() => setTab("ediciones")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "ediciones"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Ediciones & Locales</span>
        </button>

        <button
          onClick={() => setTab("acompanamiento")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "acompanamiento"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Acompañamiento</span>
        </button>

        <button
          onClick={() => setTab("redes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "redes"
              ? "bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white shadow-md shadow-pink-600/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Instagram className={`w-4 h-4 ${tab === "redes" ? "text-white" : "text-pink-500"}`} />
          <span>Redes Sociales</span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "redes" ? "bg-white/20 text-white" : "bg-pink-100 text-pink-700"
            }`}
          >
            {redesList.length || "IG"}
          </span>
        </button>

        <button
          onClick={() => setTab("auditoria")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === "auditoria"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Auditoría & Trazabilidad</span>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
          Cargando información municipal...
        </div>
      ) : (
        <>
          {/* 1. DASHBOARD MUNICIPAL */}
          {tab === "dashboard" && stats && (
            <div className="space-y-6">
              {/* Tarjetas Principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 block">Emprendimientos Activos</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">{stats.emprendimientos.activos}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ {stats.emprendimientos.total} totales</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 block">Convocatorias Abiertas</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-orange-600">{stats.convocatorias.abiertas}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ {stats.convocatorias.total} registradas</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 block">Postulaciones Pendientes</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-600">{stats.postulaciones.pendientes}</span>
                    <span className="text-xs text-slate-400 font-semibold">({stats.postulaciones.aprobadas} aprobadas)</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 block">Seguimientos Pendientes</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-purple-600">{stats.seguimientos.pendientes}</span>
                    <span className="text-xs text-slate-400 font-semibold">por contactar</span>
                  </div>
                </div>
              </div>

              {/* Indicadores Secundarios */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Colectivos</span>
                    <span className="text-lg font-black text-slate-800 block">{stats.colectivos.total}</span>
                  </div>
                  <Users2 className="w-5 h-5 text-purple-500" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Ediciones en Curso</span>
                    <span className="text-lg font-black text-slate-800 block">{stats.ediciones.enCurso}</span>
                  </div>
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Locales / Stands</span>
                    <span className="text-lg font-black text-slate-800 block">{stats.locales.total}</span>
                  </div>
                  <Building2 className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Fiscalizaciones</span>
                    <span className="text-lg font-black text-slate-800 block">{stats.fiscalizaciones.total}</span>
                  </div>
                  <ClipboardCheck className="w-5 h-5 text-cyan-500" />
                </div>
              </div>

              {/* Tablas Resumen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Últimas Postulaciones */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-black text-sm text-slate-800 flex items-center justify-between">
                    <span>Últimas Postulaciones Recibidas</span>
                    <span className="text-xs font-semibold text-slate-400">{stats.ultimasPostulaciones?.length || 0} recientes</span>
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {stats.ultimasPostulaciones?.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 font-semibold">No hay postulaciones recientes.</div>
                    ) : (
                      stats.ultimasPostulaciones?.map((p: any) => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800 block">{p.emprendimiento?.nombre} ({p.emprendimiento?.codigo})</span>
                            <span className="text-[11px] text-slate-500 font-semibold">Convocatoria: {p.convocatoria?.nombre}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                            {p.estado}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Próximos Seguimientos */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-black text-sm text-slate-800 flex items-center justify-between">
                    <span>Interacciones & Próximos Contactos</span>
                    <span className="text-xs font-semibold text-slate-400">{stats.ultimosSeguimientos?.length || 0} recientes</span>
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {stats.ultimosSeguimientos?.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 font-semibold">No hay seguimientos registrados.</div>
                    ) : (
                      stats.ultimosSeguimientos?.map((s: any) => (
                        <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800 block">{s.emprendimiento?.nombre}</span>
                            <span className="text-[11px] text-slate-500">{s.motivo} ({s.tipo})</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-600">
                            {formatDateTime(s.fecha)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. EMPRENDIMIENTOS & EXPEDIENTES */}
          {tab === "emprendimientos" && (
            <div className="space-y-4">
              {/* Barra de Filtro y Búsqueda */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <form onSubmit={handleSearchVentures} className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por Código Oficial (AKM001), Nombre, CUIT o Responsable..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button type="submit" className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer">
                    Buscar
                  </button>
                </form>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Estado:</span>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="TODOS">Todos ({ventures.length})</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                    <option value="SUSPENDIDO">Suspendidos</option>
                    <option value="FINALIZADO">Finalizados</option>
                  </select>
                </div>
              </div>

              {/* Listado de Emprendimientos */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Código Oficial</th>
                      <th className="py-3 px-4">Emprendimiento</th>
                      <th className="py-3 px-4">Responsable</th>
                      <th className="py-3 px-4">Colectivos</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {ventures.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                          No se encontraron emprendimientos con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      ventures.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-black text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                              {v.codigo}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 block">{v.nombre}</span>
                            {v.nombreFantasia && <span className="text-[11px] text-slate-400">{v.nombreFantasia}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="block text-slate-800">{v.responsable}</span>
                            {v.telefono && <span className="text-[11px] text-slate-400 block">{v.telefono}</span>}
                          </td>
                          <td className="py-3 px-4">
                            {v.colectivos && v.colectivos.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {v.colectivos.map((c: any) => (
                                  <span key={c.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                    {c.colectivo?.nombre}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Sin colectivo</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              v.estado === "ACTIVO"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {v.estado || (v.activo ? "ACTIVO" : "INACTIVO")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedVentureForExpediente(v.id)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              Ver Expediente
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CONVOCATORIAS & POSTULACIONES */}
          {tab === "convocatorias" && (
            <div className="space-y-6">
              {/* Convocatorias */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Convocatorias Municipales</h3>
                    <p className="text-xs text-slate-500">Convocatorias públicas abiertas para ferias y programas.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPostularModal(true)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Postular Emprendimiento</span>
                    </button>
                    <button
                      onClick={() => setShowCreateConvModal(true)}
                      className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nueva Convocatoria</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {convocatorias.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                          {c.estado}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400">
                            {formatDateTime(c.fechaInicio)}
                          </span>
                          <button
                            onClick={() => {
                              setEditConvForm({
                                id: c.id,
                                nombre: c.nombre,
                                descripcion: c.descripcion || "",
                                fechaInicio: c.fechaInicio ? new Date(c.fechaInicio).toISOString().slice(0, 10) : "",
                                fechaFin: c.fechaFin ? new Date(c.fechaFin).toISOString().slice(0, 10) : "",
                                estado: c.estado,
                                requisitos: c.requisitos || "",
                              });
                              setShowEditConvModal(true);
                            }}
                            className="p-1 hover:bg-slate-200/80 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Editar convocatoria"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900">{c.nombre}</h4>
                      {c.descripcion && <p className="text-xs text-slate-600 line-clamp-2">{c.descripcion}</p>}
                      <div className="pt-2 border-t border-slate-200/60 text-xs font-bold text-slate-500">
                        {c._count?.postulaciones || 0} postulaciones registradas
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Postulaciones Recibidas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-black text-sm text-slate-900">
                  Listado de Postulaciones a Convocatorias
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Emprendimiento</th>
                      <th className="py-3 px-4">Convocatoria</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Dictamen / Observaciones</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {postulaciones.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">No hay postulaciones registradas.</td></tr>
                    ) : (
                      postulaciones.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(p.fecha)}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{p.emprendimiento?.nombre}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">({p.emprendimiento?.codigo})</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{p.convocatoria?.nombre}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              p.estado === "APROBADA"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : p.estado === "RECHAZADA"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {p.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {p.evaluacion || p.observaciones || "—"}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {p.estado === "PENDIENTE" && (
                              <>
                                <button
                                  onClick={() => handleResolverPostulacion(p.id, "APROBADA")}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => handleResolverPostulacion(p.id, "RECHAZADA")}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. COLECTIVOS & COMUNIDADES */}
          {tab === "colectivos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900">Colectivos y Comunidades de Emprendedores</h3>
                  <p className="text-xs text-slate-500">Un emprendimiento puede pertenecer a múltiples colectivos a lo largo de su historia.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Asociar a Colectivo</span>
                  </button>
                  <button
                    onClick={() => setShowCreateColModal(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Colectivo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {colectivos.map((col) => (
                  <div key={col.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {col.estado}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          {col.emprendimientos?.length || 0} miembros activos
                        </span>
                        <button
                          onClick={() => {
                            setEditColForm({
                              id: col.id,
                              nombre: col.nombre,
                              descripcion: col.descripcion || "",
                              orientacion: col.orientacion || "",
                              puntosVenta: col.puntosVenta || "",
                              contacto: col.contacto || "",
                              redesSociales: col.redesSociales || "",
                              estado: col.estado || "ACTIVO",
                            });
                            setShowEditColModal(true);
                          }}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                          title="Editar colectivo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-black text-base text-slate-900">{col.nombre}</h4>
                    {col.descripcion && <p className="text-xs text-slate-500 leading-relaxed">{col.descripcion}</p>}

                    {col.puntosVenta && (
                      <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-0.5">📍 Puntos de venta:</span>
                        <span className="text-slate-600">{col.puntosVenta}</span>
                      </div>
                    )}

                    {col.contacto && (
                      <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-0.5">✉️ Contacto:</span>
                        <span className="text-slate-600">{col.contacto}</span>
                      </div>
                    )}

                    {col.redesSociales && (
                      <div className="text-[11px] bg-pink-50/60 p-2.5 rounded-xl border border-pink-100/60">
                        <span className="font-bold text-pink-800 block mb-0.5">📱 Redes:</span>
                        <span className="text-slate-600">{col.redesSociales}</span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Miembros Actuales:</span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {col.emprendimientos?.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                            <span className="font-bold text-slate-800">{m.emprendimiento?.nombre} ({m.emprendimiento?.codigo})</span>
                            <button
                              onClick={() => handleBajaMemberColectivo(m.id)}
                              className="text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer ml-2"
                              title="Dar de baja de este colectivo"
                            >
                              Finalizar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. EDICIONES & LOCALES */}
          {tab === "ediciones" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubTabEdicion("ediciones")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      subTabEdicion === "ediciones" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    Ediciones / Ferias ({ediciones.length})
                  </button>
                  <button
                    onClick={() => setSubTabEdicion("locales")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      subTabEdicion === "locales" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    Locales & Stands Físicos ({locales.length})
                  </button>
                </div>

                <div className="flex gap-2">
                  {subTabEdicion === "ediciones" ? (
                    <>
                      <button
                        onClick={() => setShowAddPartModal(true)}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Asignar Emprendimiento a Local</span>
                      </button>
                      <button
                        onClick={() => setShowCreateEdicionModal(true)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Edición</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowCreateLocalModal(true)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Local/Stand</span>
                    </button>
                  )}
                </div>
              </div>

              {subTabEdicion === "ediciones" ? (
                <div className="space-y-4">
                  {ediciones.map((ed) => (
                    <div key={ed.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {ed.estado}
                          </span>
                          <h4 className="font-black text-lg text-slate-900">{ed.nombre}</h4>
                          <span className="text-xs text-slate-400 font-semibold">
                            Inicio: {formatDateTime(ed.fechaInicio)} {ed.fechaFin ? `• Fin: ${formatDateTime(ed.fechaFin)}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                            {ed.participaciones?.length || 0} emprendimientos asignados
                          </span>
                          <button
                            onClick={() => {
                              setEditEdicionForm({
                                id: ed.id,
                                nombre: ed.nombre,
                                descripcion: ed.descripcion || "",
                                fechaInicio: ed.fechaInicio ? new Date(ed.fechaInicio).toISOString().slice(0, 10) : "",
                                fechaFin: ed.fechaFin ? new Date(ed.fechaFin).toISOString().slice(0, 10) : "",
                                estado: ed.estado,
                                observaciones: ed.observaciones || "",
                              });
                              setShowEditEdicionModal(true);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Editar edición"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Participaciones en Locales/Stands:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {ed.participaciones?.map((part: any) => (
                            <div key={part.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                              <span className="font-extrabold text-slate-900 block">{part.emprendimiento?.nombre} ({part.emprendimiento?.codigo})</span>
                              <span className="text-[11px] text-orange-600 font-bold block">
                                Local/Puesto: {part.local ? `${part.local.codigo} - ${part.local.nombre}` : "Sin puesto fijo"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {locales.map((loc) => (
                    <div key={loc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                          {loc.codigo}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            loc.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                          }`}>
                            {loc.activo ? "Activo" : "Inactivo"}
                          </span>
                          <button
                            onClick={() => {
                              setEditLocalForm({
                                id: loc.id,
                                codigo: loc.codigo,
                                nombre: loc.nombre,
                                direccion: loc.direccion || "",
                                descripcion: loc.descripcion || "",
                                capacidad: loc.capacidad || 1,
                                activo: loc.activo,
                              });
                              setShowEditLocalModal(true);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Editar local"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-black text-sm text-slate-900">{loc.nombre}</h4>
                      {loc.direccion && <p className="text-xs text-slate-500 font-medium">📍 {loc.direccion}</p>}
                      {loc.descripcion && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">{loc.descripcion}</p>}
                      <span className="text-[11px] font-bold text-slate-400 block">Capacidad: {loc.capacidad} emprendedores</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. ACOMPAÑAMIENTO MUNICIPAL */}
          {tab === "acompanamiento" && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
                <button
                  onClick={() => setSubTabAcomp("fiscalizaciones")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    subTabAcomp === "fiscalizaciones" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Fiscalizaciones ({fiscalizaciones.length})
                </button>
                <button
                  onClick={() => setSubTabAcomp("capacitaciones")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    subTabAcomp === "capacitaciones" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Capacitaciones ({capacitaciones.length})
                </button>
                <button
                  onClick={() => setSubTabAcomp("reuniones")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    subTabAcomp === "reuniones" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Reuniones ({reuniones.length})
                </button>
                <button
                  onClick={() => setSubTabAcomp("servicios")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    subTabAcomp === "servicios" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Servicios Otorgados ({serviciosOtorgados.length})
                </button>
                <button
                  onClick={() => setSubTabAcomp("seguimientos")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    subTabAcomp === "seguimientos" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Seguimientos ({seguimientos.length})
                </button>
              </div>

              {/* Contenido sub-pestaña acompañamiento */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {subTabAcomp === "fiscalizaciones" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Emprendimiento</th>
                        <th className="py-3 px-4">Resultado</th>
                        <th className="py-3 px-4">Motivo / Observaciones</th>
                        <th className="py-3 px-4">Auditor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {fiscalizaciones.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400">No hay fiscalizaciones registradas.</td></tr>
                      ) : (
                        fiscalizaciones.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(f.fecha)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{f.emprendimiento?.nombre} ({f.emprendimiento?.codigo})</td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                f.resultado === "APROBADA"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {f.resultado}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{f.motivo || f.observaciones || "—"}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{f.usuario}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {subTabAcomp === "seguimientos" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Emprendimiento</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Motivo & Detalle</th>
                        <th className="py-3 px-4">Próximo Contacto</th>
                        <th className="py-3 px-4">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {seguimientos.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-slate-400">No hay seguimientos registrados.</td></tr>
                      ) : (
                        seguimientos.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(s.fecha)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{s.emprendimiento?.nombre}</td>
                            <td className="py-3 px-4 font-bold text-purple-700">{s.tipo}</td>
                            <td className="py-3 px-4 text-slate-600">{s.motivo}: {s.observacion}</td>
                            <td className="py-3 px-4 font-bold text-orange-600">
                              {s.proximoContacto ? formatDateTime(s.proximoContacto) : "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-500">{s.responsable}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {subTabAcomp === "reuniones" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Emprendimiento</th>
                        <th className="py-3 px-4">Tema</th>
                        <th className="py-3 px-4">Acuerdos</th>
                        <th className="py-3 px-4">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {reuniones.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400">No hay reuniones registradas.</td></tr>
                      ) : (
                        reuniones.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(r.fecha)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{r.emprendimiento?.nombre}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{r.tema}</td>
                            <td className="py-3 px-4 text-slate-600">{r.acuerdos || "—"}</td>
                            <td className="py-3 px-4 text-slate-500">{r.responsable}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {subTabAcomp === "capacitaciones" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Capacitación</th>
                        <th className="py-3 px-4">Lugar / Duración</th>
                        <th className="py-3 px-4">Asistentes</th>
                        <th className="py-3 px-4">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {capacitaciones.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400">No hay capacitaciones registradas.</td></tr>
                      ) : (
                        capacitaciones.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(c.fecha)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{c.nombre}</td>
                            <td className="py-3 px-4 text-slate-600">{c.lugar || "Municipio"} ({c.duracion || "Jornada"})</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{c._count?.participantes || 0} emprendedores</td>
                            <td className="py-3 px-4 text-slate-500">{c.responsable || "Área Capacitación"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {subTabAcomp === "servicios" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Emprendimiento</th>
                        <th className="py-3 px-4">Servicio Otorgado</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {serviciosOtorgados.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400">No hay servicios otorgados registrados.</td></tr>
                      ) : (
                        serviciosOtorgados.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(s.fecha)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{s.emprendimiento?.nombre}</td>
                            <td className="py-3 px-4 font-bold text-blue-700">{s.servicio?.nombre}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {s.estado}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{s.responsable || "Área Municipal"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 7. REDES SOCIALES & AUDIENCIA DIGITAL */}
          {tab === "redes" && (() => {
            const redesFiltradas = redesList.filter(item => {
              if (filterRubroRedes !== "TODOS" && item.emprendimiento?.rubro !== filterRubroRedes) {
                return false;
              }
              if (searchRedes.trim()) {
                const q = searchRedes.toLowerCase();
                const matchName = item.emprendimiento?.nombre?.toLowerCase().includes(q);
                const matchResp = item.emprendimiento?.responsable?.toLowerCase().includes(q);
                const matchUser = item.usuarioRed?.toLowerCase().includes(q);
                const matchUrl = item.url?.toLowerCase().includes(q);
                const matchRubro = item.emprendimiento?.rubro?.toLowerCase().includes(q);
                return matchName || matchResp || matchUser || matchUrl || matchRubro;
              }
              return true;
            });

            const totalSeguidores = redesList.reduce((acc, curr) => acc + (curr.seguidores || 0), 0);
            const totalInstagram = redesList.filter(r => r.canal === "INSTAGRAM").length;
            const topPerfil = [...redesList].sort((a, b) => (b.seguidores || 0) - (a.seguidores || 0))[0];
            const promedioSeguidores = redesList.length > 0 ? Math.round(totalSeguidores / redesList.length) : 0;

            return (
              <div className="space-y-6">
                {/* Header informativo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-pink-100 text-pink-600">
                        <Instagram className="w-5 h-5" />
                      </span>
                      <span>Redes Sociales & Seguidores de Emprendimientos</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Visualización y gestión del alcance digital, cuentas de Instagram y cantidad de seguidores de los emprendedores locales.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddRedModal(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Vincular Red Social</span>
                    </button>
                  </div>
                </div>

                {/* Tarjetas de Métricas / KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-white p-5 rounded-2xl border border-pink-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider">Total Seguidores</span>
                      <Users className="w-4 h-4 text-pink-600" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">
                        {totalSeguidores.toLocaleString("es-AR")}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold block mt-0.5">audiencia acumulada</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cuentas en Instagram</span>
                      <Instagram className="w-4 h-4 text-pink-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">{totalInstagram}</span>
                      <span className="text-xs text-slate-400 font-semibold block mt-0.5">perfiles activos</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mayor Audiencia</span>
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="mt-2 truncate">
                      <span className="text-lg font-black text-slate-900 block truncate">
                        {topPerfil?.usuarioRed || topPerfil?.emprendimiento?.nombre || "—"}
                      </span>
                      <span className="text-xs text-amber-600 font-bold block mt-0.5">
                        {topPerfil ? `${(topPerfil.seguidores || 0).toLocaleString("es-AR")} seguidores` : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Promedio por Perfil</span>
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">
                        {promedioSeguidores.toLocaleString("es-AR")}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold block mt-0.5">seguidores promedio</span>
                    </div>
                  </div>
                </div>

                {/* Barra de Filtros y Búsqueda */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3 w-full">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por emprendimiento, responsable o @usuario..."
                        value={searchRedes}
                        onChange={(e) => setSearchRedes(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                      />
                    </div>

                    <select
                      value={filterRubroRedes}
                      onChange={(e) => setFilterRubroRedes(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="TODOS">Todos los rubros</option>
                      <option value="CERAMICA">Cerámica</option>
                      <option value="ALIMENTOS">Alimentos</option>
                      <option value="TEXTIL">Textil</option>
                      <option value="TEJIDOS">Tejidos</option>
                      <option value="JOYERIA">Joyería</option>
                      <option value="ENCUADERNACION">Encuadernación</option>
                      <option value="REGIONALES">Regionales</option>
                      <option value="COSMETICA">Cosmética</option>
                      <option value="JUGUETES-JUEGOS">Juguetes / Juegos</option>
                    </select>

                    <select
                      value={filterCanal}
                      onChange={(e) => setFilterCanal(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="TODOS">Todas las redes</option>
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="TIKTOK">TikTok</option>
                      <option value="WEB">Web</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 self-end md:self-auto bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setViewModeRedes("cards")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewModeRedes === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Tarjetas
                    </button>
                    <button
                      onClick={() => setViewModeRedes("table")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewModeRedes === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Tabla
                    </button>
                  </div>
                </div>

                {/* VISTA TARJETAS */}
                {viewModeRedes === "cards" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {redesFiltradas.length === 0 ? (
                      <div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
                        No se encontraron cuentas o perfiles para la búsqueda actual.
                      </div>
                    ) : (
                      redesFiltradas.map((r) => {
                        const isEditing = editingSeguidoresId === r.id;
                        const handle = r.usuarioRed || (r.url.includes("instagram.com/") ? `@${r.url.split("instagram.com/")[1]?.replace(/\/$/, "")}` : null);

                        return (
                          <div
                            key={r.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4 relative group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] shadow-sm shrink-0">
                                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                                    <Instagram className="w-5 h-5 text-rose-600" />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-black text-sm text-slate-900 truncate">
                                    {r.emprendimiento?.nombre || "Emprendimiento"}
                                  </h4>
                                  <span className="text-[11px] text-slate-400 font-medium block truncate">
                                    {r.emprendimiento?.responsable}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {r.emprendimiento?.rubro && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {r.emprendimiento.rubro}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setEditRedForm({
                                      id: r.id,
                                      emprendimientoId: r.emprendimientoId,
                                      canal: r.canal || "INSTAGRAM",
                                      url: r.url,
                                      usuarioRed: r.usuarioRed || "",
                                      seguidores: r.seguidores || 0,
                                      estado: r.estado || "ACTIVO",
                                      observaciones: r.observaciones || "",
                                    });
                                    setShowEditRedModal(true);
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                                  title="Editar red social"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRedSocial(r.id, r.emprendimiento?.nombre)}
                                  className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Desvincular red social"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Handle y enlace directo */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Perfil:</span>
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-black text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:underline"
                                >
                                  <span>{handle || "Ver en Instagram"}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              {/* Seguidores & Edición rápida */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                <span className="text-xs font-bold text-slate-700">Seguidores:</span>
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      autoFocus
                                      value={nuevoSeguidoresVal}
                                      onChange={(e) => setNuevoSeguidoresVal(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleUpdateSeguidores(r.id, Number(nuevoSeguidoresVal) || 0);
                                        } else if (e.key === "Escape") {
                                          setEditingSeguidoresId(null);
                                        }
                                      }}
                                      className="w-24 px-2 py-1 text-xs font-bold border border-rose-300 rounded-lg focus:outline-hidden"
                                    />
                                    <button
                                      onClick={() => handleUpdateSeguidores(r.id, Number(nuevoSeguidoresVal) || 0)}
                                      className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                                      title="Guardar"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingSeguidoresId(null)}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-slate-900 bg-pink-50 text-pink-700 px-2.5 py-0.5 rounded-lg border border-pink-200/60">
                                      {(r.seguidores || 0).toLocaleString("es-AR")}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingSeguidoresId(r.id);
                                        setNuevoSeguidoresVal(r.seguidores || 0);
                                      }}
                                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                      title="Modificar cantidad de seguidores"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Contacto directo & WhatsApp */}
                            <div className="flex items-center justify-between text-xs pt-1">
                              {r.emprendimiento?.telefono ? (
                                <a
                                  href={`https://wa.me/${r.emprendimiento.telefono.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{r.emprendimiento.telefono}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 font-medium">Sin teléfono</span>
                              )}

                              {r.emprendimientoId && (
                                <button
                                  onClick={() => setSelectedVentureForExpediente(r.emprendimientoId)}
                                  className="text-slate-500 hover:text-slate-900 font-bold text-[11px] cursor-pointer"
                                >
                                  Ver Ficha →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* VISTA TABLA */}
                {viewModeRedes === "table" && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Emprendimiento</th>
                          <th className="py-3 px-4">Rubro</th>
                          <th className="py-3 px-4">Usuario / Canal</th>
                          <th className="py-3 px-4 text-center">Seguidores</th>
                          <th className="py-3 px-4">Teléfono</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {redesFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No hay perfiles que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          redesFiltradas.map((r) => {
                            const isEditing = editingSeguidoresId === r.id;
                            const handle = r.usuarioRed || (r.url.includes("instagram.com/") ? `@${r.url.split("instagram.com/")[1]?.replace(/\/$/, "")}` : null);

                            return (
                              <tr key={r.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4">
                                  <div className="font-black text-slate-900">{r.emprendimiento?.nombre}</div>
                                  <div className="text-[11px] text-slate-400 font-medium">{r.emprendimiento?.responsable} ({r.emprendimiento?.codigo})</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {r.emprendimiento?.rubro || "GENERAL"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-rose-600 hover:text-rose-700 font-black flex items-center gap-1"
                                  >
                                    <Instagram className="w-3.5 h-3.5" />
                                    <span>{handle || r.url}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        type="number"
                                        autoFocus
                                        value={nuevoSeguidoresVal}
                                        onChange={(e) => setNuevoSeguidoresVal(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            handleUpdateSeguidores(r.id, Number(nuevoSeguidoresVal) || 0);
                                          } else if (e.key === "Escape") {
                                            setEditingSeguidoresId(null);
                                          }
                                        }}
                                        className="w-20 px-2 py-1 text-xs font-bold border border-rose-300 rounded-lg text-center"
                                      />
                                      <button
                                        onClick={() => handleUpdateSeguidores(r.id, Number(nuevoSeguidoresVal) || 0)}
                                        className="p-1 bg-rose-600 text-white rounded-lg cursor-pointer"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingSeguidoresId(null)}
                                        className="p-1 bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingSeguidoresId(r.id);
                                        setNuevoSeguidoresVal(r.seguidores || 0);
                                      }}
                                      className="font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 hover:bg-rose-100 cursor-pointer"
                                      title="Clic para editar seguidores"
                                    >
                                      {(r.seguidores || 0).toLocaleString("es-AR")}
                                    </button>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                                  {r.emprendimiento?.telefono || "—"}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditRedForm({
                                          id: r.id,
                                          emprendimientoId: r.emprendimientoId,
                                          canal: r.canal || "INSTAGRAM",
                                          url: r.url,
                                          usuarioRed: r.usuarioRed || "",
                                          seguidores: r.seguidores || 0,
                                          estado: r.estado || "ACTIVO",
                                          observaciones: r.observaciones || "",
                                        });
                                        setShowEditRedModal(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors"
                                      title="Editar red social"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRedSocial(r.id, r.emprendimiento?.nombre)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                      title="Eliminar red social"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setSelectedVentureForExpediente(r.emprendimientoId)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer ml-1"
                                    >
                                      Ficha
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 8. AUDITORÍA & TRAZABILIDAD */}
          {tab === "auditoria" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-black text-sm text-slate-900">
                Bitácora Inmutable de Auditoría Municipal
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Entidad</th>
                    <th className="py-3 px-4">Detalle / ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">No hay registros de auditoría aún.</td></tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(log.fecha)}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{log.usuario}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-orange-600 font-black">{log.accion}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">{log.entidad}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{log.entidadId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal Ficha Integral / Expediente */}
      <VentureExpedienteModal
        ventureId={selectedVentureForExpediente}
        isOpen={!!selectedVentureForExpediente}
        onClose={() => setSelectedVentureForExpediente(null)}
        onUpdated={loadTabContent}
      />

      {/* Modal Crear Emprendimiento */}
      {showCreateVentureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Nuevo Emprendimiento Municipal</h3>
              <button onClick={() => setShowCreateVentureModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ventureError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{ventureError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVenture} className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium leading-relaxed">
                <strong>Regla de negocio:</strong> El Código Oficial es asignado por el Municipio (ej: <code>AKM001</code>, <code>EMP-025</code>, <code>BER001</code>). Ingrésalo manualmente.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código Oficial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AKM001"
                    value={ventureForm.codigo}
                    onChange={(e) => setVentureForm({ ...ventureForm, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl font-mono font-black text-sm uppercase focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cerámicas del Sur"
                    value={ventureForm.nombre}
                    onChange={(e) => setVentureForm({ ...ventureForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Responsable Titular *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre y Apellido"
                    value={ventureForm.responsable}
                    onChange={(e) => setVentureForm({ ...ventureForm, responsable: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CUIT / CUIL</label>
                  <input
                    type="text"
                    placeholder="20-xxxxxxxx-x"
                    value={ventureForm.cuit}
                    onChange={(e) => setVentureForm({ ...ventureForm, cuit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rubro</label>
                  <input
                    type="text"
                    placeholder="Artesanías, Textil, Cuero..."
                    value={ventureForm.rubro}
                    onChange={(e) => setVentureForm({ ...ventureForm, rubro: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="2944..."
                    value={ventureForm.telefono}
                    onChange={(e) => setVentureForm({ ...ventureForm, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="contacto@ejemplo.com"
                  value={ventureForm.mail}
                  onChange={(e) => setVentureForm({ ...ventureForm, mail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateVentureModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVenture}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {savingVenture ? "Creando..." : "Registrar Emprendimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Convocatoria */}
      {showCreateConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Nueva Convocatoria Municipal</h3>
            <form onSubmit={handleCreateConvocatoria} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Feria Invierno 2026"
                  value={convForm.nombre}
                  onChange={(e) => setConvForm({ ...convForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                <input
                  type="date"
                  required
                  value={convForm.fechaInicio}
                  onChange={(e) => setConvForm({ ...convForm, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={convForm.descripcion}
                  onChange={(e) => setConvForm({ ...convForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateConvModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Postular Emprendimiento */}
      {showPostularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Postular Emprendimiento a Convocatoria</h3>
            <form onSubmit={handlePostular} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Convocatoria *</label>
                <select
                  required
                  value={postularForm.convocatoriaId}
                  onChange={(e) => setPostularForm({ ...postularForm, convocatoriaId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Selecciona convocatoria...</option>
                  {convocatorias.filter(c => c.estado === "ABIERTA").map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emprendimiento *</label>
                <select
                  required
                  value={postularForm.emprendimientoId}
                  onChange={(e) => setPostularForm({ ...postularForm, emprendimientoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Selecciona emprendimiento...</option>
                  {ventures.map(v => (
                    <option key={v.id} value={v.id}>{v.codigo} - {v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={postularForm.observaciones}
                  onChange={(e) => setPostularForm({ ...postularForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPostularModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl">Postular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Colectivo */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Nuevo Colectivo / Comunidad</h3>
            <form onSubmit={handleCreateColectivo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Colectivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Artesanos del Sur"
                  value={colForm.nombre}
                  onChange={(e) => setColForm({ ...colForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Orientación / Rubro</label>
                <input
                  type="text"
                  placeholder="Ej: Textil, Cuero, Gastronomía..."
                  value={colForm.orientacion}
                  onChange={(e) => setColForm({ ...colForm, orientacion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={colForm.descripcion}
                  onChange={(e) => setColForm({ ...colForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateColModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-700 text-white font-bold rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asociar Miembro a Colectivo */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Asociar Emprendimiento a Colectivo</h3>
            <form onSubmit={handleAddMemberColectivo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Colectivo *</label>
                <select
                  required
                  value={addMemberForm.colectivoId}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, colectivoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Selecciona colectivo...</option>
                  {colectivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emprendimiento *</label>
                <select
                  required
                  value={addMemberForm.emprendimientoId}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, emprendimientoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Selecciona emprendimiento...</option>
                  {ventures.map(v => (
                    <option key={v.id} value={v.id}>{v.codigo} - {v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={addMemberForm.observaciones}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-700 text-white font-bold rounded-xl">Asociar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Edición */}
      {showCreateEdicionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Nueva Edición / Evento</h3>
            <form onSubmit={handleCreateEdicion} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Edición *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Feria de Navidad 2026"
                  value={edicionForm.nombre}
                  onChange={(e) => setEdicionForm({ ...edicionForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                <input
                  type="date"
                  required
                  value={edicionForm.fechaInicio}
                  onChange={(e) => setEdicionForm({ ...edicionForm, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={edicionForm.descripcion}
                  onChange={(e) => setEdicionForm({ ...edicionForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateEdicionModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Local */}
      {showCreateLocalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Nuevo Local o Stand Físico</h3>
            <form onSubmit={handleCreateLocal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código del Puesto / Stand *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: STAND-A"
                  value={localForm.codigo}
                  onChange={(e) => setLocalForm({ ...localForm, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre / Denominación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Stand Artesanías 01"
                  value={localForm.nombre}
                  onChange={(e) => setLocalForm({ ...localForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección / Ubicación</label>
                <input
                  type="text"
                  placeholder="Centro Cultural, Plaza Central..."
                  value={localForm.direccion}
                  onChange={(e) => setLocalForm({ ...localForm, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateLocalModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Participación a Local */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">Asignar Emprendimiento a Edición</h3>
            <form onSubmit={handleAddParticipacion} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Edición *</label>
                <select
                  required
                  value={partForm.edicionId}
                  onChange={(e) => setPartForm({ ...partForm, edicionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Selecciona edición...</option>
                  {ediciones.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emprendimiento *</label>
                <select
                  required
                  value={partForm.emprendimientoId}
                  onChange={(e) => setPartForm({ ...partForm, emprendimientoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Selecciona emprendimiento...</option>
                  {ventures.map(v => (
                    <option key={v.id} value={v.id}>{v.codigo} - {v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Local / Stand Físico Asignado</label>
                <select
                  value={partForm.localId}
                  onChange={(e) => setPartForm({ ...partForm, localId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="">Sin puesto fijo asignado</option>
                  {locales.map(l => (
                    <option key={l.id} value={l.id}>{l.codigo} - {l.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={partForm.observaciones}
                  onChange={(e) => setPartForm({ ...partForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddPartModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl">Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vincular Red Social */}
      {showAddRedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>Vincular Red Social a Emprendimiento</span>
              </h3>
              <button
                onClick={() => setShowAddRedModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRedSocial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emprendimiento *</label>
                <select
                  required
                  value={addRedForm.emprendimientoId}
                  onChange={(e) => setAddRedForm({ ...addRedForm, emprendimientoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="">Selecciona un emprendimiento...</option>
                  {ventures.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.codigo} - {v.nombre} ({v.responsable})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Red Social / Canal *</label>
                  <select
                    value={addRedForm.canal}
                    onChange={(e) => setAddRedForm({ ...addRedForm, canal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="WEB">Sitio Web</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usuario / Handle (@)</label>
                  <input
                    type="text"
                    placeholder="Ej: @nombre_taller"
                    value={addRedForm.usuarioRed}
                    onChange={(e) => setAddRedForm({ ...addRedForm, usuarioRed: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Completa *</label>
                <input
                  type="url"
                  required
                  placeholder="https://instagram.com/nombre_taller"
                  value={addRedForm.url}
                  onChange={(e) => setAddRedForm({ ...addRedForm, url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cantidad de Seguidores Inicial</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addRedForm.seguidores}
                  onChange={(e) => setAddRedForm({ ...addRedForm, seguidores: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={addRedForm.observaciones}
                  onChange={(e) => setAddRedForm({ ...addRedForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRedModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Red Social
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Convocatoria */}
      {showEditConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-600" />
                <span>Editar Convocatoria Municipal</span>
              </h3>
              <button
                onClick={() => setShowEditConvModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateConvocatoria} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={editConvForm.nombre}
                  onChange={(e) => setEditConvForm({ ...editConvForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={editConvForm.fechaInicio}
                    onChange={(e) => setEditConvForm({ ...editConvForm, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Fin</label>
                  <input
                    type="date"
                    value={editConvForm.fechaFin}
                    onChange={(e) => setEditConvForm({ ...editConvForm, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado</label>
                <select
                  value={editConvForm.estado}
                  onChange={(e) => setEditConvForm({ ...editConvForm, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="ABIERTA">ABIERTA</option>
                  <option value="CERRADA">CERRADA</option>
                  <option value="EN_EVALUACION">EN EVALUACIÓN</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Requisitos</label>
                <textarea
                  rows={2}
                  placeholder="Requisitos de participación..."
                  value={editConvForm.requisitos}
                  onChange={(e) => setEditConvForm({ ...editConvForm, requisitos: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={editConvForm.descripcion}
                  onChange={(e) => setEditConvForm({ ...editConvForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditConvModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Colectivo */}
      {showEditColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-700" />
                <span>Editar Colectivo / Agrupación</span>
              </h3>
              <button
                onClick={() => setShowEditColModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateColectivo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Colectivo *</label>
                <input
                  type="text"
                  required
                  value={editColForm.nombre}
                  onChange={(e) => setEditColForm({ ...editColForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orientación / Rubro</label>
                  <input
                    type="text"
                    value={editColForm.orientacion}
                    onChange={(e) => setEditColForm({ ...editColForm, orientacion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={editColForm.estado}
                    onChange={(e) => setEditColForm({ ...editColForm, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Puntos de Venta Físicos</label>
                <input
                  type="text"
                  placeholder="Ej: Local en Galería Sol, Stand Fijo Feria"
                  value={editColForm.puntosVenta}
                  onChange={(e) => setEditColForm({ ...editColForm, puntosVenta: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contacto / Teléfono / Coordinador</label>
                <input
                  type="text"
                  placeholder="Ej: Laura Pérez - 2944123456"
                  value={editColForm.contacto}
                  onChange={(e) => setEditColForm({ ...editColForm, contacto: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Redes Sociales / Instagram</label>
                <input
                  type="text"
                  placeholder="Ej: @colectivo_artesanal"
                  value={editColForm.redesSociales}
                  onChange={(e) => setEditColForm({ ...editColForm, redesSociales: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={editColForm.descripcion}
                  onChange={(e) => setEditColForm({ ...editColForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditColModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Edición */}
      {showEditEdicionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-900" />
                <span>Editar Edición / Evento</span>
              </h3>
              <button
                onClick={() => setShowEditEdicionModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateEdicion} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Edición *</label>
                <input
                  type="text"
                  required
                  value={editEdicionForm.nombre}
                  onChange={(e) => setEditEdicionForm({ ...editEdicionForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={editEdicionForm.fechaInicio}
                    onChange={(e) => setEditEdicionForm({ ...editEdicionForm, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Fin</label>
                  <input
                    type="date"
                    value={editEdicionForm.fechaFin}
                    onChange={(e) => setEditEdicionForm({ ...editEdicionForm, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado</label>
                <select
                  value={editEdicionForm.estado}
                  onChange={(e) => setEditEdicionForm({ ...editEdicionForm, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="PLANIFICADA">PLANIFICADA</option>
                  <option value="EN_CURSO">EN CURSO</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={editEdicionForm.descripcion}
                  onChange={(e) => setEditEdicionForm({ ...editEdicionForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas internas..."
                  value={editEdicionForm.observaciones}
                  onChange={(e) => setEditEdicionForm({ ...editEdicionForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditEdicionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Local */}
      {showEditLocalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Editar Local / Stand Físico</span>
              </h3>
              <button
                onClick={() => setShowEditLocalModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLocal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código del Puesto *</label>
                  <input
                    type="text"
                    required
                    value={editLocalForm.codigo}
                    onChange={(e) => setEditLocalForm({ ...editLocalForm, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacidad (Stands)</label>
                  <input
                    type="number"
                    min="1"
                    value={editLocalForm.capacidad}
                    onChange={(e) => setEditLocalForm({ ...editLocalForm, capacidad: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre / Denominación *</label>
                <input
                  type="text"
                  required
                  value={editLocalForm.nombre}
                  onChange={(e) => setEditLocalForm({ ...editLocalForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección / Ubicación</label>
                <input
                  type="text"
                  value={editLocalForm.direccion}
                  onChange={(e) => setEditLocalForm({ ...editLocalForm, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado</label>
                <select
                  value={editLocalForm.activo ? "ACTIVO" : "INACTIVO"}
                  onChange={(e) => setEditLocalForm({ ...editLocalForm, activo: e.target.value === "ACTIVO" })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="ACTIVO">Activo / Habilitado</option>
                  <option value="INACTIVO">Inactivo / Deshabilitado</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Horarios</label>
                <textarea
                  rows={2}
                  value={editLocalForm.descripcion}
                  onChange={(e) => setEditLocalForm({ ...editLocalForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditLocalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Red Social */}
      {showEditRedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>Editar Red Social</span>
              </h3>
              <button
                onClick={() => setShowEditRedModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditRedSocial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emprendimiento *</label>
                <select
                  required
                  value={editRedForm.emprendimientoId}
                  onChange={(e) => setEditRedForm({ ...editRedForm, emprendimientoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="">Selecciona un emprendimiento...</option>
                  {ventures.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.codigo} - {v.nombre} ({v.responsable})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Red Social / Canal *</label>
                  <select
                    value={editRedForm.canal}
                    onChange={(e) => setEditRedForm({ ...editRedForm, canal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="WEB">Sitio Web</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={editRedForm.estado}
                    onChange={(e) => setEditRedForm({ ...editRedForm, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usuario / Handle (@)</label>
                  <input
                    type="text"
                    placeholder="Ej: @nombre_taller"
                    value={editRedForm.usuarioRed}
                    onChange={(e) => setEditRedForm({ ...editRedForm, usuarioRed: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seguidores</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editRedForm.seguidores}
                    onChange={(e) => setEditRedForm({ ...editRedForm, seguidores: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Completa *</label>
                <input
                  type="url"
                  required
                  placeholder="https://instagram.com/nombre_taller"
                  value={editRedForm.url}
                  onChange={(e) => setEditRedForm({ ...editRedForm, url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={editRedForm.observaciones}
                  onChange={(e) => setEditRedForm({ ...editRedForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const ventureName = ventures.find(v => v.id === editRedForm.emprendimientoId)?.nombre;
                    handleDeleteRedSocial(editRedForm.id, ventureName);
                    setShowEditRedModal(false);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Red</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditRedModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
