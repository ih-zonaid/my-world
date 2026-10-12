import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  MAX_HEIGHT,
  PALETTE,
  PLOT_HALF,
  PLOT_SIZE,
  blockKey,
  insidePlot,
  loadBlocks,
  parseBlockKey,
  saveBlocks,
  type Blocks,
} from "./plot";

// Fixed instance capacity for this single-plot iteration (one draw call).
const MAX_BLOCKS = 8192;

function Border() {
  const thickness = 0.16;
  const height = 0.04;
  // [x, z, sizeX, sizeZ] — a square outline along the plot edges.
  const edges: [number, number, number, number][] = [
    [0, -PLOT_HALF, PLOT_SIZE, thickness],
    [0, PLOT_HALF, PLOT_SIZE, thickness],
    [-PLOT_HALF, 0, thickness, PLOT_SIZE],
    [PLOT_HALF, 0, thickness, PLOT_SIZE],
  ];
  return (
    <>
      {edges.map(([x, z, sizeX, sizeZ], i) => (
        <mesh key={i} position={[x, height / 2, z]}>
          <boxGeometry args={[sizeX, height, sizeZ]} />
          <meshBasicMaterial color="#ffd25e" />
        </mesh>
      ))}
    </>
  );
}

type PlotAreaProps = {
  selected: number;
  erasing: boolean;
  enabled: boolean;
};

export default function PlotArea({ selected, erasing, enabled }: PlotAreaProps) {
  const [blocks, setBlocks] = useState<Blocks>(() => loadBlocks());
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const instanceKeys = useRef<string[]>([]);
  const colliders = useRef(new Map<string, RapierCollider>());
  const blocksBody = useRef<RapierRigidBody | null>(null);
  const { world, rapier } = useRapier();
  const { camera, gl } = useThree();

  useEffect(() => {
    saveBlocks(blocks);
  }, [blocks]);

  // Rebuild instance transforms/colours and the instanceId -> block key map.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const keys: string[] = [];
    let i = 0;
    for (const [key, type] of blocks) {
      if (i >= MAX_BLOCKS) break;
      const [x, y, z] = parseBlockKey(key);
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(PALETTE[type]?.color ?? PALETTE[0].color));
      keys.push(key);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    instanceKeys.current = keys;
  }, [blocks]);

  // All block colliders hang off one fixed body. This matters: ecctrl only
  // accepts a ground hit when the collider has a parent rigid body
  // (`rayHitBody = collider.parent()`), so parentless colliders leave the kid
  // with isOnGround=false and zero friction — he shivers and slips off.
  useEffect(() => {
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
    blocksBody.current = body;
    return () => {
      world.removeRigidBody(body); // takes its colliders with it
      blocksBody.current = null;
      colliders.current.clear();
    };
  }, [rapier, world]);

  // Mirror the blocks into physics so the car and kid can drive/stand on them.
  useEffect(() => {
    const body = blocksBody.current;
    if (!body) return;
    const alive = colliders.current;
    for (const [key] of blocks) {
      if (alive.has(key)) continue;
      const [x, y, z] = parseBlockKey(key);
      const desc = rapier.ColliderDesc.cuboid(0.5, 0.5, 0.5)
        .setTranslation(x + 0.5, y + 0.5, z + 0.5)
        .setFriction(1); // match the world's ground and ramps
      alive.set(key, world.createCollider(desc, body));
    }
    for (const [key, collider] of alive) {
      if (!blocks.has(key)) {
        world.removeCollider(collider, false);
        alive.delete(key);
      }
    }
  }, [blocks, rapier, world]);

  // Click a face to place a block next to it, right-click a block to remove it.
  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    let down: { x: number; y: number; button: number } | null = null;

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, button: e.button };
    };

    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      // Ignore anything that was a camera orbit/pan drag rather than a click.
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      if (start.button !== 0 && start.button !== 2) return;

      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(ndc, camera);

      const mesh = meshRef.current;
      const hits = mesh ? raycaster.intersectObject(mesh, false) : [];
      const hitInstance = hits[0];

      if (mesh && hitInstance && hitInstance.instanceId !== undefined && hitInstance.face) {
        const key = instanceKeys.current[hitInstance.instanceId];
        if (key === undefined) return;
        if (erasing || e.button === 2) {
          setBlocks((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
          return;
        }
        const [bx, by, bz] = parseBlockKey(key);
        const n = hitInstance.face.normal;
        addBlock(bx + n.x, by + n.y, bz + n.z);
        return;
      }

      // Nothing but ground below the cursor: stack from y = 0.
      if (!erasing && e.button === 0 && raycaster.ray.intersectPlane(ground, hit)) {
        addBlock(Math.floor(hit.x), 0, Math.floor(hit.z));
      }
    };

    const addBlock = (x: number, y: number, z: number) => {
      if (!insidePlot(x, z) || y < 0 || y >= MAX_HEIGHT) return;
      setBlocks((prev) => {
        const key = blockKey(x, y, z);
        if (prev.has(key)) return prev;
        const next = new Map(prev);
        next.set(key, selected);
        return next;
      });
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [enabled, selected, erasing, camera, gl]);

  return (
    <>
      <Border />
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_BLOCKS]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </>
  );
}
