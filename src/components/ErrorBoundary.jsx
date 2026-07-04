import React from "react";
import { T } from "../lib/theme.js";

// Red de seguridad: si CUALQUIER render lanza, en vez de dejar la app congelada
// (pantalla que no responde y hay que cerrar/reabrir) mostramos un mensaje con
// un botón para recargar. No cambia datos; solo recupera la UI.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: String((error && error.message) || error || "") };
  }

  componentDidCatch(error, info) {
    // Log técnico para depurar (sin datos sensibles del usuario).
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary atrapó un error de render:", error, info);
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 font-sans"
        style={{ backgroundColor: T.bg, color: T.textPrimary }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-5 text-center"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
        >
          <div className="text-[18px] font-semibold mb-1">Algo salió mal</div>
          <div className="text-[13.5px] mb-4" style={{ color: T.textSecondary }}>
            La app tuvo un problema al mostrar esta pantalla. Tus datos están a
            salvo en el teléfono. Toca recargar para volver.
          </div>
          <button
            onClick={this.handleReload}
            className="w-full rounded-lg py-2.5 text-[14px] font-medium"
            style={{ backgroundColor: T.red, color: "#fff" }}
          >
            Recargar
          </button>
          {this.state.message && (
            <div className="gc-code text-[11px] mt-3 break-words" style={{ color: T.textFaint }}>
              {this.state.message.slice(0, 200)}
            </div>
          )}
        </div>
      </div>
    );
  }
}
