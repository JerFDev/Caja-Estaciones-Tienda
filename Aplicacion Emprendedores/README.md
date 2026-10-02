# Tienda Creativa - Sistema de Gestión Comercial y Emprendimientos

Sistema integral de gestión de ventas (Punto de Venta - POS), control de inventario, sesiones de caja y liquidación financiera de emprendimientos, diseñado bajo la arquitectura **Local/Offline-First** para operar sin depender de conexión a Internet y con base de datos relacional **MySQL**.

---

## 📑 Tabla de Contenidos
1. [Descripción General](#-descripción-general)
2. [Tecnologías Utilizadas](#-tecnologías-utilizadas)
3. [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
4. [Cómo Funciona la Aplicación (Módulos y Lógica)](#-cómo-funciona-la-aplicación)
   - [Punto de Venta (POS)](#1-terminal-pos-de-ventas)
   - [Control de Caja y Sesiones](#2-control-de-caja-y-sesiones)
   - [Gestión de Emprendimientos y Catálogo](#3-gestión-de-emprendimientos-y-catálogo)
   - [Inventario y Trazabilidad de Stock](#4-inventario-y-trazabilidad-de-stock)
   - [Saldos y Retiros de Efectivo](#5-saldos-y-retiros-de-efectivo)
   - [Módulo de Dashboards y Analítica](#6-módulo-de-dashboards-y-analítica)
   - [Exportación e Importación de Datos](#7-exportación-e-importación-de-datos)
5. [Instalación y Configuración](#-instalación-y-configuración)
6. [Scripts Disponibles](#-scripts-disponibles)
7. [Reglas de Negocio Clave](#-reglas-de-negocio-clave)

---

## 🎯 Descripción General

**Tienda Creativa** es una plataforma desarrollada para coordinar espacios comerciales y ferias donde participan múltiples emprendedores de forma simultánea.

El sistema resuelve la complejidad contable y operativa de:
* Registrar ventas rápidas con código de barras o búsqueda asistida.
* Gestionar cobros en efectivo y transferencias (mostrando el alias/CVU correspondiente a cada emprendedor).
* Aplicar descuentos porcentuales ágiles sin margen de error.
* Separar automáticamente los ingresos de cada emprendedor descontando comisiones/retenciones pactadas.
* Administrar retiros de efectivo con control de saldo disponible en tiempo real.
* Ejecutar aperturas, arqueos y cierres de caja con detección de faltantes y sobrantes.
* Operar de manera totalmente local con base de datos MySQL, permitiendo consolidar datos entre distintas terminales sin duplicaciones.

---

## 🛠️ Tecnologías Utilizadas

### Frontend (Interfaz de Usuario)
* **React 18**: Biblioteca base para la construcción de interfaces reactivas y modulares basada en componentes funcionales y hooks.
* **TypeScript**: Tipado estático para garantizar la integridad de datos en el cliente y prevenir errores en tiempo de ejecución.
* **Vite**: Herramienta de compilación ultrarrápida optimizada con *Hot Module Replacement* (HMR).
* **Tailwind CSS**: Framework de estilos de utilidad para un diseño moderno, responsivo y adaptado para cajeros y administradores.
* **Lucide React**: Conjunto de iconografía vectorial limpia y consistente.

### Backend (Servidor y Lógica de Negocio)
* **Node.js**: Entorno de ejecución en el servidor.
* **Express**: Framework minimalista para la API REST local (`http://localhost:3456/api`).
* **TypeScript (`tsx`)**: Ejecución directa de TypeScript en el backend con recarga en caliente para desarrollo ágil.
* **Multer**: Procesamiento seguro de subida de archivos Excel y JSON en memoria para consolidaciones.

### Base de Datos y Persistencia
* **MySQL Server (v8.0+ / v26.7+)**: Motor de base de datos relacional robusto, transaccional y escalable.
* **Prisma ORM**: Modelado y consultas a la base de datos con tipado estricto, migraciones automáticas (`prisma db push`) y generación de esquemas de cliente.

### Procesamiento y Manipulación de Archivos
* **ExcelJS**: Generación y lectura directa de planillas de cálculo Microsoft Excel (`.xlsx`) con múltiples hojas, estilos y formatos de celda sin requerir tener instalado Microsoft Office.
* **JSON**: Exportación de volcados de respaldo completos y estructurados con UUIDs universales para auditoría y migraciones.

### Entorno de Escritorio y Automatización
* **Scripts Batch (`.bat`)**: Inicialización en un clic para usuarios finales en entornos Windows.
* **Soporte Electron**: Estructura lista para compilar la aplicación como ejecutable de escritorio autónomo.

---

## 📂 Arquitectura del Proyecto

```
Aplicacion Emprendedores/
├── electron/                  # Configuración de ejecutable de escritorio Electron
│   └── main.js
├── prisma/                    # Definición de datos con Prisma ORM
│   └── schema.prisma          # Esquema relacional (modelos, relaciones, tipos)
├── server/                    # Backend API REST (Node.js + Express)
│   ├── index.ts               # Servidor Express y enrutamiento de endpoints
│   ├── db.ts                  # Conexión e inicialización del cliente Prisma
│   └── services/              # Capa de lógica de negocio modular
│       ├── salesService.ts        # Transacciones de venta y anulación
│       ├── productService.ts      # Catálogo y autogeneración de códigos
│       ├── stockService.ts        # Movimientos (ingresos, devoluciones, ajustes)
│       ├── balancesService.ts     # Cálculo financiero y saldos de emprendedores
│       ├── cashRegisterService.ts # Sesiones, aperturas, arqueos y cierres de caja
│       ├── withdrawalService.ts   # Registro y validación de retiros en efectivo
│       ├── statisticsService.ts   # Agregaciones de métricas y dashboards
│       ├── exportService.ts       # Generación de reportes XLSX y backups JSON
│       └── importService.ts       # Consolidación multi-terminal anti-duplicados
├── src/                       # Frontend SPA (React + TypeScript)
│   ├── components/            # Componentes reutilizables
│   │   ├── auth/              # Formularios de autenticación y cambio de clave
│   │   ├── dashboards/        # Vistas de tableros analíticos y gráficos SVG
│   │   ├── layout/            # Barra lateral, cabecera y estructura base
│   │   └── ventures/          # Modales y fichas de emprendimientos
│   ├── pages/                 # Páginas principales de la aplicación
│   │   ├── SalesPOSPage.tsx       # Punto de Venta (terminal rápida)
│   │   ├── DashboardPage.tsx      # Tableros ejecutivos y analíticos
│   │   ├── CashRegisterPage.tsx   # Control de aperturas/cierres y sesiones
│   │   ├── VenturesPage.tsx       # Directorio de emprendedores
│   │   ├── ProductsPage.tsx       # Catálogo de productos
│   │   ├── StockPage.tsx          # Trazabilidad de inventario
│   │   ├── BalancesPage.tsx       # Resumen de liquidaciones y saldos
│   │   ├── WithdrawalsPage.tsx    # Historial y registro de retiros
│   │   ├── ExportPage.tsx         # Exportación de reportes
│   │   ├── ImportPage.tsx         # Consolidación de archivos
│   │   └── SettingsPage.tsx       # Ajustes de la terminal y reglas
│   ├── types/                 # Definiciones de tipos TypeScript globales
│   └── utils/                 # Formateadores de moneda, fecha y validaciones
├── .env                       # Variables de entorno (conexión MySQL y puertos)
├── package.json               # Dependencias y scripts del proyecto
└── iniciar_aplicacion.bat     # Lanzador rápido para Windows
```

---

## ⚙️ Cómo Funciona la Aplicación

### 1. Terminal POS de Ventas
Diseñado para la atención al público a máxima velocidad:
* **Selección del Emprendimiento:** Permite elegir primero el emprendedor o filtrar directamente escaneando el código de barra del producto.
* **Búsqueda Asistida:** Detección instantánea por nombre o código del producto con visualización de precio y stock restante.
* **Atajos de Teclado:**
  * `F1`: Efectivo.
  * `F2`: Transferencia.
  * `F3`: Cliente Residente.
  * `F4`: Cliente Turista.
  * `Enter`: Confirmar y asentar venta.
  * `Esc`: Limpiar selección.
* **Visualización de Alias / CVU para Transferencias:** Al seleccionar pago por transferencia, se muestra en pantalla el Alias bancario del emprendedor con un botón de **Copiar Alias** en un clic.
* **Selector de Descuentos (en pasos de 5%):**
  * Permite incrementar o disminuir de a 5% con botones (`- 5%` y `+ 5%`).
  * Botones de acceso rápido para descuentos habituales (0%, 5%, 10%, 15%, 20%, 25%, 30%, 50%).
  * El sistema calcula automáticamente el monto con descuento, el subtotal original y la porción descontada.
* **Transacciones Atómicas:** Cada venta descuenta el stock de forma atómica y congela el precio histórico unitario.

### 2. Control de Caja y Sesiones
Garantiza el control exacto del dinero físico en la terminal:
* **Apertura de Caja:** Se inicia el turno registrando el fondo inicial de cambio.
* **Monitoreo en Tiempo Real:** El sistema computa los cobros en efectivo, las ventas por transferencia (que no alteran el efectivo en cajón) y los retiros realizados durante la sesión.
* **Arqueo y Cierre:** El cajero cuenta el efectivo físico mediante una calculadora de billetes/monedas. El sistema compara el **Efectivo Esperado vs. Contado Real**, alertando sobre faltantes o sobrantes antes de asentar el cierre definitivo.

### 3. Gestión de Emprendimientos y Catálogo
* Cada emprendimiento cuenta con su perfil comercial: nombre de fantasía, responsable, rubro, CUIT/DNI, teléfono, alias bancario, CBU y porcentaje de retención pactado (porcentaje municipal/comisión).
* **Generador Correlativo de Códigos:** Autogenera códigos secuenciales únicos basados en las siglas del emprendimiento (ej. `AKM001`, `AKM002`, `BER001`).
* **Ficha Integral del Emprendimiento:** Al hacer clic en un emprendimiento, se accede a un panel con:
  * Saldo en efectivo disponible para retirar.
  * Ventas acumuladas y retenciones.
  * Catálogo de productos asignados.
  * Historial cronológico de movimientos de stock, ventas y retiros.

### 4. Inventario y Trazabilidad de Stock
* El inventario no se edita arbitrariamente; se calcula a partir de los movimientos registrados:
  * **Ingreso:** Reposición de mercadería por parte del emprendedor.
  * **Devolución:** Mercadería retirada o devuelta al fabricante.
  * **Ajuste:** Corrección auditada por rotura, vencimiento o conteo físico.
* Cada venta exitosa genera el egreso de inventario correspondiente.
* Si una venta es anulada, el stock se reincorpora automáticamente al producto con justificación obligatoria.

### 5. Saldos y Retiros de Efectivo
* **Cálculo Financiero:**
  $$\text{Saldo Disponible} = \text{Ventas en Efectivo} - \text{Retención Aplicada} - \text{Retiros Realizados}$$
* Las ventas por transferencia no incrementan el saldo en efectivo de la caja física, ya que el dinero ingresa directamente a la cuenta bancaria del titular.
* **Registro de Retiro:**
  * Interfaz limpia y ágil.
  * Entrada numérica con saltos exactos de **\$100,00 pesos** al utilizar las flechas arriba/abajo o teclado (`step="100"`).
  * Validación estricta que previene retiros que superen el efectivo disponible (salvo autorización explícita de sobregiro).

### 6. Módulo de Dashboards y Analítica
La sección de Dashboards provee métricas consolidadas en tiempo real:
1. **Resumen General:** Total facturado, cantidad de tickets emitidos, productos vendidos, emprendimientos activos, ticket promedio, ventas por turno (Mañana vs. Tarde), tipo de cliente (Turista vs. Residente) y gráficos interactivos de evolución temporal.
2. **Caja Diaria / Sesiones:** Auditoría de cada turno con fecha, cajero, fondo inicial, total en efectivo, total transferencias, retiros, esperado, real y diferencias.
3. **Finanzas y Saldos:** Visión global de liquidaciones, retenciones acumuladas y saldos pendientes de pago a emprendedores.

### 7. Exportación e Importación de Datos
* **Exportación a Excel (`.xlsx`):** Genera planillas multipestaña perfectamente formateadas (`Ventas`, `Stock`, `Retiros`, `Saldos`, `Emprendimientos`, `Productos`) con filtros por fecha y emprendedor.
* **Respaldo JSON:** Copia de seguridad integral de la base de datos completa.
* **Consolidación Multi-Local:** Permite importar planillas provenientes de otras terminales de cobro. Cada operación cuenta con un UUID único (`identificadorUnico`), lo que evita duplicados al integrar datos de múltiples sucursales o cajas.

---

## 🚀 Instalación y Configuración

### Requisitos Previos
1. **Node.js** (versión 18 o superior).
2. **MySQL Server** (versión 8.0 o superior, por ejemplo mediante el servicio `MySQL267` en puerto `3306`).
3. Administrador de paquetes `npm`.

### Paso 1: Clonar / Ubicar el Proyecto
Abrir la terminal en el directorio raíz de la aplicación:
```bash
cd "C:\Users\lucas\OneDrive\Escritorio\MUNI\Aplicacion Emprendedores"
```

### Paso 2: Configurar Variables de Entorno (`.env`)
Crear o verificar el archivo `.env` en la raíz del proyecto con los datos de conexión a MySQL:
```env
# Conexión a la base de datos MySQL
DATABASE_URL="mysql://root:1234@localhost:3306/tienda_creativa?connect_timeout=15"

# Puerto de la API REST local
PORT=3456
```

### Paso 3: Instalar Dependencias
```bash
npm.cmd install
```

### Paso 4: Inicializar la Base de Datos
Generar el cliente de Prisma y sincronizar las tablas con MySQL:
```bash
npm.cmd run db:generate
npm.cmd run db:push
```

*(Opcional: Si se desea poblar con datos semilla de prueba iniciales)*
```bash
npm.cmd run db:seed
```

### Paso 5: Iniciar la Aplicación

#### Modo Rápido (Recomendado para usuarios):
Hacer doble clic en:
```
iniciar_aplicacion.bat
```

#### Modo Terminal (Desarrollo):
```bash
npm.cmd run dev
```
* **Frontend:** `http://localhost:5173`
* **API Backend:** `http://localhost:3456`

---

## 📜 Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm.cmd run dev` | Inicia simultáneamente el servidor backend y el cliente frontend con recarga en caliente. |
| `npm.cmd run dev:server` | Inicia únicamente la API REST local (`server/index.ts`) con `tsx watch`. |
| `npm.cmd run dev:client` | Inicia únicamente el servidor de desarrollo de Vite para el frontend. |
| `npm.cmd run build` | Compila el cliente de Prisma y genera el paquete de producción con Vite (`dist/`). |
| `npm.cmd run db:generate` | Actualiza y genera los tipos del cliente Prisma a partir de `schema.prisma`. |
| `npm.cmd run db:push` | Aplica los cambios del esquema directamente en la base de datos MySQL. |
| `npm.cmd run electron:dev` | Ejecuta la aplicación encapsulada dentro de una ventana de escritorio de Electron. |

---

## 🔒 Reglas de Negocio Clave

1. **Precios Congelados Inmutables:** El precio unitario registrado en una venta no se modifica si posteriormente el precio del catálogo del producto es actualizado. Esto garantiza una trazabilidad histórica perfecta.
2. **Separación de Fondos Efectivo / Banco:** Las ventas efectuadas por transferencia bancaria no suman al saldo disponible para retiro en efectivo del emprendedor, ya que el dinero ingresó a su cuenta bancaria de forma directa.
3. **Consistencia Transaccional:** El decremento de stock y la creación de la venta se realizan dentro de una transacción única de base de datos (`prisma.$transaction`), impidiendo inconsistencias de stock en ventas simultáneas.
4. **Anulaciones Auditadas:** Ningún registro de venta se borra físicamente. Las ventas anuladas cambian su estado a `ANULADA`, reincorporan el stock automáticamente y registran el motivo y usuario responsable de la anulación.
5. **Auditoría Multi-Local por UUID:** Todas las operaciones comerciales poseen un identificador universal único (UUID) inmutable que permite consolidar planillas de múltiples terminales sin duplicar transacciones.
