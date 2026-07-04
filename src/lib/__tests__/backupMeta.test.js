import { describe, it, expect, beforeEach } from "vitest";
import { backupStatus } from "../backupMeta.js";

describe("backupStatus (puro)", () => {
  const now = Date.parse("2026-07-10T00:00:00Z");

  it("hay datos y nunca respaldado → needsBackup", () => {
    const r = backupStatus({ meta: { lastBackupAt: null, lastBackupSignature: null }, signature: "abc", hasData: true, now });
    expect(r.needsBackup).toBe(true);
    expect(r.dias).toBe(null);
  });

  it("firma igual a la del último respaldo → NO needsBackup", () => {
    const r = backupStatus({
      meta: { lastBackupAt: "2026-07-08T00:00:00Z", lastBackupSignature: "abc" },
      signature: "abc",
      hasData: true,
      now,
    });
    expect(r.needsBackup).toBe(false);
    expect(r.dias).toBe(2);
  });

  it("firma distinta (hubo cambios) → needsBackup", () => {
    const r = backupStatus({
      meta: { lastBackupAt: "2026-07-09T00:00:00Z", lastBackupSignature: "abc" },
      signature: "xyz",
      hasData: true,
      now,
    });
    expect(r.needsBackup).toBe(true);
  });

  it("sin datos → nunca molesta", () => {
    const r = backupStatus({ meta: { lastBackupAt: null, lastBackupSignature: null }, signature: "abc", hasData: false, now });
    expect(r.needsBackup).toBe(false);
  });
});

describe("computeDataSignature / markBackedUp (localStorage simulado)", () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("firma estable: mismos datos → mismo hash; cambio → distinto", async () => {
    const storage = await import("../storage.js");
    const { computeDataSignature } = await import("../backupMeta.js");
    await storage.saveJSON("route_earnings_v1", [{ id: "1", fecha: "2026-06-27" }]);
    const a = await computeDataSignature();
    const b = await computeDataSignature();
    expect(a.signature).toBe(b.signature);
    expect(a.hasData).toBe(true);
    // cambia un dato → firma distinta
    await storage.saveJSON("route_earnings_v1", [{ id: "1", fecha: "2026-06-28" }]);
    const c = await computeDataSignature();
    expect(c.signature).not.toBe(a.signature);
  });

  it("sin datos → hasData false", async () => {
    const { computeDataSignature } = await import("../backupMeta.js");
    const r = await computeDataSignature();
    expect(r.hasData).toBe(false);
  });

  it("markBackedUp guarda meta con la firma actual → deja de necesitar respaldo", async () => {
    const storage = await import("../storage.js");
    const { computeDataSignature, markBackedUp, loadMeta, backupStatus: st } = await import("../backupMeta.js");
    await storage.saveJSON("gate_codes_v3", [{ id: "c1", name: "X", code: "#1" }]);
    await markBackedUp();
    const meta = await loadMeta();
    const { signature, hasData } = await computeDataSignature();
    expect(st({ meta, signature, hasData }).needsBackup).toBe(false);
    expect(meta.lastBackupAt).toBeTruthy();
  });
});
