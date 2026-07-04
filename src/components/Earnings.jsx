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
import { KEY_ROUTES, KEY_FUELUPS, KEY_MAINT, KEY_MEALS, DEFAULT_CONFIG } from "../lib/constants.js";
import * as storage from "../lib/storage.js";
import { parseRoutes } from "../lib/parseRoutes.js";
import { readRouteFiles } from "../lib/importFile.js";
import {
  aggregate,
  currentPayWeekKey,
  currentMonthKey,
  totalsForKey,
  payWeekLabel,
  monthLabel,
} from "../lib/earnings.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { effectiveMpg, makeFuelup } from "../lib/fuel.js";
import { makeMaint } from "../lib/maintenance.js";
import { makeMeal } from "../lib/meals.js";
import { downloadBackup, restoreBackup, downloadPlantillaCSV } from "../lib/backup.js";
import { markBackedUp } from "../lib/backupMeta.js";
import StatsCards from "./earnings/StatsCards.jsx";
import ConfigPanel from "./earnings/ConfigPanel.jsx";
import FuelupsPanel from "./earnings/FuelupsPanel.jsx";
import MaintenancePanel from "./earnings/MaintenancePanel.jsx";
import MealsPanel from "./earnings/MealsPanel.jsx";
import WeeklySummary from "./earnings/WeeklySummary.jsx";
import MonthlySummary from "./earnings/MonthlySummary.jsx";
import RouteCard from "./earnings/RouteCard.jsx";
import ImportDialog from "./earnings/ImportDialog.jsx";

