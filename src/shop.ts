import { itemById } from "./items";
import { PLOT_HALF, insidePlot } from "./plot";

// The economy: your wallet + inventory, plus every placed storefront. Persisted
// as one blob; placed blocks live separately in plot.ts.

export type Stack = { id: string; count: number };

export type ShopOwner = "me" | "npc";

export type Shop = {
  id: string;
  pos: [number, number, number];
  owner: ShopOwner;
  stock: Stack[]; // npc: what's for sale (finite); me: unused for now
  showcase: string[]; // item ids rendered in 3D at the storefront
  restockAt: number; // epoch ms (npc only)
};

export type PlacedItem = {
  id: number;
  type: string;
  pos: [number, number, number];
};

export type Save = {
  wallet: number;
  inventory: Stack[];
  shops: Shop[];
};

export const START_WALLET = 500;
export const RESTOCK_MS = 60_000;
// The other shop sits just outside the plot edge, opposite your plot.
export const NPC_SPAWN: [number, number, number] = [18, 0, 12];

// Keep a shop fully inside the plot, margin for its footprint.
export const clampInPlot = (n: number) => Math.min(PLOT_HALF - 2, Math.max(-PLOT_HALF + 2, Math.round(n)));

const STARTER: Stack[] = [
  { id: "grass", count: 20 },
  { id: "dirt", count: 20 },
  { id: "stone", count: 12 },
  { id: "wood", count: 12 },
  { id: "red", count: 6 },
  { id: "blue", count: 6 },
  { id: "lamp", count: 1 },
  { id: "crate", count: 2 },
];

// What an NPC shop refills to on each restock.
export const NPC_STOCK: Stack[] = [
  { id: "grass", count: 30 },
  { id: "dirt", count: 30 },
  { id: "stone", count: 20 },
  { id: "wood", count: 20 },
  { id: "lamp", count: 3 },
  { id: "chair", count: 3 },
  { id: "mailbox", count: 4 },
  { id: "crate", count: 5 },
  { id: "flower", count: 6 },
  { id: "tree", count: 2 },
];

export const defaultInventory = (): Stack[] => STARTER.map((s) => ({ ...s }));

let shopSeq = 0;
export const newShopId = () => `shop-${Date.now().toString(36)}-${shopSeq++}`;

export function newNpcShop(pos: [number, number, number]): Shop {
  return {
    id: newShopId(),
    pos,
    owner: "npc",
    stock: NPC_STOCK.map((s) => ({ ...s })),
    showcase: NPC_STOCK.slice(0, 4).map((s) => s.id),
    restockAt: Date.now() + RESTOCK_MS,
  };
}

export function newMyShop(pos: [number, number, number]): Shop {
  return { id: newShopId(), pos, owner: "me", stock: [], showcase: [], restockAt: 0 };
}

// Refill every NPC shop whose timer has elapsed. Returns the same array when
// nothing changed, so callers can skip a state update.
export function applyRestock(shops: Shop[]): Shop[] {
  const now = Date.now();
  let changed = false;
  const next = shops.map((s) => {
    if (s.owner !== "npc" || now < s.restockAt) return s;
    changed = true;
    return { ...s, stock: NPC_STOCK.map((b) => ({ ...b })), restockAt: now + RESTOCK_MS };
  });
  return changed ? next : shops;
}

// ---- persistence -----------------------------------------------------------

const STORAGE_KEY = "my-world.save.v2";

const isPos = (v: any): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

function sanitizeStacks(v: any): Stack[] {
  if (!Array.isArray(v)) return [];
  const out: Stack[] = [];
  for (const s of v) {
    if (!s || typeof s.id !== "string" || !itemById(s.id)) continue;
    const count = Math.floor(s.count);
    if (!Number.isInteger(count) || count <= 0) continue;
    out.push({ id: s.id, count });
  }
  return out;
}

function sanitizeShop(v: any): Shop | null {
  if (!v || typeof v !== "object" || !isPos(v.pos)) return null;
  const showcase = Array.isArray(v.showcase)
    ? v.showcase.filter((id: any) => typeof id === "string" && itemById(id))
    : [];
  const owner = v.owner === "me" ? "me" : "npc";
  // Your shop belongs inside the plot; the other shop lives outside it. Nudge
  // any saved shop that breaks the rule back to the right side.
  let pos = v.pos;
  if (owner === "me") {
    pos = [clampInPlot(pos[0]), 0, clampInPlot(pos[2])];
  } else if (insidePlot(pos[0], pos[2])) {
    pos = NPC_SPAWN;
  }
  return {
    id: typeof v.id === "string" ? v.id : newShopId(),
    pos,
    owner,
    stock: sanitizeStacks(v.stock),
    showcase,
    restockAt: typeof v.restockAt === "number" ? v.restockAt : 0,
  };
}

function freshSave(): Save {
  return { wallet: START_WALLET, inventory: defaultInventory(), shops: [newNpcShop(NPC_SPAWN)] };
}

export function loadSave(): Save {
  if (typeof localStorage === "undefined") return freshSave();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw) as any;
    const inventory = sanitizeStacks(data.inventory);
    const parsed = (Array.isArray(data.shops) ? data.shops.map(sanitizeShop).filter(Boolean) : []) as Shop[];
    // The world holds exactly one shop of each kind: your shop, plus one other
    // shop you buy from.
    const other = parsed.find((s) => s.owner === "npc") ?? newNpcShop(NPC_SPAWN);
    const mine = parsed.find((s) => s.owner === "me");
    const shops: Shop[] = mine ? [other, mine] : [other];
    if (inventory.length === 0) inventory.push(...defaultInventory());
    const wallet =
      typeof data.wallet === "number" && data.wallet >= 0 ? Math.floor(data.wallet) : START_WALLET;
    return { wallet, inventory, shops };
  } catch {
    return freshSave();
  }
}

export function saveSave(save: Save) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage full/unavailable — progress just won't survive a reload.
  }
}
