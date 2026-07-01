import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
  Loader2,
  MapPin,
  Globe,
  PackageSearch,
} from "lucide-react";
import { T } from "../lib/theme.js";
import { KEY_CODES as STORAGE_KEY, UNCONFIRMED_LABEL } from "../lib/constants.js";
import * as storage from "../lib/storage.js";

const STATUS = {
  ok: { label: "Vigente", color: T.ok, dim: T.okDim, Icon: CheckCircle2 },
  broken: { label: "No sirve", color: T.red, dim: T.redDim, Icon: AlertTriangle },
  revisar: { label: "Revisar", color: T.revisar, dim: T.revisarDim, Icon: HelpCircle },
};

// Los códigos NO se incluyen en el código de la app (privacidad).
// El usuario carga los suyos con "Importar respaldo"; viven solo en su teléfono.
const SEED = [];

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
function normalize(str) {
  return (str || "").normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

function makeId() {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function GateCodeDirectory() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedZip, setSelectedZip] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", code: "", note: "", status: "ok", zip: "", city: "" });
  const [addingNew, setAddingNew] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [lastError, setLastError] = useState("");

  const saveQueueRef = useRef(Promise.resolve());
  const pendingEntriesRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await storage.get(STORAGE_KEY);
        if (!mounted) return;
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setEntries(Array.isArray(parsed) && parsed.length ? parsed : SEED);
        } else {
          setEntries(SEED);
        }
      } catch (err) {
        setEntries(SEED);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Los guardados se encolan de uno en uno (dos guardados nunca se solapan ni
  // corrompen), y reintentan una vez automáticamente antes de mostrar un error
  // visible con botón para reintentar manualmente.
  const writeToStorage = useCallback(async (value) => {
    const result = await storage.set(STORAGE_KEY, value);
    if (!result) throw new Error("El almacenamiento devolvió una respuesta vacía");
    return result;
  }, []);

  const persist = useCallback(
    (next) => {
      pendingEntriesRef.current = next;
      setSaveState("saving");
      const value = JSON.stringify(next);
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          await writeToStorage(value);
          setSaveState("saved");
          setLastError("");
        } catch (err) {
          try {
            await new Promise((r) => setTimeout(r, 700));
            await writeToStorage(value);
            setSaveState("saved");
            setLastError("");
          } catch (err2) {
            setSaveState("error");
            setLastError(String((err2 && err2.message) || err2));
          }
        } finally {
          setTimeout(() => setSaveState((s) => (s === "saving" ? "idle" : s)), 1500);
        }
      });
    },
    [writeToStorage]
  );

  const retrySave = useCallback(() => {
    if (pendingEntriesRef.current) persist(pendingEntriesRef.current);
  }, [persist]);

  const updateEntries = useCallback(
    (next) => {
      setEntries(next);
      persist(next);
    },
    [persist]
  );

  const zipGroups = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = e.zip || "";
      if (!map.has(key)) map.set(key, { zip: key, city: e.city || "", count: 0 });
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.zip === "" && b.zip === "") return 0;
      if (a.zip === "") return 1;
      if (b.zip === "") return -1;
      return a.zip.localeCompare(b.zip);
    });
  }, [entries]);

  const zipFiltered = useMemo(() => {
    if (selectedZip === "all") return entries;
    return entries.filter((e) => (e.zip || "") === selectedZip);
  }, [entries, selectedZip]);

  const searched = useMemo(() => {
    const q = normalize(query.trim());
    const list = !q
      ? zipFiltered
      : zipFiltered.filter(
          (e) =>
            normalize(e.name).includes(q) ||
            normalize(e.code).includes(q) ||
            normalize(e.note).includes(q)
        );
    return [...list].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  }, [zipFiltered, query]);

  const showGeneralSearchHint =
    selectedZip !== "all" && query.trim().length > 0 && searched.length === 0;

  const grouped = useMemo(() => {
    const groups = {};
    searched.forEach((e) => {
      const first = normalize(e.name).charAt(0).toUpperCase() || "#";
      const letter = /[A-Z]/.test(first) ? first : "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(e);
    });
    return Object.keys(groups)
      .sort()
      .map((letter) => ({ letter, items: groups[letter] }));
  }, [searched]);

  function startEdit(entry) {
    setEditingId(entry.id);
    setAddingNew(false);
    setDraft({
      name: entry.name,
      code: entry.code,
      note: entry.note,
      status: entry.status,
      zip: entry.zip || "",
      city: entry.city || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setAddingNew(false);
    setDraft({ name: "", code: "", note: "", status: "ok", zip: "", city: "" });
  }

  function saveEdit() {
    if (!draft.name.trim() || !draft.code.trim()) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      code: draft.code.trim(),
      zip: draft.zip.trim(),
      city: draft.city.trim(),
    };
    if (addingNew) {
      updateEntries([...entries, { id: makeId(), ...clean }]);
    } else {
      updateEntries(entries.map((e) => (e.id === editingId ? { ...e, ...clean } : e)));
    }
    cancelEdit();
  }

  function deleteEntry(id) {
    updateEntries(entries.filter((e) => e.id !== id));
    cancelEdit();
  }

  function startAdd() {
    setAddingNew(true);
    setEditingId("__new__");
    setDraft({
      name: "",
      code: "",
      note: "",
      status: "ok",
      zip: selectedZip === "all" ? "" : selectedZip,
      city: selectedZip === "all" ? "" : zipGroups.find((g) => g.zip === selectedZip)?.city || "",
    });
  }

  if (!loaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ backgroundColor: T.bg, color: T.textSecondary }}
      >
        <Loader2 className="animate-spin mr-2" size={18} />
        Cargando códigos…
      </div>
    );
  }

  return (
    <div className="font-sans" style={{ backgroundColor: T.bg, color: T.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');
        .gc-eyebrow { font-family: 'Oswald', sans-serif; letter-spacing: 0.14em; }
        .gc-wordmark { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 0.01em; }
        .gc-code { font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace; }
        .gc-row:active { transform: scale(0.997); }
        .gc-chip-row::-webkit-scrollbar { display: none; }
        .gc-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        input::placeholder, textarea::placeholder { color: ${T.textFaint}; }
      `}</style>

      {/* Header / brand mark / search / zip selector */}
      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}
      >
        {/* Brand mark — colors inspired by OnTrac (black + red), not a reproduction of their logo */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="flex items-center justify-center rounded-md"
            style={{ width: 30, height: 30, backgroundColor: "#000", border: `1px solid ${T.border}` }}
          >
            <PackageSearch size={16} style={{ color: T.red }} />
          </div>
          <div className="leading-tight">
            <div className="gc-wordmark text-[15px]">
              <span style={{ color: T.textPrimary }}>ON</span>
              <span style={{ color: T.red }}>TRAC</span>
            </div>
            <div className="gc-eyebrow text-[10px] uppercase" style={{ color: T.textFaint }}>
              Códigos de acceso · ruta
            </div>
          </div>
        </div>

        {/* Zip selector chips */}
        <div className="gc-chip-row flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          <Chip
            active={selectedZip === "all"}
            onClick={() => setSelectedZip("all")}
            icon={Globe}
            label="Todas las zonas"
            sub={`${entries.length}`}
          />
          {zipGroups.map((g) => (
            <Chip
              key={g.zip || "unconfirmed"}
              active={selectedZip === g.zip}
              onClick={() => setSelectedZip(g.zip)}
              icon={MapPin}
              label={g.zip ? `${g.zip} · ${g.city}` : UNCONFIRMED_LABEL}
              sub={`${g.count}`}
            />
          ))}
        </div>

        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-1"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
        >
          <Search size={17} style={{ color: T.textSecondary }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comunidad o código…"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: T.textPrimary }}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
              <X size={16} style={{ color: T.textSecondary }} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 text-xs gap-2" style={{ color: T.textFaint }}>
          <span>
            {searched.length} de {zipFiltered.length}
            {selectedZip !== "all" ? " en esta zona" : ""}
          </span>
          <span className="flex items-center gap-1 h-4 text-right">
            {saveState === "saving" && (
              <>
                <Loader2 className="animate-spin" size={12} /> guardando…
              </>
            )}
            {saveState === "saved" && <span style={{ color: T.ok }}>guardado ✓</span>}
            {saveState === "error" && (
              <button onClick={retrySave} style={{ color: T.red }} className="underline text-right">
                error: {lastError ? lastError.slice(0, 60) : "no se pudo guardar"} · reintentar
              </button>
            )}
          </span>
        </div>
      </div>

      {addingNew && (
        <EditCard draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={cancelEdit} isNew />
      )}

      <div className="px-4 pb-28 pt-2">
        {grouped.length === 0 && (
          <div className="text-center py-10" style={{ color: T.textFaint }}>
            <div className="mb-3">Sin resultados para "{query}"{selectedZip !== "all" ? " en esta zona" : ""}</div>
            {showGeneralSearchHint && (
              <button
                onClick={() => setSelectedZip("all")}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-medium"
                style={{ backgroundColor: T.surfaceRaised, color: T.red, border: `1px solid ${T.redDim}` }}
              >
                <Globe size={15} />
                Buscar en todas las zonas
              </button>
            )}
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.letter} className="mb-3">
            <div className="gc-eyebrow text-[11px] uppercase px-1 py-1" style={{ color: T.textFaint }}>
              {group.letter}
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              {group.items.map((entry, idx) =>
                editingId === entry.id ? (
                  <EditCard
                    key={entry.id}
                    draft={draft}
                    setDraft={setDraft}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteEntry(entry.id)}
                  />
                ) : (
                  <Row
                    key={entry.id}
                    entry={entry}
                    onTap={() => startEdit(entry)}
                    isLast={idx === group.items.length - 1}
                    showZip={selectedZip === "all"}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {!addingNew && (
        <button
          onClick={startAdd}
          className="fixed bottom-24 right-5 rounded-full p-4 shadow-lg flex items-center justify-center"
          style={{ backgroundColor: T.red, color: "#FFFFFF" }}
          aria-label="Agregar comunidad"
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}

function Chip({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap"
      style={{
        backgroundColor: active ? T.redDim : T.surface,
        color: active ? T.red : T.textSecondary,
        border: `1px solid ${active ? T.red : T.border}`,
      }}
    >
      <Icon size={12} />
      {label}
      <span style={{ color: active ? T.red : T.textFaint, opacity: 0.8 }}>· {sub}</span>
    </button>
  );
}

function ZipTag({ entry }) {
  if (!entry.zip && !entry.city) {
    return (
      <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: T.surfaceRaised, color: T.textFaint }}>
        {UNCONFIRMED_LABEL}
      </span>
    );
  }
  return (
    <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: T.surfaceRaised, color: T.textSecondary }}>
      {entry.zip} · {entry.city}
    </span>
  );
}

function Row({ entry, onTap, isLast, showZip }) {
  const meta = STATUS[entry.status] || STATUS.ok;
  const StatusIcon = meta.Icon;
  return (
    <button
      onClick={onTap}
      className="gc-row w-full flex items-center gap-3 px-3 py-3 text-left transition-transform"
      style={{ backgroundColor: T.surface, borderBottom: isLast ? "none" : `1px solid ${T.borderSoft}` }}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 26, height: 26, backgroundColor: meta.dim }}
      >
        <StatusIcon size={14} style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium" style={{ color: T.textPrimary }}>
          {entry.name}
        </div>
        {entry.note && (
          <div className="gc-clamp2 text-[13px] leading-snug mt-0.5" style={{ color: T.textSecondary }}>
            {entry.note}
          </div>
        )}
        {showZip && (
          <div className="mt-1">
            <ZipTag entry={entry} />
          </div>
        )}
      </div>

      <div
        className="gc-code shrink-0 text-[13.5px] px-2.5 py-1.5 rounded-md text-right font-medium"
        style={{
          backgroundColor: T.surfaceRaised,
          color: T.textPrimary,
          borderLeft: `3px solid ${T.red}`,
          minWidth: 64,
        }}
      >
        {entry.code}
      </div>

      <Pencil size={14} style={{ color: T.textFaint }} className="shrink-0" />
    </button>
  );
}

function EditCard({ draft, setDraft, onSave, onCancel, onDelete, isNew }) {
  return (
    <div
      className="mx-4 mb-3 rounded-xl p-3 space-y-2.5"
      style={{ backgroundColor: T.surfaceRaised, border: `1px solid ${T.redDim}` }}
    >
      <div>
        <label className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          Comunidad
        </label>
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Nombre del residencial"
          className="w-full mt-1 rounded-lg px-3 py-2 text-[14.5px] outline-none"
          style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
        />
      </div>

      <div>
        <label className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          Código
        </label>
        <input
          value={draft.code}
          onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
          placeholder="Ej. #2366"
          className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[14.5px] outline-none"
          style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.red}` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
            Zipcode
          </label>
          <input
            value={draft.zip}
            onChange={(e) => setDraft((d) => ({ ...d, zip: e.target.value }))}
            placeholder="Ej. 32714"
            className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[13.5px] outline-none"
            style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
          />
        </div>
        <div>
          <label className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
            Ciudad
          </label>
          <input
            value={draft.city}
            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            placeholder="Ej. Altamonte Springs, FL"
            className="w-full mt-1 rounded-lg px-3 py-2 text-[13.5px] outline-none"
            style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          Nota (opcional)
        </label>
        <textarea
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          placeholder="Ej. tocar dos veces, locker, zona…"
          rows={2}
          className="w-full mt-1 rounded-lg px-3 py-2 text-[13.5px] outline-none resize-none"
          style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
        />
      </div>

      <div>
        <label className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          Estado
        </label>
        <div className="flex gap-2 mt-1">
          {Object.entries(STATUS).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setDraft((d) => ({ ...d, status: key }))}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12.5px]"
              style={{
                backgroundColor: draft.status === key ? meta.dim : T.surface,
                color: draft.status === key ? meta.color : T.textFaint,
                border: `1px solid ${draft.status === key ? meta.color : T.border}`,
              }}
            >
              <meta.Icon size={13} />
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!draft.name.trim() || !draft.code.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13.5px] font-medium disabled:opacity-40"
          style={{ backgroundColor: T.red, color: "#FFFFFF" }}
        >
          <Save size={14} />
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-[13.5px]"
          style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
        >
          Cancelar
        </button>
        {!isNew && onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-lg py-2 px-3"
            style={{ backgroundColor: T.redDim, color: T.red, border: `1px solid ${T.red}` }}
            aria-label="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
