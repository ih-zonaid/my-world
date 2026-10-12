import * as THREE from "three";

export type Mode = "car" | "walk";

// Keyboard state — module-level so listeners never cause React re-renders.
export const keys: Record<string, boolean> = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
}

// Mutable shared positions (read/written every frame, never re-renders React).
export const game = {
  carPos: new THREE.Vector3(0, 2, 10),
  kidPos: null as THREE.Vector3 | null,
};
