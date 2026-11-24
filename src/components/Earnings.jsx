import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  DownloadCloud,
  UploadCloud,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Images,
  Clock,
  KeyRound,
} from "lucide-react";
import { updateAndReload, BUILD_TIME } from "../lib/appUpdate.js";
import { loadDraft, clearDraft, draftHasData } from "../lib/shiftDraft.js";
import { lastOdometer } from "../lib/odometer.js";
import { T } from "../lib/theme.js";
import { KEY_ROUTES, KEY_FUELUPS, KEY_MAINT, KEY_MEALS, KEY_TOLLS, KEY_LOCALES, KEY_JORNADAS, DEFAULT_CONFIG } from "../lib/constants.js";
import CleaningPanel from "./earnings/CleaningPanel.jsx";
import { sanitizeLocal } from "../lib/cleaning.js";
import * as storage from "../lib/storage.js";
import { parseRoutes, parseCSV, normalizeHeader } from "../lib/parseRoutes.js";
import { dropEmptyRows } from "../lib/csv.js";
import { readRouteFiles } from "../lib/importFile.js";
import {
  aggregate,
  currentPayWeekKey,
  currentMonthKey,
  totalsForKey,
  payWeekLabel,
  monthLabel,
  todayISO,
  fechaCorta,
  formatMoney,
  round2,
} from "../lib/earnings.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { makeFuelup } from "../lib/fuel.js";
import { vehicleConfigs, vehicleOf, vehicleLabel, VEHICLE_IDS, VEHICLES } from "../lib/vehicles.js";
import { makeMaint } from "../lib/maintenance.js";
import { makeMeal } from "../lib/meals.js";
import { makeToll } from "../lib/tolls.js";
import TollsPanel from "./earnings/TollsPanel.jsx";
import { downloadBackup, restoreBackup, downloadPlantillaTurnos, downloadTabla } from "../lib/backup.js";
import ConfigPanel from "./earnings/ConfigPanel.jsx";
import FuelupsPanel from "./earnings/FuelupsPanel.jsx";
import MaintenancePanel from "./earnings/MaintenancePanel.jsx";
import MealsPanel from "./earnings/MealsPanel.jsx";
import RouteCard from "./earnings/RouteCard.jsx";
import ImportDialog from "./earnings/ImportDialog.jsx";
import ShiftForm from "./earnings/ShiftForm.jsx";
import ShiftCard from "./earnings/ShiftCard.jsx";
import PasteCapture from "./earnings/PasteCapture.jsx";
import JornadaCard from "./earnings/JornadaCard.jsx";
import ResumenView from "./earnings/ResumenView.jsx";
import DiaView, { nombreDia } from "./earnings/DiaView.jsx";
import { Card, Eyebrow, Row, Mini, Segmented } from "./earnings/ui.jsx";
import { periodo, resumenRango, propinasPendientes, filasAño } from "../lib/resumen.js";
import { withJornadaMiles } from "../lib/jornada.js";
import {
  makeShift,
  shiftUpdate,
  platformOf,
  isShift,
  isShiftsCSVHeader,
  parseShiftRows,
  deliveryOnly,
  isCleaning,
} from "../lib/platforms.js";

