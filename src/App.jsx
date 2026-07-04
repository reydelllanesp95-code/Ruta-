import React, { useState, useEffect, useCallback } from "react";
import { KeyRound, TrendingUp } from "lucide-react";
import { T } from "./lib/theme.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import BackupBanner from "./components/BackupBanner.jsx";
import GateCodeDirectory from "./components/GateCodeDirectory.jsx";
import Earnings from "./components/Earnings.jsx";
import { computeDataSignature, loadMeta, backupStatus, markBackedUp } from "./lib/backupMeta.js";
import { downloadBackup } from "./lib/backup.js";

const TABS = [
  { id: "codigos", label: "Códigos", Icon: KeyRound },
  { id: "ganancias", label: "Ganancias", Icon: TrendingUp },
];

export default function App() {
  const [tab, setTab] = useState("codigos");
  const [backup, setBackup] = useState({ needsBackup: false, dias: null });
  const [dismissed, setDismissed] = useState(false);

  // Recalcula si hay cambios sin respaldar (firma de datos vs último respaldo).
  const refreshBackup = useCallback(async () => {
    try {
      const [{ signature, hasData }, meta] = await Promise.all([computeDataSignature(), loadMeta()]);
      setBackup(backupStatus({ meta, signature, hasData }));
    } catch {
      /* si falla, no molestamos */
    }
  }, []);

  // Al montar, al cambiar de pestaña, al volver a la app, y tras respaldar.
  useEffect(() => {
    refreshBackup();
  }, [refreshBackup, tab]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshBackup();
    };
    const onBackupEvt = () => refreshBackup();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("ruta:backup", onBackupEvt);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("ruta:backup", onBackupEvt);
    };
  }, [refreshBackup]);

  const handleBackupNow = useCallback(async () => {
    try {
      await downloadBackup();
      await markBackedUp(); // guarda firma + fecha y dispara "ruta:backup"
    } catch {
      /* la descarga puede requerir gesto; el botón ES el gesto */
    }
  }, []);

  const showBanner = backup.needsBackup && !dismissed;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {showBanner && (
        <BackupBanner
          dias={backup.dias}
          onBackup={handleBackupNow}
          onDismiss={() => setDismissed(true)}
        />
      )}
      <div style={{ display: tab === "codigos" ? "block" : "none" }}>
        <ErrorBoundary>
          <GateCodeDirectory />
        </ErrorBoundary>
      </div>
      <div style={{ display: tab === "ganancias" ? "block" : "none" }}>
        <ErrorBoundary>
          <Earnings />
        </ErrorBoundary>
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
