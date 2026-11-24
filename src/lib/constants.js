// Constantes compartidas de la app. [Aud 22]

// Paga por paquete (USD). Configurable por ruta; este es el valor por defecto.
export const TARIFA_DEFAULT = 1.7;

// Versión del esquema de datos persistido. Subir al cambiar la forma de los
// datos y agregar la migración correspondiente en storage.js. [Aud 12]
export const SCHEMA_VERSION = 2; // 2: meta semanal v2 (24-nov-2026)

// Claves de localStorage. Cada una es un blob independiente. NO duplicar datos.
export const KEY_CODES = "gate_codes_v3"; // directorio de códigos (existente)
export const KEY_ROUTES = "route_earnings_v1"; // rutas/ganancias
export const KEY_CONFIG = "ruta_config_v1"; // configuración global (gas/mpg/mant)
export const KEY_FUELUPS = "ruta_fuelups_v1"; // historial de llenados de gasolina
export const KEY_MAINT = "ruta_maint_v1"; // historial de mantenimiento
export const KEY_MEALS = "ruta_meals_v1"; // gastos de comida del día de trabajo
export const KEY_TOLLS = "ruta_tolls_v1"; // peajes (SunPass / E-PASS)
export const KEY_LOCALES = "ruta_locales_v1"; // locales de limpieza (facturación y fees de Corvus)
export const KEY_META = "ruta_meta_semanas_v1"; // semanas de la meta marcadas «Hecho»
export const KEY_JORNADAS = "ruta_jornadas_v1"; // odómetro al salir y al llegar a casa
export const KEY_DEUDA = "ruta_deuda_v1"; // tarjetas, pagos («Pagué») y fin de promo de Discover
export const KEY_FONDO = "ruta_fondo_v1"; // usos del fondo colchón
export const KEY_AVISOS = "ruta_meta_avisos_v1"; // hitos ya avisados por semana
export const KEY_SHIFT_DRAFT = "ruta_turno_en_curso_v1"; // borrador del turno que se está apuntando

// Tipos de mantenimiento (reutilizable en UI y validación).
export const MAINT_TYPES = ["oil", "tires", "brakes", "repair"];
export const MAINT_TYPE_LABELS = {
  oil: "Aceite",
  tires: "Llantas",
  brakes: "Frenos",
  repair: "Reparación",
};

// Tipos de comida (reutilizable en UI y validación).
export const MEAL_TYPES = ["desayuno", "almuerzo", "merienda", "cena", "otro"];
export const MEAL_TYPE_LABELS = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  otro: "Otro",
};

export const UNCONFIRMED_LABEL = "Sin confirmar zona";
export const UNKNOWN_ADDRESS = "Dirección desconocida";

// Configuración de costos (editable por el usuario). Estos son solo los valores
// por defecto; el precio de gasolina es una suposición editable, no un dato real.
export const MPG_DEFAULT = 17; // millas por galón asumidas (Kia Sorento 2.4L)
export const GAS_PRICE_DEFAULT = 3.2; // USD por galón (editable)
export const MAINT_PER_MILE_DEFAULT = 0.1; // USD/milla de mantenimiento estimado

// Día en que INICIA la semana de pago (0=domingo … 6=sábado). El usuario cobra
// los viernes, así que la semana va sábado→viernes: inicia en sábado (6).
// Semana lunes→domingo (antes sábado→viernes): a Rey le pagan los martes, así
// que la semana cierra el domingo y el martes mueve el dinero.
export const PAY_WEEK_START_DEFAULT = 1;

// Segundo vehículo: Hyundai Tucson. MPG asumido para reparto en ciudad; es una
// suposición editable (no verificada para su año/motor) hasta tener llenados reales.
export const TUCSON_MPG_DEFAULT = 25;

export const DEFAULT_CONFIG = {
  gas_price: GAS_PRICE_DEFAULT,
  mpg: MPG_DEFAULT, // Kia (clave histórica, se mantiene)
  maintenance_cost_per_mile: MAINT_PER_MILE_DEFAULT, // Kia
  tucson_mpg: TUCSON_MPG_DEFAULT,
  tucson_maintenance_cost_per_mile: MAINT_PER_MILE_DEFAULT,
  pay_week_start_day: PAY_WEEK_START_DEFAULT,
  // Meta semanal v2: colchón → deuda → inversión → meta ($900).
  meta_colchon: 80,
  meta_deuda_semana: 680,
  meta_extra: 40,
  meta_inversiones: [
    { nombre: "VOO", monto: 40 },
    { nombre: "SCHD", monto: 15 },
    { nombre: "NVDA", monto: 10 },
    { nombre: "BTC", monto: 15 },
    { nombre: "ETH", monto: 13 },
    { nombre: "altcoins", monto: 7 },
  ],
  fondo_tope: 500,
  fondo_inicial: 0,
  fondo_desde: "2026-11-23",
  plan_inicio: "2026-11-23",
  plan_meses: 5,
};

// Claves de la meta v1 que la v2 sustituye (meta_deuda era $350 y ahora la
// deuda semanal es otra cosa: se borran en la migración 1 → 2).
export const META_V1_KEYS = ["meta_basico", "meta_invertir", "meta_dorado", "meta_deuda", "meta_inversion", "meta_trading_pct"];

// Tarjetas del plan de deuda (saldo y APR los pone Rey en Ajustes).
export const DEUDA_DEFAULT = {
  tarjetas: [
    { id: "chase-prime", nombre: "Chase Prime", fase: 1, saldo: 0, apr: 0 },
    { id: "capital-one", nombre: "Capital One", fase: 1, saldo: 0, apr: 0 },
    { id: "chase", nombre: "Chase", fase: 1, saldo: 0, apr: 0 },
    { id: "pnc", nombre: "PNC", fase: 1, saldo: 0, apr: 0 },
    { id: "discover", nombre: "Discover", fase: 2, saldo: 0, apr: 0 },
  ],
  pagos: [],
  promoFin: "",
};

// Fees de Corvus sobre lo facturado (royalty 10% + administración 10% + seguro
// 7.25%), sacados del statement de septiembre 2026. Editable por local; sin
// confirmar con Corvus que sea igual para todas las cuentas.
export const CORVUS_FEE_PCT_DEFAULT = 27.25;
