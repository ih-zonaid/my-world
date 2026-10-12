// The plot: one 32x32 build area centred on the origin.
// Blocks are stored sparsely as "x,y,z" -> palette index and persisted to
// localStorage, so a server can replace the storage functions later without
// touching the rendering.

export const PLOT_SIZE = 32;
export const PLOT_HALF = PLOT_SIZE / 2; // cells from -16..+15
export const MAX_HEIGHT = 24;

export const PALETTE = [
  { name: "Grass", color: "#6fbf73" },
  { name: "Dirt", color: "#8b5e3c" },
  { name: "Stone", color: "#9aa0a6" },
  { name: "Wood", color: "#c99a5b" },
  { name: "Red", color: "#d9382f" },
  { name: "Blue", color: "#4a7fd4" },
] as const;

export type Blocks = Map<string, number>;

export const blockKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export function parseBlockKey(key: string): [number, number, number] {
  const [x, y, z] = key.split(",");
  return [Number(x), Number(y), Number(z)];
}

export function insidePlot(x: number, z: number) {
  return x >= -PLOT_HALF && x < PLOT_HALF && z >= -PLOT_HALF && z < PLOT_HALF;
}

const STORAGE_KEY = "my-world.plot.v1";

export function loadBlocks(): Blocks {
  const blocks: Blocks = new Map();
  if (typeof localStorage === "undefined") return blocks;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blocks;
    const saved = JSON.parse(raw) as Record<string, number>;
    for (const [key, type] of Object.entries(saved)) {
      const [x, y, z] = parseBlockKey(key);
      if (!Number.isInteger(type) || type < 0 || type >= PALETTE.length) continue;
      if (!insidePlot(x, z) || y < 0 || y >= MAX_HEIGHT) continue;
      blocks.set(key, type);
    }
  } catch {
    // Corrupt save — start with an empty plot.
  }
  return blocks;
}

export function saveBlocks(blocks: Blocks) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(blocks)));
  } catch {
    // Storage full or unavailable — the plot just won't survive a reload.
  }
}
