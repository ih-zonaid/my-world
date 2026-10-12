import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { game } from "./state";
import { itemById } from "./items";
import type { Shop, PlacedItem } from "./shop";

const ENTER_RADIUS = 3.2;
const EXIT_RADIUS = 4.4;

export type PlacingKind = "me" | "npc" | null;

type StoreProps = {
  shops: Shop[];
  items: PlacedItem[];
  placing: PlacingKind;
  onPlace: (pos: [number, number, number]) => void;
  onEnterShop: (id: string) => void;
  onExitShop: () => void;
};

// A small item model shown on a pedestal in front of the shop.
function ShowcaseItem({ id }: { id: string }) {
  const def = itemById(id);
  if (!def) return null;
  return (
    <group position={[0, 0.4, 0]} scale={0.35}>
      {def.kind === "block" ? (
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={def.swatch} />
        </mesh>
      ) : (
        def.render?.()
      )}
    </group>
  );
}

function Storefront({ shop }: { shop: Shop }) {
  const isMine = shop.owner === "me";
  const sign = isMine ? "#ffd25e" : "#8ce0ff";
  return (
    <group position={shop.pos}>
      {/* One solid collider approximating the building (open front is visual). */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.7, 1.35, 1.5]} position={[0, 1.35, 0]} />
      </RigidBody>

      <mesh receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[3.4, 0.2, 3]} />
        <meshStandardMaterial color="#8a6a45" />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.35, -1.4]}>
        <boxGeometry args={[3.4, 2.5, 0.2]} />
        <meshStandardMaterial color="#c98a52" />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.6, 1.35, 0]}>
        <boxGeometry args={[0.2, 2.5, 3]} />
        <meshStandardMaterial color="#c98a52" />
      </mesh>
      <mesh castShadow receiveShadow position={[1.6, 1.35, 0]}>
        <boxGeometry args={[0.2, 2.5, 3]} />
        <meshStandardMaterial color="#c98a52" />
      </mesh>
      <mesh castShadow position={[0, 2.7, 0]}>
        <boxGeometry args={[3.8, 0.3, 3.4]} />
        <meshStandardMaterial color="#d9382f" />
      </mesh>
      {/* Sign board — its colour tells my shop from an NPC's. */}
      <mesh position={[0, 2.3, 1.5]}>
        <boxGeometry args={[2.6, 0.6, 0.15]} />
        <meshStandardMaterial color={sign} emissive={sign} emissiveIntensity={0.35} />
      </mesh>
      {/* Counter across the open front. */}
      <mesh castShadow position={[0, 0.55, 1.15]}>
        <boxGeometry args={[2.8, 0.9, 0.4]} />
        <meshStandardMaterial color="#a9744a" />
      </mesh>

      {/* Showcase: pedestals in front of the counter. */}
      {shop.showcase.slice(0, 4).map((id, i) => (
        <group key={id} position={[(i - 1.5) * 0.9, 0, 2.15]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.3, 0.35, 0.4, 12]} />
            <meshStandardMaterial color="#3b3f46" />
          </mesh>
          <ShowcaseItem id={id} />
        </group>
      ))}
    </group>
  );
}

export default function Store({
  shops,
  items,
  placing,
  onPlace,
  onEnterShop,
  onExitShop,
}: StoreProps) {
  const { camera, gl } = useThree();
  const insideId = useRef<string | null>(null);

  // Walk near a storefront to open its sidebar; walk away (past the larger exit
  // radius) to close it. Only fires React state on the transition.
  useFrame(() => {
    const p = game.kidPos;
    if (!p) return;
    let near: string | null = null;
    let best = ENTER_RADIUS;
    for (const s of shops) {
      const d = Math.hypot(p.x - s.pos[0], p.z - s.pos[2]);
      if (d < best) {
        best = d;
        near = s.id;
      }
    }
    if (near && insideId.current !== near) {
      insideId.current = near;
      onEnterShop(near);
    } else if (!near && insideId.current) {
      const cur = shops.find((s) => s.id === insideId.current);
      if (cur && Math.hypot(p.x - cur.pos[0], p.z - cur.pos[2]) <= EXIT_RADIUS) return;
      insideId.current = null;
      onExitShop();
    }
  });

  // While placing, a click on the ground drops a storefront (anywhere).
  useEffect(() => {
    if (!placing) return;
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    let down: { x: number; y: number } | null = null;

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      if (e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(ground, hit)) {
        onPlace([Math.round(hit.x), 0, Math.round(hit.z)]);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [placing, camera, gl, onPlace]);

  return (
    <>
      {shops.map((shop) => (
        <Storefront key={shop.id} shop={shop} />
      ))}
      {items.map((item) => {
        const def = itemById(item.type);
        if (!def || def.kind !== "prop") return null;
        return (
          <group key={item.id} position={item.pos}>
            {def.render?.()}
          </group>
        );
      })}
    </>
  );
}