export default function Earnings() {
  const [routes, setRoutes] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [fuelups, setFuelups] = useState([]);
  const [maints, setMaints] = useState([]);
  const [meals, setMeals] = useState([]);
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
      const [data, cfg, fu, mt, ml] = await Promise.all([
        storage.loadJSON(KEY_ROUTES, []),
        loadConfig(),
        storage.loadJSON(KEY_FUELUPS, []),
        storage.loadJSON(KEY_MAINT, []),
        storage.loadJSON(KEY_MEALS, []),
      ]);
      if (mounted) {
        setRoutes(Array.isArray(data) ? data : []);
        setConfig(cfg);
        setFuelups(Array.isArray(fu) ? fu : []);
        setMaints(Array.isArray(mt) ? mt : []);
        setMeals(Array.isArray(ml) ? ml : []);
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

  async function onSaveConfig(next) {
    try {
      const clean = await saveConfig(next);
      setConfig(clean);
      setMsg({ tipo: "ok", texto: "Ajustes de costos guardados." });
    } catch (err) {
      setMsg({ tipo: "error", texto: "No se pudieron guardar los ajustes: " + (err.message || err) });
    }
  }

  function persistFuelups(next) {
    setFuelups(next);
    storage.saveJSON(KEY_FUELUPS, next).catch((err) =>
      setMsg({ tipo: "error", texto: "No se pudo guardar la gasolina: " + (err.message || err) })
    );
  }
  const addFuelup = (input) => persistFuelups([...fuelups, makeFuelup(input)]);
  const deleteFuelup = (id) => persistFuelups(fuelups.filter((f) => f.id !== id));

  function persistMaints(next) {
    setMaints(next);
    storage.saveJSON(KEY_MAINT, next).catch((err) =>
      setMsg({ tipo: "error", texto: "No se pudo guardar el mantenimiento: " + (err.message || err) })
    );
  }
  const addMaint = (input) => persistMaints([...maints, makeMaint(input)]);
  const deleteMaint = (id) => persistMaints(maints.filter((m) => m.id !== id));
  // Botón MANUAL: solo si el usuario lo toca, copia el histórico a la config.
  const applyMaintCostPerMile = (value) =>
    onSaveConfig({ ...config, maintenance_cost_per_mile: value });

  function persistMeals(next) {
    setMeals(next);
    storage.saveJSON(KEY_MEALS, next).catch((err) =>
      setMsg({ tipo: "error", texto: "No se pudo guardar la comida: " + (err.message || err) })
    );
  }
  const addMeal = (input) => persistMeals([...meals, makeMeal(input)]);
  const deleteMeal = (id) => persistMeals(meals.filter((m) => m.id !== id));

  // MPG efectivo: DERIVADO en memoria, NUNCA se persiste. [ajuste 2]
  // Si hay >=2 llenados válidos usa el MPG real; si no, el asumido de config.
  const effInfo = useMemo(() => effectiveMpg(config, fuelups), [config, fuelups]);
  const effConfig = useMemo(() => ({ ...config, mpg: effInfo.mpg }), [config, effInfo.mpg]);

  // Agregaciones memoizadas: recalculan al cambiar rutas o el MPG efectivo. [Aud 16]
  const agg = useMemo(() => aggregate(routes, effConfig), [routes, effConfig]);

  // Muestra el período ACTUAL; si está vacío, cae al más reciente con datos
  // (lista ya ordenada desc). Así "Este mes" no queda en $0 al iniciar el mes.
  const semanaInfo = useMemo(() => {
    const key = currentPayWeekKey(config.pay_week_start_day);
    const actual = agg.porSemana.find((w) => w.key === key);
    const item = actual || agg.porSemana[0] || totalsForKey([], key);
    const esActual = item.key === key;
    return { totals: item, label: esActual ? "Esta semana" : payWeekLabel(item.key) };
  }, [agg, config]);

  const mesInfo = useMemo(() => {
    const key = currentMonthKey();
    const actual = agg.porMes.find((m) => m.key === key);
    const item = actual || agg.porMes[0] || totalsForKey([], key);
    const esActual = item.key === key;
    return { totals: item, label: esActual ? "Este mes" : monthLabel(item.key) };
  }, [agg]);
  const routesOrdenadas = useMemo(
    () => [...routes].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [routes]
  );

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file) return;
    try {
      // Un .zip puede traer varios manifests (uno por día). Los leemos todos.
      const items = await readRouteFiles(file);
      let all = [];
      const omitidos = [];
      for (const { text, filename } of items) {
        try {
          all = all.concat(parseRoutes(text, filename));
        } catch (err) {
          // Un archivo vacío/sin datos no debe romper todo el lote.
          omitidos.push(`${filename}: ${err.message || err}`);
        }
      }
      if (all.length === 0) {
        setMsg({
          tipo: "error",
          texto: omitidos.length
            ? "Ningún archivo tenía datos. " + omitidos[0]
            : "No encontré rutas en el archivo.",
        });
        return;
      }
      if (omitidos.length) {
        setMsg({ tipo: "ok", texto: `Se omitieron ${omitidos.length} archivo(s) sin datos.` });
      }
      setPreviews(all);
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
      await markBackedUp(); // marca respaldado → oculta el recordatorio
      setMsg({ tipo: "ok", texto: "Respaldo descargado y marcado." });
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
      const [data, cfg, fu, mt, ml] = await Promise.all([
        storage.loadJSON(KEY_ROUTES, []),
        loadConfig(),
        storage.loadJSON(KEY_FUELUPS, []),
        storage.loadJSON(KEY_MAINT, []),
        storage.loadJSON(KEY_MEALS, []),
      ]);
      setRoutes(Array.isArray(data) ? data : []);
      setConfig(cfg);
      setFuelups(Array.isArray(fu) ? fu : []);
      setMaints(Array.isArray(mt) ? mt : []);
      setMeals(Array.isArray(ml) ? ml : []);
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
        <StatsCards
          semana={semanaInfo.totals}
          mes={mesInfo.totals}
          semanaLabel={semanaInfo.label}
          mesLabel={mesInfo.label}
        />

        <ConfigPanel config={config} onSave={onSaveConfig} />

        {/* Indicador visible de qué MPG se está usando ahora. [ajuste 1] */}
        <div
          className="text-[12px] px-1 -mt-1"
          style={{ color: effInfo.source === "real" ? T.ok : T.textFaint }}
        >
          {effInfo.source === "real"
            ? `Calculando con MPG real: ${effInfo.real}`
            : `Calculando con MPG asumido: ${effInfo.mpg}`}
        </div>

        <FuelupsPanel
          fuelups={fuelups}
          effInfo={effInfo}
          weekStartDow={config.pay_week_start_day}
          onAdd={addFuelup}
          onDelete={deleteFuelup}
        />

        <MaintenancePanel
          maints={maints}
          onAdd={addMaint}
          onDelete={deleteMaint}
          onApplyCostPerMile={applyMaintCostPerMile}
        />

        <MealsPanel
          meals={meals}
          weekStartDow={config.pay_week_start_day}
          semanaLabel={semanaInfo.label}
          semanaNet={semanaInfo.totals.net_profit}
          semanaKey={semanaInfo.totals.key}
          mesLabel={mesInfo.label}
          mesNet={mesInfo.totals.net_profit}
          mesKey={mesInfo.totals.key}
          onAdd={addMeal}
          onDelete={deleteMeal}
        />

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

        <input
          ref={fileRef}
          type="file"
          accept=".zip,.csv,.json,application/zip,text/csv,application/json,text/plain"
          onChange={onFile}
          className="hidden"
        />
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
                  config={effConfig}
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
