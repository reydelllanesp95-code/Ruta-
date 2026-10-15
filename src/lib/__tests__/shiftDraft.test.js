import { describe, it, expect } from "vitest";
import { loadDraft, saveDraft, clearDraft, draftHasData, nowHHMM } from "../shiftDraft.js";
import { KEY_SHIFT_DRAFT } from "../constants.js";

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe("borrador del turno", () => {
  it("guarda y recupera", () => {
    const s = fakeStorage();
    saveDraft({ plataforma: "flex", salidaCasa: "07:15", pago: "" }, s);
    const d = loadDraft(s);
    expect(d.salidaCasa).toBe("07:15");
    expect(d.actualizadoEn).toBeTruthy();
    expect(draftHasData(d)).toBe(true);
  });
  it("clearDraft lo borra", () => {
    const s = fakeStorage();
    saveDraft({ salidaCasa: "07:15" }, s);
    clearDraft(s);
    expect(loadDraft(s)).toBeNull();
  });
  it("borrador corrupto → null sin romper", () => {
    const s = fakeStorage();
    s.setItem(KEY_SHIFT_DRAFT, "{no es json");
    expect(loadDraft(s)).toBeNull();
    s.setItem(KEY_SHIFT_DRAFT, "[1,2]");
    expect(loadDraft(s)).toBeNull();
  });
  it("almacenamiento que lanza → no rompe", () => {
    const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(loadDraft(bad)).toBeNull();
    expect(() => saveDraft({ a: 1 }, bad)).not.toThrow();
    expect(() => clearDraft(bad)).not.toThrow();
  });
  it("solo valores por defecto no cuentan como datos", () => {
    expect(draftHasData({ plataforma: "flex", vehiculo: "kia", fecha: "2026-10-15" })).toBe(false);
    expect(draftHasData(null)).toBe(false);
  });
  it("nowHHMM", () => {
    expect(nowHHMM(new Date(2026, 9, 15, 7, 5))).toBe("07:05");
  });
});