export default function Earnings({ tab = "hoy", onTab = () => {} }) {
  const [routes, setRoutes] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [fuelups, setFuelups] = useState([]);
  const [maints, setMaints] = useState([]);
  const [meals, setMeals] = useState([]);
  const [tolls, setTolls] = useState([]);
  const [locales, setLocales] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [previews, setPreviews] = useState(null); // rutas a importar (abre dialog)
  const [msg, setMsg] = useState(null); // { tipo: "ok"|"error", texto }
  const [saveState, setSaveState] = useState("idle");
  // Si quedó un turno a medias (la app se cerró), el formulario abre solo.
  const [addingShift, setAddingShift] = useState(() => draftHasData(loadDraft()));
  const [pegando, setPegando] = useState(false);
  const [diaSel, setDiaSel] = useState(null);
  const [semanasVisibles, setSemanasVisibles] = useState(4);
  const [gastoTipo, setGastoTipo] = useState("gasolina");
  const [hayBorrador, setHayBorrador] = useState(() => draftHasData(loadDraft()));

  const fileRef = useRef(null);
  const backupRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [data, cfg, fu, mt, ml, tl, lc, jo] = await Promise.all([
        storage.loadJSON(KEY_ROUTES, []),
        loadConfig(),
        storage.loadJSON(KEY_FUELUPS, []),
        storage.loadJSON(KEY_MAINT, []),
        storage.loadJSON(KEY_MEALS, []),
        storage.loadJSON(KEY_TOLLS, []),
        storage.loadJSON(KEY_LOCALES, []),
        storage.loadJSON(KEY_JORNADAS, []),
      ]);
      if (mounted) {
        setJornadas(Array.isArray(jo) ? jo : []);
        setLocales(Array.isArray(lc) ? lc.map(sanitizeLocal) : []);
        setTolls(Array.isArray(tl) ? tl : []);
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

  function persistJornadas(next) {
    setJornadas(next);
    storage.saveJSON(KEY_JORNADAS, next).catch((err) =>
      setMsg({ tipo: "error", texto: "No se pudo guardar la jornada: " + (err.message || err) })
    );
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
  const applyMaintCostPerMile = (value, vehiculo = "kia") =>
    onSaveConfig({ ...config, [VEHICLES[vehiculo].maintKey]: value });

  function persistMeals(next) {
    setMeals(next);
    storage.saveJSON(KEY_MEALS, next).catch((err) =>
      setMsg({ tipo: "error", texto: "No se pudo guardar la comida: " + (err.message || err) })
    );
  }
  const addMeal = (input) => persistMeals([...meals, makeMeal(input)]);
  const deleteMeal = (id) => persistMeals(meals.filter((m) => m.id !== id));

  function persistTolls(next) {
    setTolls(next);
    storage.saveJSON(KEY_TOLLS, next).catch((err) =>
      setMsg({ tipo: "error", texto: "No se pudo guardar el peaje: " + (err.message || err) })
    );
  }
  const addToll = (input) => persistTolls([...tolls, makeToll(input)]);
  const importTolls = (list) => list.length && persistTolls([...tolls, ...list]);

  function saveLocales(list) {
    setLocales(list);
    storage.saveJSON(KEY_LOCALES, list).then(
      () => setMsg({ tipo: "ok", texto: "Locales guardados." }),
      (err) => setMsg({ tipo: "error", texto: "No se pudieron guardar los locales: " + (err.message || err) })
    );
  }
  const deleteToll = (id) => persistTolls(tolls.filter((t) => t.id !== id));

  // Config de costos POR VEHÍCULO: MPG real con sus propios llenados (o el
  // asumido) y su mantenimiento/milla. DERIVADO, nunca se persiste. [ajuste 2]
  const vCfgs = useMemo(() => vehicleConfigs(config, fuelups), [config, fuelups]);
  const configFor = useMemo(() => (r) => vCfgs[vehicleOf(r)].config, [vCfgs]);
  const effByVehicle = useMemo(
    () => Object.fromEntries(VEHICLE_IDS.map((id) => [id, vCfgs[id].effInfo])),
    [vCfgs]
  );

  // Rutas tal como se muestran: con las millas de las jornadas repartidas
  // entre los trabajos de cada día (cálculo; lo guardado no cambia).
  const routesVista = useMemo(() => withJornadaMiles(routes, jornadas), [routes, jornadas]);

  // Agregaciones memoizadas: recalculan al cambiar rutas o los costos. [Aud 16]
  const agg = useMemo(
    // Solo reparto: las limpiezas van en su propio panel.
    () => aggregate(deliveryOnly(routesVista), config, platformOf, configFor),
    [routesVista, config, configFor]
  );

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
  // Vehículo del turno más reciente: sale preseleccionado al añadir otro.
  const lastVehicle = useMemo(() => {
    const turnos = routes.filter(isShift);
    if (!turnos.length) return "kia";
    const last = turnos.reduce((a, b) =>
      (a.fecha + (a.importadoEn || "")) >= (b.fecha + (b.importadoEn || "")) ? a : b
    );
    return vehicleOf(last);
  }, [routes]);

  const routesOrdenadas = useMemo(
    () => [...routesVista].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [routesVista]
  );

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file) return;
    try {
      // Un .zip puede traer varios manifests (uno por día). Los leemos todos.
      const items = await readRouteFiles(file);
      // Plantilla de turnos (Flex/Spark): se importa directo, sin el diálogo de rutas.
      const first = items.length === 1 ? dropEmptyRows(parseCSV(items[0].text)) : [];
      if (first.length > 1 && isShiftsCSVHeader(first[0].map(normalizeHeader))) {
        const res = parseShiftRows(first, routes);
        if (res.shifts.length) persist([...routes, ...res.shifts]);
        const partes = [`Importados ${res.shifts.length} turno(s).`];
        if (res.duplicados) partes.push(`${res.duplicados} ya estaban.`);
        if (res.omitidas.length) {
          partes.push(
            `${res.omitidas.length} fila(s) omitidas: ` +
              res.omitidas.slice(0, 3).map((o) => `fila ${o.fila} (${o.motivo})`).join("; ") +
              (res.omitidas.length > 3 ? "…" : "")
          );
        }
        setMsg({ tipo: res.shifts.length ? "ok" : "error", texto: partes.join(" ") });
        return;
      }
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

  function addShift(input) {
    try {
      persist([...routes, makeShift(input)]);
      clearDraft();
      setHayBorrador(false);
      setAddingShift(false);
      setMsg({ tipo: "ok", texto: "Turno guardado." });
    } catch (err) {
      setMsg({ tipo: "error", texto: err.message || String(err) });
    }
  }

  function editShift(id, input) {
    try {
      updateRoute(id, shiftUpdate(input));
    } catch (err) {
      setMsg({ tipo: "error", texto: err.message || String(err) });
    }
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
      const [data, cfg, fu, mt, ml, tl, lc, jo] = await Promise.all([
        storage.loadJSON(KEY_ROUTES, []),
        loadConfig(),
        storage.loadJSON(KEY_FUELUPS, []),
        storage.loadJSON(KEY_MAINT, []),
        storage.loadJSON(KEY_MEALS, []),
        storage.loadJSON(KEY_TOLLS, []),
        storage.loadJSON(KEY_LOCALES, []),
        storage.loadJSON(KEY_JORNADAS, []),
      ]);
      setTolls(Array.isArray(tl) ? tl : []);
      setLocales(Array.isArray(lc) ? lc.map(sanitizeLocal) : []);
      setRoutes(Array.isArray(data) ? data : []);
      setConfig(cfg);
      setFuelups(Array.isArray(fu) ? fu : []);
      setMaints(Array.isArray(mt) ? mt : []);
      setMeals(Array.isArray(ml) ? ml : []);
      setJornadas(Array.isArray(jo) ? jo : []);
      setMsg({ tipo: "ok", texto: `Respaldo restaurado: ${res.rutas} rutas, ${res.codigos} códigos.` });
    } catch (err) {
      setMsg({ tipo: "error", texto: err.message || String(err) });
    }
  }

  const hoy = todayISO();
  const startDow = config.pay_week_start_day;
  const datos = useMemo(
    () => ({ routes: routesVista, meals, tolls, fuelups, maints, jornadas, configFor }),
    [routesVista, meals, tolls, fuelups, maints, jornadas, configFor]
  );
  const hoyR = useMemo(() => resumenRango(datos, hoy, hoy), [datos, hoy]);
  const semanaP = periodo("semana", hoy, startDow);
  const semanaR = useMemo(() => resumenRango(datos, semanaP.desde, semanaP.hasta), [datos, semanaP.desde, semanaP.hasta]);
  const pendientes = useMemo(() => propinasPendientes(routesVista, hoy), [routesVista, hoy]);
  const año = Number(hoy.slice(0, 4));
  const añoR = useMemo(() => filasAño(datos, año), [datos, año]);

  // Turnos agrupados por semana de pago y por día (más reciente primero).
  const semanas = useMemo(() => {
    const map = new Map();
    for (const r of routesOrdenadas) {
      const k = periodo("semana", r.fecha, startDow).desde;
      if (!map.has(k)) map.set(k, new Map());
      const dias = map.get(k);
      if (!dias.has(r.fecha)) dias.set(r.fecha, []);
      dias.get(r.fecha).push(r);
    }
    return [...map.entries()].map(([desde, dias]) => ({ desde, dias: [...dias.entries()] }));
  }, [routesOrdenadas, startDow]);

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

  function renderRegistro(r) {
    return isShift(r) ? (
      <ShiftCard
        key={r.id}
        route={r}
        config={configFor(r)}
        locales={locales}
        onSave={(input) => editShift(r.id, input)}
        onDelete={deleteRoute}
      />
    ) : (
      <RouteCard
        key={r.id}
        route={r}
        config={configFor(r)}
        onSave={(fields) => updateRoute(r.id, fields)}
        onDelete={deleteRoute}
      />
    );
  }

  // Gasto apuntado de un tipo en [desde, hasta].
  function gastoEn(tipo, desde, hasta) {
    const [lista, campo] = { gasolina: [fuelups, "costo"], mant: [maints, "costo"], comida: [meals, "costo"], peajes: [tolls, "monto"] }[tipo];
    return round2(
      lista
        .filter((x) => String(x.fecha) >= desde && String(x.fecha) <= hasta)
        .reduce((s, x) => s + (Number(x[campo]) > 0 ? Number(x[campo]) : 0), 0)
    );
  }

  const btnSec = { backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` };
  const TITULOS = { hoy: nombreDia(hoy), resumen: "Resumen", turnos: "Turnos", gastos: "Gastos", mas: "Más" };

  const capturas = pegando ? (
    <PasteCapture
      routes={routes}
      vehiculo={lastVehicle}
      onApply={(next, n) => {
        persist(next);
        setPegando(false);
        setMsg({ tipo: "ok", texto: `Captura aplicada: ${n} cambio(s).` });
      }}
      onCancel={() => setPegando(false)}
    />
  ) : (
    <button
      onClick={() => setPegando(true)}
      className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-medium"
      style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}`, minHeight: 52 }}
    >
      <Images size={17} /> Elegir capturas (Flex o Lyft)
    </button>
  );

  const aviso = msg && (
    <div
      className="text-[13px] rounded-lg px-3 py-2"
      style={{ backgroundColor: msg.tipo === "error" ? T.redDim : T.okDim, color: msg.tipo === "error" ? T.red : T.ok }}
    >
      {msg.texto}
    </div>
  );

  return (
    <div className="font-sans" style={{ backgroundColor: T.bg, color: T.textPrimary }}>
      <style>{`
        .gc-eyebrow { font-family: 'Oswald', sans-serif; letter-spacing: 0.14em; }
        .gc-wordmark { font-family: 'Oswald', sans-serif; font-weight: 700; }
        .gc-code { font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace; }
      `}</style>

      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-end justify-between" style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div className="leading-tight">
          <div className="gc-eyebrow text-[10.5px] uppercase" style={{ color: T.textFaint }}>
            {saveState === "saving" ? "guardando…" : saveState === "saved" ? "guardado ✓" : "Ruta"}
          </div>
          <div className="gc-wordmark text-[26px]">{TITULOS[tab] || "Ruta"}</div>
        </div>
        <button onClick={updateAndReload} className="flex flex-col items-end text-[11px]" style={{ color: T.textFaint, minHeight: 44 }} aria-label="Buscar actualización y recargar">
          <span className="flex items-center gap-1" style={{ color: T.textSecondary }}>
            <RefreshCw size={14} /> Actualizar
          </span>
          {BUILD_TIME && (
            <span className="gc-code text-[9.5px]">
              v {new Date(BUILD_TIME).toLocaleString("es-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 pb-28 pt-3 space-y-3">
        {aviso}

        {tab === "hoy" && (
          <>
            {pendientes.length > 0 && (
              <div className="rounded-2xl px-3.5 py-3 flex items-center gap-3" style={{ backgroundColor: T.revisarDim, border: "1px solid #5A4720" }}>
                <Clock size={20} style={{ color: T.revisar }} />
                <div className="flex-1">
                  <div className="text-[14px] font-semibold" style={{ color: "#F7C77A" }}>
                    {pendientes.length} bloque(s) de Flex sin propina
                  </div>
                  <div className="text-[12.5px]" style={{ color: "#E4C489" }}>
                    {pendientes.slice(0, 2).map((r) => `${fechaCorta(r.fecha)} ${r.horaInicio}`).join(" · ")}
                  </div>
                </div>
                <button onClick={() => setPegando(true)} className="rounded-xl px-3 text-[13px] font-semibold" style={{ backgroundColor: T.revisar, color: "#1A1305", minHeight: 44 }}>
                  Subir captura
                </button>
              </div>
            )}

            <JornadaCard
              jornadas={jornadas}
              lastOdoFor={(id) => lastOdometer(id, { routes, fuelups, maints, jornadas })}
              defaultVehicle={lastVehicle}
              onSave={persistJornadas}
            />

            {config.meta_semanal > 0 && (
              <Card>
                <Eyebrow right={<span className="gc-code">{formatMoney(semanaR.ganado)} / {formatMoney(config.meta_semanal)}</span>}>Meta de la semana</Eyebrow>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: T.border }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((semanaR.ganado / config.meta_semanal) * 100))}%`, backgroundColor: T.ok }} />
                </div>
                <div className="text-[12.5px] mt-2" style={{ color: T.textSecondary }}>
                  {semanaR.ganado >= config.meta_semanal
                    ? "¡Meta cumplida!"
                    : `Te faltan ${formatMoney(config.meta_semanal - semanaR.ganado)} · la semana cierra el ${fechaCorta(semanaP.hasta)}`}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Card className="!p-3"><Mini label="Ganado hoy" value={formatMoney(hoyR.ganado)} /></Card>
              <Card className="!p-3"><Mini label="Horas" value={hoyR.horas ? `${hoyR.horas} h` : "—"} /></Card>
              <Card className="!p-3"><Mini label="Millas" value={hoyR.millas ? `${Math.round(hoyR.millas)} mi` : "—"} /></Card>
            </div>
            {hoyR.registros === 0 && (
              <div className="text-[12.5px] px-1" style={{ color: T.textFaint }}>
                Lo de hoy aparece cuando subas las capturas (mañana, con las propinas).
              </div>
            )}

            {capturas}
          </>
        )}

        {tab === "resumen" && <ResumenView datos={datos} startDow={startDow} />}

        {tab === "turnos" && diaSel && (
          <DiaView
            datos={datos}
            fecha={diaSel}
            jornadas={jornadas}
            onFecha={setDiaSel}
            onBack={() => setDiaSel(null)}
            renderRegistro={renderRegistro}
          />
        )}

        {tab === "turnos" && !diaSel && (
          <>
            {addingShift ? (
              <Card>
                <Eyebrow>Turno a mano</Eyebrow>
                <ShiftForm
                  persistDraft
                  locales={locales}
                  lastOdoByVehicle={Object.fromEntries(
                    VEHICLE_IDS.map((id) => [id, lastOdometer(id, { routes, fuelups, maints, jornadas })])
                  )}
                  defaultVehicle={lastVehicle}
                  onSubmit={addShift}
                  onCancel={() => {
                    setHayBorrador(draftHasData(loadDraft()));
                    setAddingShift(false);
                  }}
                />
              </Card>
            ) : (
              <button onClick={() => setAddingShift(true)} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px]" style={{ ...btnSec, color: T.textPrimary, minHeight: 44 }}>
                <Plus size={16} /> {hayBorrador ? "Seguir turno a mano" : "Añadir turno a mano"}
              </button>
            )}

            {semanas.length === 0 && (
              <div className="text-center py-8 text-[13.5px]" style={{ color: T.textFaint }}>
                Aún no hay registros. Sube capturas desde Hoy.
              </div>
            )}
            {semanas.slice(0, semanasVisibles).map((w) => {
              const tot = resumenRango(datos, w.desde, periodo("semana", w.desde, startDow).hasta);
              return (
                <div key={w.desde} className="space-y-2">
                  <div className="flex items-baseline justify-between px-1 pt-2">
                    <span className="gc-eyebrow text-[11.5px] uppercase" style={{ color: T.textFaint }}>
                      Semana {periodo("semana", w.desde, startDow).label}
                    </span>
                    <span className="gc-code text-[13px]" style={{ color: T.textSecondary }}>{formatMoney(tot.ganado)}</span>
                  </div>
                  {w.dias.map(([fecha, regs]) => {
                    const total = regs.filter((r) => !isCleaning(r)).reduce((s, r) => s + (Number(r.ganancia) || 0), 0);
                    return (
                      <div key={fecha} className="space-y-2">
                        <button
                          onClick={() => setDiaSel(fecha)}
                          className="w-full flex items-center justify-between rounded-xl px-3.5 py-3"
                          style={{ backgroundColor: T.surfaceRaised, border: `1px solid #3A3A3D`, minHeight: 48 }}
                        >
                          <span className="text-[14px] font-semibold">{nombreDia(fecha)}</span>
                          <span className="gc-code text-[14px]" style={{ color: T.ok }}>{formatMoney(total)} ›</span>
                        </button>
                        {regs.map((r) => renderRegistro(r))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {semanas.length > semanasVisibles && (
              <button onClick={() => setSemanasVisibles((n) => n + 4)} className="w-full rounded-xl py-3 text-[13.5px]" style={{ ...btnSec, minHeight: 44 }}>
                Ver semanas anteriores
              </button>
            )}
          </>
        )}

        {tab === "gastos" && (
          <>
            <Segmented
              label="Tipo de gasto"
              value={gastoTipo}
              onChange={setGastoTipo}
              options={[
                { id: "gasolina", label: "Gasolina" },
                { id: "mant", label: "Manten." },
                { id: "comida", label: "Comida" },
                { id: "peajes", label: "Peajes" },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Card className="!p-3"><Mini label={`Semana ${semanaP.label}`} value={formatMoney(gastoEn(gastoTipo, semanaP.desde, semanaP.hasta))} /></Card>
              <Card className="!p-3"><Mini label={monthLabel(hoy.slice(0, 7))} value={formatMoney(gastoEn(gastoTipo, `${hoy.slice(0, 7)}-01`, `${hoy.slice(0, 7)}-31`))} /></Card>
            </div>
            {gastoTipo === "gasolina" && (
              <FuelupsPanel defaultOpen fuelups={fuelups} effByVehicle={effByVehicle} weekStartDow={startDow} onAdd={addFuelup} onDelete={deleteFuelup} />
            )}
            {gastoTipo === "mant" && (
              <MaintenancePanel defaultOpen maints={maints} onAdd={addMaint} onDelete={deleteMaint} onApplyCostPerMile={applyMaintCostPerMile} />
            )}
            {gastoTipo === "comida" && (
              <MealsPanel
                defaultOpen
                meals={meals}
                weekStartDow={startDow}
                semanaLabel={semanaInfo.label}
                semanaNet={semanaInfo.totals.net_profit}
                semanaKey={semanaInfo.totals.key}
                mesLabel={mesInfo.label}
                mesNet={mesInfo.totals.net_profit}
                mesKey={mesInfo.totals.key}
                onAdd={addMeal}
                onDelete={deleteMeal}
              />
            )}
            {gastoTipo === "peajes" && (
              <TollsPanel defaultOpen tolls={tolls} weekStartDow={startDow} onAdd={addToll} onImport={importTolls} onDelete={deleteToll} />
            )}
          </>
        )}

        {tab === "mas" && (
          <>
            <Card>
              <Eyebrow right="para tu contador">Año {año}</Eyebrow>
              {añoR.resumen.porApp.map((a) => (
                <Row key={a.plataforma} label={`Ingresos ${a.label}`} value={formatMoney(a.ganado)} />
              ))}
              <Row label="Millas de trabajo" value={`${Math.round(añoR.resumen.millas).toLocaleString("en-US")} mi`} />
              <Row label="Gasolina pagada" value={formatMoney(añoR.resumen.gasolinaPagada)} />
              <Row label="Mantenimiento pagado" value={formatMoney(añoR.mantenimientoPagado)} />
              <Row label="Comida + peajes" value={formatMoney(añoR.resumen.deducciones.comida + añoR.resumen.deducciones.peajes)} />
              <button onClick={() => downloadTabla(añoR.filas, `ruta-resumen-${año}.csv`)} className="w-full mt-2 rounded-xl py-2.5 text-[14px] font-semibold" style={{ backgroundColor: T.red, color: "#fff", minHeight: 44 }}>
                Descargar resumen (CSV)
              </button>
              <div className="text-[12px] mt-2" style={{ color: T.textFaint }}>
                No soy contador: es un resumen de tus datos, no un cálculo de impuestos.
              </div>
            </Card>

            <ConfigPanel config={config} onSave={onSaveConfig} />
            <div className="text-[12px] px-1 -mt-1 space-y-0.5">
              {VEHICLE_IDS.map((id) => {
                const e = effByVehicle[id];
                return (
                  <div key={id} style={{ color: e.source === "real" ? T.ok : T.textFaint }}>
                    {vehicleLabel(id)}: {e.source === "real" ? `MPG real ${e.real}` : `MPG asumido ${e.mpg}`}
                  </div>
                );
              })}
            </div>

            <CleaningPanel routes={routes} locales={locales} configFor={configFor} onSaveLocales={saveLocales} />

            <button onClick={() => onTab("codigos")} className="w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px]" style={{ ...btnSec, color: T.textPrimary, minHeight: 48 }}>
              <span className="flex items-center gap-2"><KeyRound size={16} /> Códigos de acceso</span>
              <span style={{ color: T.textFaint }}>›</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]" style={btnSec}>
                <Upload size={15} /> Importar CSV
              </button>
              <button onClick={downloadPlantillaTurnos} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]" style={btnSec}>
                <FileSpreadsheet size={15} /> Plantilla CSV
              </button>
            </div>

            <Card>
              <Eyebrow>Respaldo</Eyebrow>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onExport} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]" style={{ ...btnSec, color: T.textPrimary, minHeight: 44 }}>
                  <DownloadCloud size={15} /> Exportar
                </button>
                <button onClick={() => backupRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px]" style={{ ...btnSec, color: T.red, minHeight: 44 }}>
                  <UploadCloud size={15} /> Importar…
                </button>
              </div>
              <div className="text-[12px] mt-2" style={{ color: T.textFaint }}>Importar reemplaza todo lo que hay en el teléfono.</div>
            </Card>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".zip,.csv,.json,application/zip,text/csv,application/json,text/plain"
          onChange={onFile}
          className="hidden"
        />
        <input ref={backupRef} type="file" accept=".json" onChange={onImportBackup} className="hidden" />
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
