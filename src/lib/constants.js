// Constantes compartidas de la app. [Aud 22]

// Paga por paquete (USD). Configurable por ruta; este es el valor por defecto.
export const TARIFA_DEFAULT = 1.7;

// Versión del esquema de datos persistido. Subir al cambiar la forma de los
// datos y agregar la migración correspondiente en storage.js. [Aud 12]
export const SCHEMA_VERSION = 1;

// Claves de localStorage. Cada una es un blob independiente. NO duplicar datos.
export const KEY_CODES = "gate_codes_v3"; // directorio de códigos (existente)
export const KEY_ROUTES = "route_earnings_v1"; // rutas/ganancias
export const KEY_CONFIG = "ruta_config_v1"; // configuración global (gas/mpg/mant)
export const KEY_FUELUPS = "ruta_fuelups_v1"; // historial de llenados de gasolina

export const UNCONFIRMED_LABEL = "Sin confirmar zona";
export const UNKNOWN_ADDRESS = "Dirección desconocida";

// Configuración de costos (editable por el usuario). Estos son solo los valores
// por defecto; el precio de gasolina es una suposición editable, no un dato real.
export const MPG_DEFAULT = 17; // millas por galón asumidas (Kia Sorento 2.4L)
export const GAS_PRICE_DEFAULT = 3.2; // USD por galón (editable)
export const MAINT_PER_MILE_DEFAULT = 0.1; // USD/milla de mantenimiento estimado

// Día en que INICIA la semana de pago (0=domingo … 6=sábado). El usuario cobra
// los viernes, así que la semana va sábado→viernes: inicia en sábado (6).
export const PAY_WEEK_START_DEFAULT = 6;

export const DEFAULT_CONFIG = {
  gas_price: GAS_PRICE_DEFAULT,
  mpg: MPG_DEFAULT,
  maintenance_cost_per_mile: MAINT_PER_MILE_DEFAULT,
  pay_week_start_day: PAY_WEEK_START_DEFAULT,
};
