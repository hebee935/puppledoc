import { create } from 'zustand';
import type { Endpoint, EndpointGroup, OpenApiDoc, SpaceApiBootstrap } from './types';
import { flattenEndpoints, normalize } from './spec';

interface UiState {
  bootstrap: SpaceApiBootstrap;
  doc: OpenApiDoc | null;
  groups: EndpointGroup[];
  activeId: string | null;
  token: string;
  server: string;
  paletteOpen: boolean;
  authOpen: boolean;
  drawerOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  testWidth: number;

  load: (doc: OpenApiDoc) => void;
  selectEndpoint: (id: string) => void;
  selectGroup: (groupId: string) => void;
  goOverview: () => void;
  setToken: (t: string) => void;
  setServer: (u: string) => void;
  openPalette: () => void;
  closePalette: () => void;
  openAuth: () => void;
  closeAuth: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  setTestWidth: (w: number) => void;
  getActive: () => Endpoint | null;
  /** Re-sync activeId from window.location.hash (called by a hashchange listener). */
  syncFromHash: () => void;
}

function readHashId(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function writeHash(id: string | null): void {
  const target = id ? `#${encodeURIComponent(id)}` : '';
  if (window.location.hash === target) return;
  if (id) {
    // Setting hash auto-pushes to history; back/forward then traverses selections.
    window.location.hash = encodeURIComponent(id);
  } else {
    // Clear hash without leaving "#" in the URL.
    history.pushState(null, '', window.location.pathname + window.location.search);
  }
}

const STORAGE_KEYS = {
  token: 'space-api:token',
  activeId: 'space-api:activeId',
  server: 'space-api:server',
  sidebarWidth: 'space-api:sidebarWidth',
  testWidth: 'space-api:testWidth',
};

const WIDTH_BOUNDS = { min: 220, max: 720 };

function clampWidth(n: number): number {
  if (!Number.isFinite(n)) return WIDTH_BOUNDS.min;
  return Math.min(Math.max(n, WIDTH_BOUNDS.min), WIDTH_BOUNDS.max);
}

function readWidth(key: string, fallback: number): number {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) && v > 0 ? clampWidth(v) : fallback;
}

function readBootstrap(): SpaceApiBootstrap {
  const w = window as { __SPACE_API__?: SpaceApiBootstrap };
  return w.__SPACE_API__ ?? { basePath: '' };
}

export const useStore = create<UiState>((set, get) => ({
  bootstrap: readBootstrap(),
  doc: null,
  groups: [],
  activeId: null,
  token: localStorage.getItem(STORAGE_KEYS.token) ?? '',
  server: localStorage.getItem(STORAGE_KEYS.server) ?? '',
  paletteOpen: false,
  authOpen: false,
  drawerOpen: false,
  sidebarCollapsed: localStorage.getItem('space-api:sidebarCollapsed') === '1',
  sidebarWidth: readWidth(STORAGE_KEYS.sidebarWidth, 260),
  testWidth: readWidth(STORAGE_KEYS.testWidth, 520),

  load: (doc) => {
    const groups = normalize(doc);
    const endpoints = flattenEndpoints(groups);
    const savedId = localStorage.getItem(STORAGE_KEYS.activeId);
    const hashId = readHashId();
    // Priority: URL hash (deep-link) > localStorage (resume) > overview.
    // The literal '__overview__' pins overview explicitly.
    const validate = (id: string | null): string | null => {
      if (!id || id === '__overview__') return null;
      return endpoints.some((e) => e.id === id) || groups.some((g) => g.id === id) ? id : null;
    };
    const activeId = validate(hashId) ?? validate(savedId);

    const defaultServer =
      get().server ||
      get().bootstrap.ui?.servers?.[0]?.url ||
      doc.servers?.[0]?.url ||
      window.location.origin;

    set({ doc, groups, activeId, server: defaultServer });
    if (activeId) localStorage.setItem(STORAGE_KEYS.activeId, activeId);
    localStorage.setItem(STORAGE_KEYS.server, defaultServer);
    // Reflect resolved activeId into the URL hash without adding a history
    // entry, so refreshes and shares stay in sync from the start.
    const target = activeId ? `#${encodeURIComponent(activeId)}` : '';
    if (window.location.hash !== target) {
      history.replaceState(null, '', window.location.pathname + window.location.search + target);
    }
  },
  selectEndpoint: (id) => {
    set({ activeId: id });
    localStorage.setItem(STORAGE_KEYS.activeId, id);
    writeHash(id);
  },
  selectGroup: (groupId) => {
    set({ activeId: groupId });
    localStorage.setItem(STORAGE_KEYS.activeId, groupId);
    writeHash(groupId);
  },
  goOverview: () => {
    set({ activeId: null });
    localStorage.setItem(STORAGE_KEYS.activeId, '__overview__');
    writeHash(null);
  },
  setToken: (t) => {
    set({ token: t });
    if (t) localStorage.setItem(STORAGE_KEYS.token, t);
    else localStorage.removeItem(STORAGE_KEYS.token);
  },
  setServer: (u) => {
    set({ server: u });
    localStorage.setItem(STORAGE_KEYS.server, u);
  },
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  openAuth: () => set({ authOpen: true }),
  closeAuth: () => set({ authOpen: false }),
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleSidebar: () => set((state) => {
    const next = !state.sidebarCollapsed;
    localStorage.setItem('space-api:sidebarCollapsed', next ? '1' : '0');
    return { sidebarCollapsed: next };
  }),
  setSidebarWidth: (w) => {
    const next = clampWidth(w);
    set({ sidebarWidth: next });
    localStorage.setItem(STORAGE_KEYS.sidebarWidth, String(next));
  },
  setTestWidth: (w) => {
    const next = clampWidth(w);
    set({ testWidth: next });
    localStorage.setItem(STORAGE_KEYS.testWidth, String(next));
  },
  getActive: () => {
    const { activeId, groups } = get();
    if (!activeId) return null;
    for (const g of groups) for (const e of g.endpoints) if (e.id === activeId) return e;
    return null;
  },
  syncFromHash: () => {
    const { groups, activeId } = get();
    const endpoints = flattenEndpoints(groups);
    const hashId = readHashId();
    const next = !hashId
      ? null
      : endpoints.some((e) => e.id === hashId) || groups.some((g) => g.id === hashId)
        ? hashId
        : activeId;
    if (next === activeId) return;
    set({ activeId: next });
    if (next) localStorage.setItem(STORAGE_KEYS.activeId, next);
    else localStorage.setItem(STORAGE_KEYS.activeId, '__overview__');
  },
}));
