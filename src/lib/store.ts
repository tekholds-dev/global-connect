import { create } from "zustand";

export type Panel = "none" | "wallet" | "edit";

interface GlobeState {
  selectedEcosystem: string | null;
  selectedUserId: string | null;
  focus: { lat: number; lng: number } | null;
  panel: Panel;
  onlineIds: Set<string>;
  hovered: string | null;
  selectEcosystem: (slug: string | null, pos?: { lat: number; lng: number }) => void;
  selectUser: (id: string | null, pos?: { lat: number; lng: number }) => void;
  clearFocus: () => void;
  setPanel: (p: Panel) => void;
  setOnline: (ids: Set<string>) => void;
  setHovered: (h: string | null) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedEcosystem: null,
  selectedUserId: null,
  focus: null,
  panel: "none",
  onlineIds: new Set(),
  hovered: null,
  selectEcosystem: (slug, pos) =>
    set({ selectedEcosystem: slug, selectedUserId: null, focus: slug && pos ? pos : null }),
  selectUser: (id, pos) => set({ selectedUserId: id, focus: id && pos ? pos : null }),
  clearFocus: () => set({ focus: null }),
  setPanel: (panel) => set({ panel }),
  setOnline: (onlineIds) => set({ onlineIds }),
  setHovered: (hovered) => set({ hovered }),
}));
