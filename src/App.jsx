import React, { useState } from "react";
import { KeyRound, TrendingUp } from "lucide-react";
import { T } from "./lib/theme.js";
import GateCodeDirectory from "./components/GateCodeDirectory.jsx";
import Earnings from "./components/Earnings.jsx";

const TABS = [
  { id: "codigos", label: "Códigos", Icon: KeyRound },
  { id: "ganancias", label: "Ganancias", Icon: TrendingUp },
];

export default function App() {
  const [tab, setTab] = useState("codigos");

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <div style={{ display: tab === "codigos" ? "block" : "none" }}>
        <GateCodeDirectory />
      </div>
      <div style={{ display: tab === "ganancias" ? "block" : "none" }}>
        <Earnings />
      </div>

      {/* Navegación inferior */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 flex"
        style={{
          backgroundColor: T.surface,
          borderTop: `1px solid ${T.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
              style={{ color: active ? T.red : T.textFaint }}
            >
              <Icon size={20} />
              <span
                className="text-[11px]"
                style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
