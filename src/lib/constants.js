// Constantes compartidas de la app. [Aud 22]

// Paga por paquete (USD). Configurable por ruta; este es el valor por defecto.
export const TARIFA_DEFAULT = 1.7;

// Versión del esquema de datos persistido. Subir al cambiar la forma de los
// datos y agregar la migración correspondiente en storage.js. [Aud 12]
export const SCHEMA_VERSION = 1;

// Claves de localStorage.
export const KEY_CODES = "gate_codes_v3"; // directorio de códigos (existente)
export const KEY_ROUTES = "route_earnings_v1"; // rutas/ganancias (nuevo)

export const UNCONFIRMED_LABEL = "Sin confirmar zona";
export const UNKNOWN_ADDRESS = "Dirección desconocida";
