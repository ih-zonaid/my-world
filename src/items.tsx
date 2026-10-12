import type { ReactNode } from "react";

// The single catalog: everything placeable — blocks and props alike — is an
// item you must own. Blocks are drawn by PlotArea's InstancedMesh (they only
// need a colour), props render themselves from primitives (a GLB later).
export type ItemKind = "block" | "prop";

export type ItemDef = {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  swatch: string;
  render?: () => ReactNode;
};

export const ITEMS: ItemDef[] = [
  // ---- blocks (order matters: plot.ts stores block types by index) ----
  { id: "grass", name: "Grass", kind: "block", price: 5, swatch: "#6fbf73" },
  { id: "dirt", name: "Dirt", kind: "block", price: 5, swatch: "#8b5e3c" },
  { id: "stone", name: "Stone", kind: "block", price: 8, swatch: "#9aa0a6" },
  { id: "wood", name: "Wood", kind: "block", price: 8, swatch: "#c99a5b" },
  { id: "red", name: "Red", kind: "block", price: 10, swatch: "#d9382f" },
  { id: "blue", name: "Blue", kind: "block", price: 10, swatch: "#4a7fd4" },
  // ---- props ----
  {
    id: "lamp",
    name: "Lamp",
    kind: "prop",
    price: 40,
    swatch: "#ffd25e",
    render: () => (
      <>
        <mesh castShadow position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
          <meshStandardMaterial color="#3b3f46" />
        </mesh>
        <mesh castShadow position={[0, 2.35, 0]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ffd25e" emissiveIntensity={0.7} />
        </mesh>
      </>
    ),
  },
  {
    id: "chair",
    name: "Chair",
    kind: "prop",
    price: 60,
    swatch: "#c99a5b",
    render: () => (
      <>
        <mesh castShadow position={[0, 0.55, 0]}>
          <boxGeometry args={[0.7, 0.1, 0.7]} />
          <meshStandardMaterial color="#c99a5b" />
        </mesh>
        <mesh castShadow position={[0, 0.95, -0.3]}>
          <boxGeometry args={[0.7, 0.7, 0.1]} />
          <meshStandardMaterial color="#c99a5b" />
        </mesh>
        {[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([x, z], i) => (
          <mesh key={i} castShadow position={[x, 0.25, z]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
        ))}
      </>
    ),
  },
  {
    id: "mailbox",
    name: "Mailbox",
    kind: "prop",
    price: 30,
    swatch: "#4a7fd4",
    render: () => (
      <>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
          <meshStandardMaterial color="#7a5230" />
        </mesh>
        <mesh castShadow position={[0, 1.4, 0]}>
          <boxGeometry args={[0.5, 0.4, 0.9]} />
          <meshStandardMaterial color="#4a7fd4" />
        </mesh>
      </>
    ),
  },
  {
    id: "crate",
    name: "Crate",
    kind: "prop",
    price: 20,
    swatch: "#d9a066",
    render: () => (
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#d9a066" />
      </mesh>
    ),
  },
  {
    id: "flower",
    name: "Flower",
    kind: "prop",
    price: 15,
    swatch: "#d9382f",
    render: () => (
      <>
        <mesh castShadow position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
          <meshStandardMaterial color="#2f7d4f" />
        </mesh>
        <mesh castShadow position={[0, 0.78, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#d9382f" />
        </mesh>
      </>
    ),
  },
  {
    id: "tree",
    name: "Tree",
    kind: "prop",
    price: 90,
    swatch: "#2f7d4f",
    render: () => (
      <>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
          <meshStandardMaterial color="#7a5230" />
        </mesh>
        <mesh castShadow position={[0, 1.7, 0]}>
          <coneGeometry args={[1, 1.8, 8]} />
          <meshStandardMaterial color="#2f7d4f" />
        </mesh>
      </>
    ),
  },
];

export const BLOCKS = ITEMS.filter((i) => i.kind === "block");
export const PROPS = ITEMS.filter((i) => i.kind === "prop");

const byId = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id: string) => byId.get(id);
