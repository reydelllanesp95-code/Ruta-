import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  DownloadCloud,
  UploadCloud,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react";
import { T } from "../lib/theme.js";
import { KEY_ROUTES } from "../lib/constants.js";
import * as storage from "../lib/storage.js";
import { parseRoutes } from "../lib/parseRoutes.js";
import {
  aggregate,
  currentWeekKey,
  currentMonthKey,
  totalsForKey,
} from "../lib/earnings.js";
import { downloadBackup, restoreBackup, downloadPlantillaCSV } from "../lib/backup.js";
import StatsCards from "./earnings/StatsCards.jsx";
import WeeklySummary from "./earnings/WeeklySummary.jsx";
import MonthlySummary from "./earnings/MonthlySummary.jsx";
import RouteCard from "./earnings/RouteCard.jsx";
import ImportDialog from "./earnings/ImportDialog.jsx";

export default function Earnings() {
  const [routes, setRoutes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [previews, setPreviews] = useState(null); // rutas a importar (abre dialog)
  const [msg, setMsg] = useState(null); // { tipo: "ok"|"error", texto }
  const [saveState, setSaveState] = useState("idle");

  const fileRef = useRef(null);
  const backupRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await storage.loadJSON(KEY_ROUTES, []);
      if (mounted) {
        setRoutes(Array.isArray(data) ? data : []);
        setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function persist(next) {
    setRoutes(next);
    setSaveState("saving");
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await storage.saveJSON(KEY_ROUTES, next);
        setSaveState("saved");
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1200);
      } catch (err) {
        setSaveState("error");
        setMsg({ tipo: "error", texto: "No se pudo guardar: " + (err.message || err) });
      }
    });
  }

  // Agregaciones memoizadas: se recalculan solo cuando cambian las rutas. [Aud 16]
  const agg = useMemo(() => aggregate(routes), [routes]);
  const semana = useMemo(() => totalsForKey(agg.porSemana, currentWeekKey()), [agg]);
  const mes = useMemo(() => totalsForKey(agg.porMes, currentMonthKey()), [agg]);
  const routesOrdenadas = useMemo(
    () => [...routes].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [routes]
  );

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseRoutes(text, file.name); // [Aud 18] try/catch
      if (!result || result.length === 0) {
        setMsg({ tipo: "error", texto: "No encontré rutas en el archivo." });
        return;
      }
      setPreviews(result);
    } catch (err) {
      setMsg({ tipo: "error", texto: err.message || String(err) });
    }
  }

  function onConfirmImport(resolved) {
    let next = routes.slice();
    let added = 0;
    for (const { route, replaceId } of resolved) {
      if (replaceId) next = next.filter((r) => r.id !== replaceId);
      next.push(route);
      added += 1;
    }
    persist(next);
    setPreviews(null);
    setMsg({ tipo: "ok", texto: `Importadas ${added} ruta(s).` });
  }

  function updateRoute(id, fields) {
    persist(routes.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  }

  function deleteRoute(id) {
    persist(routes.filter((r) => r.id !== id));
  }

  async function onExport() {
    try {
      await downloadBackup();
      setMsg({ tipo: "ok", texto: "Respaldo descargado." });
    } catch (err) {
      setMsg({ tipo: "error", texto: "No se pudo exportar: " + (err.message || err) });
    }
  }

  async function onImportBackup(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Restaurar un respaldo reemplazará los datos actuales. ¿Continuar?")) return;
    try {
      const text = await file.text();
      const res = await restoreBackup(text);
      const data = await storage.loadJSON(KEY_ROUTES, []);
      setRoutes(Array.isArray(data) ? data : []);
      setMsg({ tipo: "ok", texto: `Respaldo restaurado: ${res.rutas} rutas, ${res.codigos} códigos.` });
    } catch (err) {
      setMsg({ tipo: "error", texto: err.message || String(err) });
    }
  }

  if (!loaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ backgroundColor: T.bg, color: T.textSecondary }}
      >
        <Loader2 className="animate-spin mr-2" size={18} />
        Cargando ganancias…
      </div>
    );
  }

  return (
    <div className="font-sans" style={{ backgroundColor: T.bg, color: T.textPrimary }}>
      <style>{`
        .gc-eyebrow { font-family: 'Oswald', sans-serif; letter-spacing: 0.14em; }
        .gc-wordmark { font-family: 'Oswald', sans-serif; font-weight: 700; }
        .gc-code { font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace; }
      `}</style>

      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="flex items-center justify-center rounded-md"
            style={{ width: 30, height: 30, backgroundColor: "#000", border: `1px solid ${T.border}` }}
          >
            <TrendingUp size={16} style={{ color: T.red }} />
          </div>
          <div className="leading-tight">
            <div className="gc-wordmark text-[15px]" style={{ color: T.textPrimary }}>
              Ganancias
            </div>
            <div className="gc-eyebrow text-[10px] uppercase" style={{ color: T.textFaint }}>
              {routes.length} ruta(s) ·{" "}
              {saveState === "saving" ? "guardando…" : saveState === "saved" ? "guardado ✓" : "OnTrac"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-28 pt-3 space-y-4">
        <StatsCards semana={semana} mes={mes} />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-medium"
            style={{ backgroundColor: T.red, color: "#fff" }}
          >
            <Upload size={16} /> Importar ruta
          </button>
          <button
            onClick={downloadPlantillaCSV}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]"
            style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
          >
            <FileSpreadsheet size={15} /> Plantilla CSV
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".csv,.json" onChange={onFile} className="hidden" />
        <input ref={backupRef} type="file" accept=".json" onChange={onImportBackup} className="hidden" />

        {msg && (
          <div
            className="text-[13px] rounded-lg px-3 py-2"
            style={{
              backgroundColor: msg.tipo === "error" ? T.redDim : T.okDim,
              color: msg.tipo === "error" ? T.red : T.ok,
            }}
          >
            {msg.texto}
          </div>
        )}

        <WeeklySummary items={agg.porSemana} />
        <MonthlySummary items={agg.porMes} />

        <div>
          <div className="gc-eyebrow text-[11px] uppercase px-1 py-1.5" style={{ color: T.textFaint }}>
            Rutas
          </div>
          {routesOrdenadas.length === 0 ? (
            <div className="text-center py-8 text-[13.5px]" style={{ color: T.textFaint }}>
              Aún no hay rutas. Toca "Importar ruta" y sube tu CSV de OnTrac.
            </div>
          ) : (
            <div className="space-y-2">
              {routesOrdenadas.map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  onSave={(fields) => updateRoute(r.id, fields)}
                  onDelete={deleteRoute}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]"
            style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
          >
            <DownloadCloud size={15} /> Exportar respaldo
          </button>
          <button
            onClick={() => backupRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]"
            style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
          >
            <UploadCloud size={15} /> Importar respaldo
          </button>
        </div>
      </div>

      {previews && (
        <ImportDialog
          previews={previews}
          existingRoutes={routes}
          onConfirm={onConfirmImport}
          onCancel={() => setPreviews(null)}
        />
      )}
    </div>
  );
}
