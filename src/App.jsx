import React, { useState } from "react";
import { Sun, BarChart3, List, Fuel, MoreHorizontal, ChevronLeft } from "lucide-react";
import { T } from "./lib/theme.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import GateCodeDirectory from "./components/GateCodeDirectory.jsx";
import Earnings from "./components/Earnings.jsx";

// Cinco pestañas abajo; Códigos se abre desde «Más».
const TABS = [
  { id: "hoy", label: "Hoy", Icon: Sun },
  { id: "resumen", label: "Resumen", Icon: BarChart3 },
  { id: "turnos", label: "Turnos", Icon: List },
  { id: "gastos", label: "Gastos", Icon: Fuel },
  { id: "mas", label: "Más", Icon: MoreHorizontal },
];

export default function App() {
  const [tab, setTab] = useState("hoy");
  const enCodigos = tab === "codigos";

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <div style={{ display: enCodigos ? "block" : "none" }}>
        <button
          onClick={() => setTab("mas")}
          className="flex items-center gap-1 px-4 pt-4 text-[14px]"
          style={{ color: T.textSecondary, minHeight: 44 }}
        >
          <ChevronLeft size={16} /> Más
        </button>
        <ErrorBoundary>
          <GateCodeDirectory />
        </ErrorBoundary>
      </div>
      <div style={{ display: enCodigos ? "none" : "block" }}>
        <ErrorBoundary>
          <Earnings tab={tab} onTab={setTab} />
        </ErrorBoundary>
      </div>

      <nav
        aria-label="Secciones"
        className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5"
        style={{
          backgroundColor: T.surface,
          borderTop: `1px solid ${T.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id || (id === "mas" && enCodigos);
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                window.scrollTo(0, 0);
              }}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 py-2.5"
              style={{ color: active ? T.red : T.textFaint, minHeight: 52 }}
            >
              <Icon size={20} />
              <span className="text-[11px]" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
