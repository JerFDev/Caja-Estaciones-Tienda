import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Banknote,
  Smartphone,
  MapPin,
  Compass,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Building2,
  Package,
  ArrowRight,
  RefreshCw,
  Lock,
  Unlock,
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Printer,
  X,
  Clock,
  Percent,
  Tag,
} from "lucide-react";
import { api } from "../services/api";
import {
  Producto,
  Venta,
  Configuracion,
  MetodoPago,
  TipoCliente,
  Emprendimiento,
  SesionCajaActualInfo,
  DailySalesStats,
  SesionCaja,
} from "../types";
import { formatCurrency, formatDateTime } from "../utils/formatters";

interface SalesPOSPageProps {
  config: Configuracion | null;
}

export const SalesPOSPage: React.FC<SalesPOSPageProps> = ({ config }) => {
  // Estado de Caja y Sesión
  const [cajaInfo, setCajaInfo] = useState<SesionCajaActualInfo | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openMontoInicial, setOpenMontoInicial] = useState<number>(0);
  const [openTurno, setOpenTurno] = useState<"MANANA" | "TARDE">(
    config?.turnoActual || "MANANA",
  );
  const [openObservaciones, setOpenObservaciones] = useState("");
  const [openingCaja, setOpeningCaja] = useState(false);

  // Modal Cierre de Caja (Arqueo)
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeRealContado, setCloseRealContado] = useState<number>(0);
  const [closeObservaciones, setCloseObservaciones] = useState("");
  const [closingCaja, setClosingCaja] = useState(false);
  const [closedSummary, setClosedSummary] = useState<SesionCaja | null>(null);

  // Modal Ventas del Día y Estadísticas
  const [showDailyStatsModal, setShowDailyStatsModal] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailySalesStats | null>(null);
  const [loadingDailyStats, setLoadingDailyStats] = useState(false);

  // Emprendimientos
  const [ventures, setVentures] = useState<Emprendimiento[]>([]);
  const [selectedVenture, setSelectedVenture] = useState<Emprendimiento | null>(
    null,
  );
  const [ventureSearch, setVentureSearch] = useState("");

  // Productos
  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [ventureProducts, setVentureProducts] = useState<Producto[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  // Venta
  const [quantity, setQuantity] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("RESIDENTE");
  const [observaciones, setObservaciones] = useState("");
  const [copiedAlias, setCopiedAlias] = useState(false);

  // Descuento
  const [discountType, setDiscountType] = useState<"PORCENTAJE" | "MONTO">(
    "PORCENTAJE",
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [customDiscountInput, setCustomDiscountInput] = useState<string>("");
  const [showCustomAmount, setShowCustomAmount] = useState<boolean>(false);

  // Estado general
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showSaleSuccessPopup, setShowSaleSuccessPopup] = useState(false);

  const ventureInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Carga inicial
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [vList, pList, caja] = await Promise.all([
        api.getEntrepreneurs(false),
        api.getProducts({ inactivos: false }),
        api.getCashRegisterCurrentSession(),
      ]);
      setVentures(vList);
      setAllProducts(pList);
      setCajaInfo(caja);
      setTimeout(() => ventureInputRef.current?.focus(), 150);
    } catch (e: any) {
      console.error("Error al cargar datos del POS:", e);
    }
  };

  const refreshCajaStatus = async () => {
    try {
      const caja = await api.getCashRegisterCurrentSession();
      setCajaInfo(caja);
    } catch (e: any) {
      console.error("Error al actualizar estado de caja:", e);
    }
  };

  // Filtrar productos cuando cambia el emprendimiento seleccionado
  useEffect(() => {
    if (selectedVenture) {
      const prods = allProducts.filter(
        (p) => p.emprendimientoId === selectedVenture.id,
      );
      setVentureProducts(prods);
    } else {
      setVentureProducts([]);
    }
  }, [selectedVenture, allProducts]);

  // Manejo de atajos de teclado (F1, F2, F3, F4, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si hay un modal abierto, no capturar atajos de venta
      if (showOpenModal || showCloseModal || showDailyStatsModal) return;

      if (e.key === "F1") {
        e.preventDefault();
        setMetodoPago("EFECTIVO");
      } else if (e.key === "F2") {
        e.preventDefault();
        setMetodoPago("TRANSFERENCIA");
      } else if (e.key === "F3") {
        e.preventDefault();
        setTipoCliente("RESIDENTE");
      } else if (e.key === "F4") {
        e.preventDefault();
        setTipoCliente("TURISTA");
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (selectedProduct) {
          setSelectedProduct(null);
          setProductSearch("");
          productInputRef.current?.focus();
        } else if (selectedVenture) {
          setSelectedVenture(null);
          setVentureSearch("");
          ventureInputRef.current?.focus();
        } else {
          ventureInputRef.current?.focus();
        }
      } else if (e.key === "Enter") {
        // Si el foco está en un input de búsqueda, dejar que ese input gestione su propio Enter
        if (
          e.target === ventureInputRef.current ||
          e.target === productInputRef.current
        ) {
          return;
        }
        if (selectedProduct && !loading) {
          e.preventDefault();
          handleSubmitSale();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedProduct,
    selectedVenture,
    showOpenModal,
    showCloseModal,
    showDailyStatsModal,
    loading,
  ]);

  // Búsqueda inteligente desde el campo de Emprendimiento Vendedor al presionar ENTER
  const handleVentureSearchEnter = () => {
    const raw = ventureSearch.trim().toUpperCase();
    if (!raw) return;

    // 1. ¿Es código directo de un producto? (ej: AKM001 o akm001)
    const exactProd = allProducts.find(
      (p) => p.codigo.trim().toUpperCase() === raw,
    );
    if (exactProd) {
      const v = ventures.find((ev) => ev.id === exactProd.emprendimientoId);
      if (v) {
        setSelectedVenture(v);
      }
      setSelectedProduct(exactProd);
      setQuantity(1);
      setVentureSearch("");
      setFeedback({
        type: "success",
        message: `✓ ¡Producto seleccionado! [${exactProd.codigo}] ${exactProd.nombre} — ${formatCurrency(exactProd.precio)}`,
      });
      setTimeout(() => quantityInputRef.current?.focus(), 100);
      return;
    }

    // 2. ¿Es código de un emprendimiento? (ej: AKM o akm)
    const exactVenture = ventures.find(
      (ev) => ev.codigo.trim().toUpperCase() === raw,
    );
    if (exactVenture) {
      setSelectedVenture(exactVenture);
      setSelectedProduct(null);
      setVentureSearch("");
      setFeedback({
        type: "success",
        message: `✓ Emprendimiento seleccionado: [${exactVenture.codigo}] ${exactVenture.nombre}. Ahora seleccione el producto.`,
      });
      setTimeout(() => productInputRef.current?.focus(), 100);
      return;
    }

    // 3. Si hay emprendimientos filtrados en la lista, seleccionar el primero
    if (filteredVentures.length > 0) {
      handleSelectVenture(filteredVentures[0]);
      return;
    }

    // 4. No encontrado
    setFeedback({
      type: "error",
      message: `❌ No se encontró ningún producto ni emprendimiento con "${ventureSearch.trim()}".`,
    });
    ventureInputRef.current?.focus();
  };

  // Búsqueda inteligente desde el campo de Producto al presionar ENTER
  const handleProductSearchEnter = () => {
    const raw = productSearch.trim().toUpperCase();
    if (!raw) return;

    // 1. Buscar en el emprendimiento actual
    const exactProd = ventureProducts.find(
      (p) => p.codigo.trim().toUpperCase() === raw,
    );
    if (exactProd) {
      handleSelectProduct(exactProd);
      return;
    }

    // 2. Si no es de este emprendimiento, buscar en todo el catálogo
    const globalProd = allProducts.find(
      (p) => p.codigo.trim().toUpperCase() === raw,
    );
    if (globalProd) {
      const newV = ventures.find((ev) => ev.id === globalProd.emprendimientoId);
      if (newV) setSelectedVenture(newV);
      setSelectedProduct(globalProd);
      setQuantity(1);
      setProductSearch("");
      setFeedback({
        type: "success",
        message: `✓ ¡Producto seleccionado! [${globalProd.codigo}] ${globalProd.nombre} — ${formatCurrency(globalProd.precio)}`,
      });
      setTimeout(() => quantityInputRef.current?.focus(), 100);
      return;
    }

    // 3. Si hay productos filtrados, seleccionar el primero
    if (filteredProducts.length > 0) {
      handleSelectProduct(filteredProducts[0]);
      return;
    }

    setFeedback({
      type: "error",
      message: `❌ No se encontró ningún producto con el código "${productSearch.trim()}".`,
    });
    productInputRef.current?.focus();
  };

  const handleSelectVenture = (v: Emprendimiento) => {
    setSelectedVenture(v);
    setSelectedProduct(null);
    setVentureSearch("");
    setProductSearch("");
    setFeedback(null);
    setTimeout(() => productInputRef.current?.focus(), 100);
  };

  const handleSelectProduct = (p: Producto) => {
    setSelectedProduct(p);
    setProductSearch(p.codigo);
    setQuantity(1);
    setFeedback(null);
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleResetSale = () => {
    setSelectedProduct(null);
    setProductSearch("");
    setQuantity(1);
    setObservaciones("");
    setDiscountValue(0);
    setCustomDiscountInput("");
    setDiscountType("PORCENTAJE");
    setShowCustomAmount(false);
    setFeedback(null);
    setTimeout(() => {
      if (selectedVenture && productInputRef.current) {
        productInputRef.current.focus();
      } else {
        ventureInputRef.current?.focus();
      }
    }, 100);
  };

  const handleFullReset = () => {
    setSelectedVenture(null);
    setSelectedProduct(null);
    setVentureSearch("");
    setProductSearch("");
    setQuantity(1);
    setObservaciones("");
    setDiscountValue(0);
    setCustomDiscountInput("");
    setDiscountType("PORCENTAJE");
    setShowCustomAmount(false);
    setFeedback(null);
    setTimeout(() => ventureInputRef.current?.focus(), 100);
  };

  const handleCopyAlias = () => {
    const alias = selectedVenture?.alias;
    if (alias) {
      navigator.clipboard.writeText(alias);
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    }
  };

  const playSaleSuccessBell = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0.12;
      masterGain.connect(audioContext.destination);

      const notes = [880, 1174, 1318];
      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "triangle";
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.35,
          audioContext.currentTime + 0.02 + index * 0.05,
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + 0.28 + index * 0.08,
        );

        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        oscillator.start(audioContext.currentTime + index * 0.07);
        oscillator.stop(audioContext.currentTime + 0.55 + index * 0.08);
      });

      setTimeout(() => audioContext.close(), 800);
    } catch (error) {
      console.warn("No se pudo reproducir sonido de confirmación:", error);
    }
  };

  // Confirmar Venta
  const handleSubmitSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProduct) return;

    // Advertencia si la caja está cerrada
    if (!cajaInfo?.abierta) {
      const confirmOpen = window.confirm(
        "⚠️ La caja registradora está CERRADA.\n\n¿Deseas abrir la caja antes de registrar esta venta para asentar el fondo de cambio?",
      );
      if (confirmOpen) {
        setShowOpenModal(true);
        return;
      }
    }

    const stockActual = selectedProduct.stockCalculado ?? 0;
    const permitirNegativo = config?.permitirStockNegativo ?? false;

    if (quantity <= 0) {
      setFeedback({
        type: "error",
        message: "La cantidad debe ser mayor a 0.",
      });
      return;
    }

    if (stockActual < quantity && !permitirNegativo) {
      setFeedback({
        type: "error",
        message: `Stock insuficiente. Disponible: ${stockActual}, solicitado: ${quantity}.`,
      });
      return;
    }

    try {
      setLoading(true);
      const nuevaVenta = await api.createSale({
        productoId: selectedProduct.id,
        cantidad: quantity,
        descuento: discountAmount,
        metodoPago,
        tipoCliente,
        turno: config?.turnoActual,
        observaciones: observaciones.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: `¡Venta registrada con éxito! Total: ${formatCurrency(nuevaVenta.total)}${discountAmount > 0 ? ` (Descuento: -${formatCurrency(discountAmount)})` : ""} (${nuevaVenta.producto?.nombre})`,
      });
      setShowSaleSuccessPopup(true);
      playSaleSuccessBell();

      // Recargar stock y estado de caja
      const updatedProducts = await api.getProducts({ inactivos: false });
      setAllProducts(updatedProducts);
      await refreshCajaStatus();

      handleResetSale();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al registrar venta.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Apertura de Caja
  const handleOpenCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOpeningCaja(true);
      await api.openCashRegister({
        montoInicial: openMontoInicial,
        turno: openTurno,
        observaciones: openObservaciones,
      });
      setShowOpenModal(false);
      setOpenObservaciones("");
      await refreshCajaStatus();
      setFeedback({
        type: "success",
        message: `Caja abierta con éxito. Fondo inicial: ${formatCurrency(openMontoInicial)} (Turno ${openTurno === "MANANA" ? "Mañana" : "Tarde"}).`,
      });
    } catch (err: any) {
      alert(err.message || "Error al abrir caja");
    } finally {
      setOpeningCaja(false);
    }
  };

  // Cierre de Caja
  const handleOpenCloseModal = () => {
    const esperado = cajaInfo?.totalesEnVivo?.montoEsperadoEfectivo ?? 0;
    setCloseRealContado(esperado);
    setCloseObservaciones("");
    setShowCloseModal(true);
  };

  const handleCloseCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setClosingCaja(true);
      const cerrada = await api.closeCashRegister({
        montoRealContado: closeRealContado,
        observaciones: closeObservaciones,
      });
      setShowCloseModal(false);
      setClosedSummary(cerrada);
      await refreshCajaStatus();
      setFeedback({
        type: "success",
        message: `Caja cerrada exitosamente. Arqueo completado.`,
      });
    } catch (err: any) {
      alert(err.message || "Error al cerrar caja");
    } finally {
      setClosingCaja(false);
    }
  };

  // Cargar Ventas del Día
  const handleOpenDailyStats = async () => {
    try {
      setLoadingDailyStats(true);
      setShowDailyStatsModal(true);
      const data = await api.getDailySalesStats();
      setDailyStats(data);
    } catch (err: any) {
      console.error("Error cargando estadísticas del día:", err);
    } finally {
      setLoadingDailyStats(false);
    }
  };

  // Filtrado de emprendimientos
  const filteredVentures = ventureSearch.trim()
    ? ventures.filter(
        (v) =>
          v.codigo.toLowerCase().includes(ventureSearch.toLowerCase()) ||
          v.nombre.toLowerCase().includes(ventureSearch.toLowerCase()) ||
          v.responsable.toLowerCase().includes(ventureSearch.toLowerCase()) ||
          (v.rubro &&
            v.rubro.toLowerCase().includes(ventureSearch.toLowerCase())),
      )
    : ventures;

  // Filtrado de productos
  const filteredProducts = productSearch.trim()
    ? ventureProducts.filter(
        (p) =>
          p.codigo.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.nombre.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : ventureProducts;

  const stockActual = selectedProduct?.stockCalculado ?? 0;
  const precioUnitario = selectedProduct?.precio ?? 0;
  const subtotalOperacion = quantity * precioUnitario;

  const discountAmount = Math.max(
    0,
    discountType === "PORCENTAJE"
      ? Math.round(subtotalOperacion * (discountValue / 100) * 100) / 100
      : Math.min(subtotalOperacion, discountValue),
  );

  const totalOperacion = Math.max(
    0,
    Math.round((subtotalOperacion - discountAmount) * 100) / 100,
  );
  const hayStockSuficiente =
    stockActual >= quantity || (config?.permitirStockNegativo ?? false);

  const esperadoCaja = cajaInfo?.totalesEnVivo?.montoEsperadoEfectivo ?? 0;
  const diferenciaArqueo =
    Math.round((closeRealContado - esperadoCaja) * 100) / 100;

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* ============================================================ */}
      {/* BARRA SUPERIOR: CONTROL DE CAJA Y ACCESOS RÁPIDOS */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 rounded-3xl border-2 border-orange-600/30 px-5 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 shrink-0 text-white">
        {/* Título de Sección */}
        <div className="flex items-center space-x-3 mr-2">
          <div className="p-2.5 bg-white/20 text-white rounded-2xl backdrop-blur-xs shadow-xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white leading-tight">
              Caja (POS)
            </h2>
            <p className="text-[11px] font-bold text-orange-100">
              Terminal de Cobro Rápido
            </p>
          </div>
        </div>

        {/* Estado de Caja */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {cajaInfo?.abierta ? (
            <div className="flex items-center space-x-2.5 bg-white text-emerald-950 border-2 border-emerald-300 px-4 py-2 rounded-2xl text-xs font-black shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="flex items-center space-x-2 flex-wrap">
                <span>Caja Abierta</span>
                <span className="text-emerald-400">•</span>
                <span>
                  Fondo: {formatCurrency(cajaInfo.sesion?.montoInicial ?? 0)}
                </span>
                <span className="text-emerald-400">•</span>
                <span>
                  Turno:{" "}
                  {cajaInfo.sesion?.turno === "MANANA" ? "Mañana" : "Tarde"}
                </span>
                {cajaInfo.totalesEnVivo && (
                  <>
                    <span className="text-emerald-400">•</span>
                    <span className="font-black text-slate-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                      En Cajón:{" "}
                      {formatCurrency(
                        cajaInfo.totalesEnVivo.montoEsperadoEfectivo,
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-white text-rose-800 border-2 border-rose-300 px-4 py-2 rounded-2xl text-xs font-black shadow-sm">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Caja Cerrada</span>
            </div>
          )}

          {/* Botón de Apertura / Cierre */}
          {cajaInfo?.abierta ? (
            <button
              type="button"
              onClick={handleOpenCloseModal}
              className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-4 py-2 rounded-2xl text-xs shadow-md border-2 border-rose-400 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-white" />
              <span>Cerrar Caja (Arqueo)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpenMontoInicial(0);
                setOpenTurno(config?.turnoActual || "MANANA");
                setShowOpenModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-2xl text-xs sm:text-sm shadow-lg border-2 border-emerald-400 transition-all cursor-pointer animate-pulse"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caja para Iniciar Turno</span>
            </button>
          )}
        </div>

        {/* Botón Ventas del Día y Estadísticas */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleOpenDailyStats}
            className="inline-flex items-center space-x-2 bg-white hover:bg-orange-50 text-slate-900 font-black px-4 py-2 rounded-2xl text-xs border-2 border-white shadow-md transition-all cursor-pointer active:scale-95"
          >
            <BarChart3 className="w-4 h-4 text-orange-600" />
            <span>Ventas del Día</span>
            {cajaInfo?.totalesEnVivo && (
              <span className="font-mono bg-orange-100 text-orange-950 px-2.5 py-0.5 rounded-lg border border-orange-200 font-black">
                {formatCurrency(cajaInfo.totalesEnVivo.totalVentas)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Barra de feedback / alertas */}
      {feedback && (
        <div
          className={`px-5 py-3 rounded-2xl flex items-center justify-between border-2 shadow-xs shrink-0 ${
            feedback.type === "success"
              ? "bg-orange-50 text-orange-950 border-orange-300"
              : "bg-red-50 text-red-900 border-red-300"
          }`}
        >
          <div className="flex items-center space-x-3">
            {feedback.type === "success" ? (
              <CheckCircle className="w-6 h-6 text-orange-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            )}
            <span className="font-black text-sm sm:text-base">
              {feedback.message}
            </span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
      )}

      {showSaleSuccessPopup && (
        <>
          <style>{`
            @keyframes saleCurtain {
              0% {
                transform: translateY(-120%);
                opacity: 0;
                border-radius: 0 0 50% 50%;
              }
              20% {
                opacity: 1;
              }
              100% {
                transform: translateY(0%);
                opacity: 1;
                border-radius: 0 0 36% 36%;
              }
            }

            @keyframes saleButtonBounce {
              0% {
                transform: scale(0.8);
              }
              45% {
                transform: scale(1.08);
              }
              70% {
                transform: scale(0.98);
              }
              100% {
                transform: scale(1);
              }
            }

            @keyframes saleCheckDraw {
              0% {
                stroke-dasharray: 0 100;
                opacity: 0;
              }
              100% {
                stroke-dasharray: 100 100;
                opacity: 1;
              }
            }

            @keyframes salePulse {
              0% {
                transform: scale(0.9);
                opacity: 0.9;
              }
              70% {
                transform: scale(1.4);
                opacity: 0;
              }
              100% {
                transform: scale(1.7);
                opacity: 0;
              }
            }
          `}</style>

          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-sky-950/10 backdrop-blur-[2px]">
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <div
                className="absolute inset-x-[-12%] top-0 bottom-0 bg-gradient-to-b from-sky-200 via-sky-400 to-blue-700 shadow-[0_30px_70px_rgba(59,130,246,0.25)]"
                style={{
                  animation:
                    "saleCurtain 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              />
              <div
                className="absolute inset-x-[-10%] top-0 bottom-0 bg-gradient-to-r from-cyan-300/80 via-sky-300/80 to-blue-600/80 blur-[2px]"
                style={{
                  animation:
                    "saleCurtain 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              />

              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full border-4 border-white/50"
                    style={{
                      animation: "salePulse 1.2s ease-out 0.7s infinite",
                    }}
                  />
                  <span
                    className="absolute inset-[-12px] rounded-full border-4 border-lime-200/80"
                    style={{
                      animation: "salePulse 1.2s ease-out 0.35s infinite",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowSaleSuccessPopup(false)}
                    className="relative z-10 flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-white/80 bg-gradient-to-br from-lime-300 via-green-400 to-emerald-500 shadow-[0_18px_35px_rgba(16,185,129,0.45)] transition-transform duration-200 hover:scale-105"
                    style={{
                      animation:
                        "saleButtonBounce 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.9s both",
                    }}
                    aria-label="Cerrar confirmación de venta"
                  >
                    <svg
                      viewBox="0 0 52 52"
                      className="h-12 w-12"
                      style={{
                        animation: "saleCheckDraw 0.6s ease-out 1.3s both",
                      }}
                      aria-hidden="true"
                    >
                      <path
                        d="M14 27.5L22 35L39 18"
                        fill="none"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="100"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-7 flex max-w-md flex-col items-center text-center text-white drop-shadow-[0_4px_10px_rgba(14,116,144,0.45)]">
                  <p className="text-2xl font-black leading-snug">
                    ¡Felicitaciones!
                  </p>
                  <p className="mt-1 text-2xl font-black leading-snug">
                    Se vendió tu producto
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSaleSuccessPopup(false)}
                    className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-white/90 underline decoration-white/70 underline-offset-4 transition-opacity hover:opacity-100"
                  >
                    Hacé clic para cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* CONTENEDOR PRINCIPAL POS: ANCHO AMPLIADO (MAX-W-5XL) Y ERGONÓMICO */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto max-w-5xl w-full mx-auto pb-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-7">
          {/* 1. SELECCIÓN DE EMPRENDIMIENTO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Emprendimiento Vendedor</span>
              </label>
              {selectedVenture && (
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-black flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Cambiar Emprendimiento [Esc]</span>
                </button>
              )}
            </div>

            {!selectedVenture ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={ventureInputRef}
                    type="text"
                    placeholder="Ingresar código de producto (ej: AKM001), código de emprendimiento (ej: AKM) o nombre..."
                    value={ventureSearch}
                    onChange={(e) => setVentureSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleVentureSearchEnter();
                      }
                    }}
                    className="w-full h-14 pl-12 pr-4 text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-xs"
                  />
                </div>

                {/* Grid de emprendimientos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {filteredVentures.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVenture(v)}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50 text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <span className="font-mono text-xs font-black bg-slate-100 group-hover:bg-orange-100 text-slate-800 group-hover:text-orange-800 px-2 py-0.5 rounded-md">
                        {v.codigo}
                      </span>
                      <p className="font-extrabold text-sm text-slate-900 truncate mt-1.5">
                        {v.nombre}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {v.responsable}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-orange-50/90 border-2 border-orange-300 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <span className="font-mono text-base font-black bg-orange-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
                    {selectedVenture.codigo}
                  </span>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl leading-tight">
                      {selectedVenture.nombre}
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                      Titular:{" "}
                      <strong className="text-slate-900">
                        {selectedVenture.responsable}
                      </strong>{" "}
                      • {ventureProducts.length} productos en catálogo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="text-xs sm:text-sm bg-white hover:bg-orange-100 text-orange-900 font-extrabold px-4 py-2 rounded-xl border border-orange-300 shadow-xs transition-all cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* 2. SELECCIÓN DE PRODUCTO */}
          <div
            className={`space-y-3 ${selectedVenture ? "opacity-100" : "opacity-40 pointer-events-none"}`}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Seleccionar Producto</span>
              </label>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={handleResetSale}
                  className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-black underline cursor-pointer"
                >
                  Elegir otro producto
                </button>
              )}
            </div>

            {!selectedProduct ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={productInputRef}
                    type="text"
                    placeholder={
                      selectedVenture
                        ? `Escribe código o nombre del producto de ${selectedVenture.nombre}...`
                        : "Primero selecciona un emprendimiento arriba"
                    }
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      const clean = e.target.value.trim().toUpperCase();
                      const exact = ventureProducts.find(
                        (p) => p.codigo.toUpperCase() === clean,
                      );
                      if (exact) handleSelectProduct(exact);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleProductSearchEnter();
                      }
                    }}
                    className="w-full h-14 pl-12 pr-4 text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-xs"
                  />
                </div>

                {/* Grid de productos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-sm text-slate-400 font-bold">
                      No hay productos que coincidan con la búsqueda.
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50 flex items-center justify-between text-left transition-all cursor-pointer shadow-xs group"
                      >
                        <div className="truncate mr-2">
                          <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                            {p.codigo}
                          </span>
                          <p className="font-bold text-sm text-slate-900 truncate mt-1">
                            {p.nombre}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-orange-600 text-base block">
                            {formatCurrency(p.precio)}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              (p.stockCalculado ?? 0) > 0
                                ? "text-emerald-700"
                                : "text-red-500"
                            }`}
                          >
                            Stock: {p.stockCalculado ?? 0}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-sm font-black bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg">
                      {selectedProduct.codigo}
                    </span>
                    <h4 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {selectedProduct.nombre}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3 mt-1.5 text-xs sm:text-sm text-slate-600 font-semibold">
                    <span>
                      Stock disponible:{" "}
                      <strong
                        className={`font-black ${
                          stockActual > 0 ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {stockActual} u.
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase block">
                    Precio Unitario
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    {formatCurrency(precioUnitario)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. DATOS DE COBRO (ABAJO DEL EMPRENDIMIENTO Y DEL PRODUCTO) */}
          {selectedProduct && (
            <div className="pt-5 border-t-2 border-slate-200 space-y-6 animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Datos del Cobro</span>
              </label>

              {/* Cantidad y Medio de Pago en fila */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Cantidad a Vender
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-16 h-14 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-2xl text-2xl transition-colors disabled:opacity-50 cursor-pointer border-2 border-slate-300"
                    >
                      -
                    </button>
                    <input
                      ref={quantityInputRef}
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSubmitSale();
                        }
                      }}
                      className="flex-1 h-14 text-center text-2xl font-black bg-white border-2 border-slate-300 rounded-2xl focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-16 h-14 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-2xl text-2xl transition-colors cursor-pointer border-2 border-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Forma de Pago */}
                <div>
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Forma de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-3 h-14">
                    <button
                      type="button"
                      onClick={() => setMetodoPago("EFECTIVO")}
                      className={`rounded-2xl border-2 flex items-center justify-center space-x-2 font-black text-sm sm:text-base transition-all cursor-pointer ${
                        metodoPago === "EFECTIVO"
                          ? "border-emerald-600 bg-emerald-100 text-emerald-950 shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Banknote className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span>Efectivo [F1]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoPago("TRANSFERENCIA")}
                      className={`rounded-2xl border-2 flex items-center justify-center space-x-2 font-black text-sm sm:text-base transition-all cursor-pointer ${
                        metodoPago === "TRANSFERENCIA"
                          ? "border-blue-600 bg-blue-100 text-blue-950 shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Smartphone className="w-6 h-6 text-blue-600 shrink-0" />
                      <span>Transf. [F2]</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Si es Transferencia: Tarjeta Limpia y Destacada del Alias */}
              {metodoPago === "TRANSFERENCIA" && selectedVenture && (
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-5 shadow-lg border-2 border-blue-700 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-2.5">
                    <Smartphone className="w-5 h-5 text-blue-300" />
                    <h4 className="font-black text-sm uppercase tracking-wider text-blue-200">
                      Datos de Transferencia Bancaria ({selectedVenture.nombre})
                    </h4>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block">
                        Alias para Transferencia
                      </span>
                      <p className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wide mt-1 select-all">
                        {selectedVenture.alias || "SIN ALIAS REGISTRADO"}
                      </p>
                      <p className="text-xs sm:text-sm text-blue-200 font-semibold mt-1">
                        Titular:{" "}
                        <strong className="text-white">
                          {selectedVenture.responsable}
                        </strong>
                        {selectedVenture.cvu && (
                          <span>
                            {" "}
                            • CVU:{" "}
                            <strong className="text-white font-mono">
                              {selectedVenture.cvu}
                            </strong>
                          </span>
                        )}
                      </p>
                    </div>

                    {selectedVenture.alias && (
                      <button
                        type="button"
                        onClick={handleCopyAlias}
                        className="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-3 rounded-2xl text-sm transition-colors shadow-md cursor-pointer self-start sm:self-center shrink-0"
                      >
                        {copiedAlias ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span>
                          {copiedAlias ? "¡Copiado!" : "Copiar Alias"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tipo de Cliente y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Perfil de Comprador
                  </label>
                  <div className="grid grid-cols-2 gap-3 h-12">
                    <button
                      type="button"
                      onClick={() => setTipoCliente("RESIDENTE")}
                      className={`rounded-2xl border-2 flex items-center justify-center space-x-2 font-black text-sm transition-all cursor-pointer ${
                        tipoCliente === "RESIDENTE"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>Residente [F3]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoCliente("TURISTA")}
                      className={`rounded-2xl border-2 flex items-center justify-center space-x-2 font-black text-sm transition-all cursor-pointer ${
                        tipoCliente === "TURISTA"
                          ? "border-purple-600 bg-purple-50 text-purple-900 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Compass className="w-4 h-4 text-purple-600" />
                      <span>Turista [F4]</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Observaciones (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nota o comprobante..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full h-12 px-4 text-sm font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descuento */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-black uppercase text-slate-700">
                      Descuento
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300 shadow-xs">
                        Ahorro: -{formatCurrency(discountAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountValue(0);
                          setCustomDiscountInput("");
                          setDiscountType("PORCENTAJE");
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                {!showCustomAmount ? (
                  <div className="space-y-3">
                    {/* Control Stepper de incremento de a 5% */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <button
                        type="button"
                        disabled={
                          discountType === "PORCENTAJE" && discountValue <= 0
                        }
                        onClick={() => {
                          setDiscountType("PORCENTAJE");
                          const nextVal = Math.max(
                            0,
                            (discountType === "PORCENTAJE"
                              ? discountValue
                              : 0) - 5,
                          );
                          setDiscountValue(nextVal);
                        }}
                        className="col-span-3 h-12 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-800 border-2 border-slate-300 rounded-xl font-black text-sm sm:text-base flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-xs active:scale-95 select-none"
                        title="Disminuir 5%"
                      >
                        <span className="text-lg leading-none font-black">
                          −
                        </span>
                        <span>5%</span>
                      </button>

                      <div className="col-span-6 h-12 bg-white border-2 border-orange-500/50 rounded-xl flex flex-col items-center justify-center px-2 shadow-xs">
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-xl sm:text-2xl font-black text-slate-900">
                            {discountType === "PORCENTAJE"
                              ? `${discountValue}%`
                              : formatCurrency(discountValue)}
                          </span>
                          {discountAmount > 0 && (
                            <span className="text-xs font-black text-emerald-600">
                              (-{formatCurrency(discountAmount)})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 -mt-0.5">
                          {discountValue === 0
                            ? "Sin descuento"
                            : "Descuento aplicado"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={
                          discountType === "PORCENTAJE" && discountValue >= 100
                        }
                        onClick={() => {
                          setDiscountType("PORCENTAJE");
                          const nextVal = Math.min(
                            100,
                            (discountType === "PORCENTAJE"
                              ? discountValue
                              : 0) + 5,
                          );
                          setDiscountValue(nextVal);
                        }}
                        className="col-span-3 h-12 bg-orange-600 hover:bg-orange-700 disabled:opacity-30 disabled:hover:bg-orange-600 text-white rounded-xl font-black text-sm sm:text-base flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-md shadow-orange-600/20 active:scale-95 select-none"
                        title="Incrementar 5%"
                      >
                        <span className="text-lg leading-none font-black">
                          +
                        </span>
                        <span>5%</span>
                      </button>
                    </div>

                    {/* Accesos rápidos habituales de 5% */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => {
                        const isSelected =
                          discountType === "PORCENTAJE" &&
                          discountValue === pct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setDiscountType("PORCENTAJE");
                              setDiscountValue(pct);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer border-2 ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            {pct === 0 ? "0%" : `${pct}%`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-right pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomAmount(true);
                          setDiscountType("MONTO");
                          setDiscountValue(0);
                        }}
                        className="text-xs font-bold text-orange-950 hover:text-orange-950 bg-orange-200 hover:bg-orange-300 border border-orange-300 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                      >
                        ¿Ingresar monto fijo en pesos ($)?
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo opcional: monto fijo en pesos */
                  <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={subtotalOperacion}
                          step="50"
                          placeholder="Monto en pesos a descontar"
                          value={
                            discountType === "MONTO" && discountValue > 0
                              ? discountValue
                              : ""
                          }
                          onChange={(e) => {
                            const num = parseFloat(e.target.value) || 0;
                            setDiscountType("MONTO");
                            setDiscountValue(
                              Math.min(subtotalOperacion, Math.max(0, num)),
                            );
                          }}
                          className="w-full h-11 pl-8 pr-3 text-sm font-black bg-white border-2 border-slate-300 rounded-xl focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomAmount(false);
                          setDiscountType("PORCENTAJE");
                          setDiscountValue(0);
                        }}
                        className="h-11 px-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                      >
                        Volver a %
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total y Botón de Confirmación */}
              <div className="pt-4 border-t-2 border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm uppercase font-black text-slate-500 tracking-wider">
                        Total a Cobrar
                      </span>
                      {discountAmount > 0 && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Descuento: -{formatCurrency(discountAmount)}
                        </span>
                      )}
                    </div>
                    <p className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                      {formatCurrency(totalOperacion)}
                    </p>
                    {discountAmount > 0 && (
                      <p className="text-xs font-semibold text-slate-500">
                        Subtotal original:{" "}
                        <span className="line-through">
                          {formatCurrency(subtotalOperacion)}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="sm:text-right text-xs sm:text-sm font-bold text-slate-600">
                    <span className="block">
                      {quantity} u. de {selectedProduct.nombre}
                    </span>
                    <span className="block text-slate-400 font-semibold mt-0.5">
                      {metodoPago} • {tipoCliente} • Turno{" "}
                      {config?.turnoActual === "MANANA" ? "Mañana" : "Tarde"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!cajaInfo?.abierta) {
                      setOpenMontoInicial(0);
                      setOpenTurno(config?.turnoActual || "MANANA");
                      setShowOpenModal(true);
                      return;
                    }
                    handleSubmitSale();
                  }}
                  disabled={
                    cajaInfo?.abierta && (!hayStockSuficiente || loading)
                  }
                  className={`w-full h-16 sm:h-18 rounded-2xl text-xl sm:text-2xl font-black text-white shadow-xl transition-all flex items-center justify-center space-x-3 cursor-pointer ${
                    !cajaInfo?.abierta
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 active:scale-[0.99]"
                      : !hayStockSuficiente || loading
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-orange-600 hover:bg-orange-700 active:scale-[0.99] shadow-orange-600/30"
                  }`}
                >
                  {!cajaInfo?.abierta ? (
                    <>
                      <Unlock className="w-7 h-7" />
                      <span>ABRIR CAJA PARA PODER COBRAR</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-7 h-7" />
                      <span>
                        {loading ? "Registrando..." : "CONFIRMAR VENTA [Enter]"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ABRIR CAJA */}
      {/* ============================================================ */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Unlock className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Apertura de Caja Registradora
                </h3>
              </div>
              <button
                onClick={() => setShowOpenModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Indica el fondo de cambio inicial en efectivo y el turno para
              comenzar la jornada de cobro.
            </p>

            <form onSubmit={handleOpenCajaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Monto Inicial en Efectivo (Fondo de Cambio) *
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={openMontoInicial}
                    onChange={(e) =>
                      setOpenMontoInicial(parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-10 pr-4 py-2.5 text-xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Turno
                </label>
                <select
                  value={openTurno}
                  onChange={(e) =>
                    setOpenTurno(e.target.value as "MANANA" | "TARDE")
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                >
                  <option value="MANANA">Turno Mañana</option>
                  <option value="TARDE">Turno Tarde</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio en billetes de $1000 y $2000..."
                  value={openObservaciones}
                  onChange={(e) => setOpenObservaciones(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={openingCaja}
                  className="px-5 py-2.5 text-xs font-black text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {openingCaja ? "Abriendo..." : "Confirmar Apertura de Caja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CIERRE DE CAJA (ARQUEO) */}
      {/* ============================================================ */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Arqueo y Cierre de Caja
                </h3>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen de Valores de la Sesión */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Fondo Inicial en Caja:</span>
                <span className="font-bold">
                  {formatCurrency(cajaInfo?.sesion?.montoInicial ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>(+) Ventas en Efectivo del Turno:</span>
                <span className="font-bold">
                  +
                  {formatCurrency(cajaInfo?.totalesEnVivo?.ventasEfectivo ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>(Informativo) Ventas por Transferencia:</span>
                <span className="font-bold">
                  {formatCurrency(
                    cajaInfo?.totalesEnVivo?.ventasTransferencia ?? 0,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>(-) Retiros en Efectivo entregados:</span>
                <span className="font-bold">
                  -{formatCurrency(cajaInfo?.totalesEnVivo?.totalRetiros ?? 0)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Efectivo Esperado en Cajón:</span>
                <span className="text-emerald-700">
                  {formatCurrency(esperadoCaja)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCloseCajaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Efectivo Real Contado en el Cajón *
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={closeRealContado}
                    onChange={(e) =>
                      setCloseRealContado(parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-10 pr-4 py-2.5 text-xl font-black bg-white border-2 border-slate-300 rounded-xl focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Indicador de Diferencia */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-black ${
                  diferenciaArqueo === 0
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : diferenciaArqueo > 0
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <span>Diferencia de Caja:</span>
                <span className="text-sm">
                  {diferenciaArqueo === 0
                    ? "Exacto ($0)"
                    : diferenciaArqueo > 0
                      ? `Sobrante de +${formatCurrency(diferenciaArqueo)}`
                      : `Faltante de ${formatCurrency(diferenciaArqueo)}`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Observaciones de Cierre (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Justificación de diferencias, detalle de billetes..."
                  value={closeObservaciones}
                  onChange={(e) => setCloseObservaciones(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={closingCaja}
                  className="px-5 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-black rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {closingCaja ? "Cerrando..." : "Confirmar Cierre de Caja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: RESUMEN DE CIERRE COMPLETADO */}
      {/* ============================================================ */}
      {closedSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-black text-xl text-slate-900">
                Caja Cerrada con Éxito
              </h3>
              <p className="text-xs text-slate-500">
                Comprobante oficial de arqueo del turno
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha Cierre:</span>
                <span className="font-bold">
                  {formatDateTime(closedSummary.fechaCierre || new Date())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turno:</span>
                <span className="font-bold">{closedSummary.turno}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fondo Inicial:</span>
                <span className="font-bold">
                  {formatCurrency(closedSummary.montoInicial)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Ventas Efectivo:</span>
                <span>
                  {formatCurrency(closedSummary.montoVentasEfectivo ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-blue-700 font-bold">
                <span>Ventas Transferencia:</span>
                <span>
                  {formatCurrency(closedSummary.montoVentasTransferencia ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Retiros Efectuados:</span>
                <span>{formatCurrency(closedSummary.montoRetiros ?? 0)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
                <span>Efectivo Real Contado:</span>
                <span className="text-slate-900">
                  {formatCurrency(closedSummary.montoRealContado ?? 0)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Diferencia Arqueo:</span>
                <span>{formatCurrency(closedSummary.diferencia ?? 0)}</span>
              </div>
            </div>

            <button
              onClick={() => setClosedSummary(null)}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white font-black rounded-2xl text-xs shadow-md transition-colors"
            >
              Entendido / Finalizar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: VENTAS DEL DÍA Y ESTADÍSTICAS */}
      {/* ============================================================ */}
      {showDailyStatsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header del Modal */}
            <div className="bg-slate-900 text-white p-5 shrink-0 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 text-slate-950 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">
                    Recaudación y Estadísticas del Día
                  </h3>
                  <p className="text-xs text-slate-400">
                    Control de ventas acumuladas hoy (
                    {dailyStats?.fecha || "Hoy"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDailyStatsModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="p-5 overflow-y-auto space-y-5">
              {loadingDailyStats ? (
                <div className="py-16 text-center text-slate-400 font-bold">
                  Calculando estadísticas de la jornada...
                </div>
              ) : !dailyStats ? (
                <div className="py-16 text-center text-slate-400 font-bold">
                  No se encontraron ventas para la jornada de hoy.
                </div>
              ) : (
                <>
                  {/* Tarjetas de KPIs del Día */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200">
                      <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider block">
                        Total Vendido Hoy
                      </span>
                      <p className="text-2xl font-black text-orange-700 mt-1">
                        {formatCurrency(dailyStats.totalVentas)}
                      </p>
                      <span className="text-[10px] text-orange-600 font-bold block mt-0.5">
                        {dailyStats.cantidadVentas} operaciones (
                        {dailyStats.unidadesVendidas} unidades)
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Ventas en Efectivo
                      </span>
                      <p className="text-2xl font-black text-emerald-700 mt-1">
                        {formatCurrency(dailyStats.totalEfectivo)}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        Recaudado en caja
                      </span>
                    </div>

                    <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                      <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                        Ventas Transferencia
                      </span>
                      <p className="text-2xl font-black text-blue-700 mt-1">
                        {formatCurrency(dailyStats.totalTransferencia)}
                      </p>
                      <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                        Directo a cuentas
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Ventas por Turno
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        Mañana:{" "}
                        <span className="font-black">
                          {formatCurrency(
                            dailyStats.ventasPorTurno.manana.total,
                          )}
                        </span>
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        Tarde:{" "}
                        <span className="font-black">
                          {formatCurrency(
                            dailyStats.ventasPorTurno.tarde.total,
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* TABLA 1: DESGLOSE POR EMPRENDIMIENTO */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Ventas Acumuladas por Emprendimiento (Hoy)
                    </h4>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Emprendimiento</th>
                            <th className="py-2.5 px-3">Responsable</th>
                            <th className="py-2.5 px-3 text-center">
                              Operaciones
                            </th>
                            <th className="py-2.5 px-3 text-center">
                              Unidades
                            </th>
                            <th className="py-2.5 px-3 text-right">Efectivo</th>
                            <th className="py-2.5 px-3 text-right">Transf.</th>
                            <th className="py-2.5 px-3 text-right">
                              Total Acumulado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {dailyStats.ventasPorEmprendimiento.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-6 text-center text-slate-400"
                              >
                                Sin ventas por emprendimiento hoy.
                              </td>
                            </tr>
                          ) : (
                            dailyStats.ventasPorEmprendimiento.map((emp) => (
                              <tr
                                key={emp.emprendimientoId}
                                className="hover:bg-slate-50"
                              >
                                <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                  {emp.codigo}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  {emp.nombre}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {emp.responsable}
                                </td>
                                <td className="py-2 px-3 text-center font-bold">
                                  {emp.cantidadVentas}
                                </td>
                                <td className="py-2 px-3 text-center font-bold">
                                  {emp.unidades} u.
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                                  {formatCurrency(emp.efectivo)}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-blue-700">
                                  {formatCurrency(emp.transferencia)}
                                </td>
                                <td className="py-2 px-3 text-right font-black text-slate-900">
                                  {formatCurrency(emp.total)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABLA 2: LISTADO DE OPERACIONES DEL DÍA */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Listado Detallado de Tickets de Hoy (
                      {dailyStats.listadoVentas.length})
                    </h4>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Hora</th>
                            <th className="py-2 px-3">Emprendimiento</th>
                            <th className="py-2 px-3">Producto</th>
                            <th className="py-2 px-3 text-center">Cant.</th>
                            <th className="py-2 px-3">Medio Pago</th>
                            <th className="py-2 px-3 text-right">Total</th>
                            <th className="py-2 px-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {dailyStats.listadoVentas.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-500">
                                {v.hora}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-800">
                                {v.emprendimiento?.nombre || v.emprendimientoId}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded mr-1">
                                  {v.producto?.codigo}
                                </span>
                                {v.producto?.nombre}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                {v.cantidad} u.
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                    v.metodoPago === "EFECTIVO"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {v.metodoPago}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-black text-slate-900">
                                <div>{formatCurrency(v.total)}</div>
                                {v.descuento && v.descuento > 0 ? (
                                  <div className="text-[10px] font-bold text-emerald-600">
                                    Desc. -{formatCurrency(v.descuento)}
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[10px] font-bold ${
                                    v.estado === "ACTIVO"
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {v.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
