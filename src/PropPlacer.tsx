import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { itemById } from "./items";
import { insidePlot } from "./plot";

type PropPlacerProps = {
  itemId: string | null;
  onPlace: (pos: [number, number, number]) => void;
  onCancel: () => void;
};

// Walk up the tree looking for the ghost marker, so the preview never blocks
// its own raycast.
function isGhost(obj: THREE.Object3D) {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData?.ghost) return true;
    o = o.parent;
  }
  return false;
}

// Free-places a prop: a translucent preview follows the cursor, a click drops it
// where you point (inside the plot only), right-click or Esc cancels.
export default function PropPlacer({ itemId, onPlace, onCancel }: PropPlacerProps) {
  const { camera, gl, scene } = useThree();
  const [target, setTarget] = useState<[number, number, number] | null>(null);
  const ghost = useRef<THREE.Group>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const valid = !!target && insidePlot(target[0], target[2]);
  const validRef = useRef(valid);
  validRef.current = valid;

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const def = itemId ? itemById(itemId) : undefined;

  // Preview follows the pointer.
  useEffect(() => {
    if (!itemId) {
      setTarget(null);
      return;
    }
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(scene.children, true).find((h) => !isGhost(h.object));
      setTarget(hit ? [hit.point.x, hit.point.y + 0.01, hit.point.z] : null);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [itemId, camera, gl, scene, ndc, raycaster]);

  // Click to place; right-click to cancel.
  useEffect(() => {
    if (!itemId) return;
    const el = gl.domElement;
    let down: { x: number; y: number; button: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, button: e.button };
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      if (start.button === 2) {
        onCancel();
        return;
      }
      if (start.button !== 0) return;
      if (!validRef.current || !targetRef.current) return;
      onPlace(targetRef.current);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [itemId, gl, onPlace, onCancel]);

  // Esc cancels.
  useEffect(() => {
    if (!itemId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemId, onCancel]);

  // Make the preview translucent and shadow-free.
  useEffect(() => {
    const g = ghost.current;
    if (!g) return;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mat = mesh.material as THREE.Material | undefined;
      if (mat) {
        mat.transparent = true;
        mat.opacity = 0.55;
        mat.depthWrite = false;
      }
    });
  }, [itemId, valid, target !== null]);

  if (!itemId || !def?.render || !valid || !target) return null;
  return (
    <group ref={ghost} userData={{ ghost: true }} position={target}>
      {def.render()}
    </group>
  );
}
