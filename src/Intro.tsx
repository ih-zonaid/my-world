import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Phase } from "./state";

// The opening cinematic: a globe you spin and click, a fast dive towards the
// clicked point, then a fall from the clouds onto the plot. Earth and ground
// live at wildly different scales, so the swap between them is hidden behind a
// cloud/white wash (the #wash overlay in App) rather than one true zoom.
const GLOBE_RADIUS = 5;

// Deterministic RNG so the generated textures look the same every load.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stylised, asset-free "earth": ocean gradient, blobby continents, ice caps.
function makeEarthTexture(): THREE.Texture {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(7);

  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, "#123f8c");
  ocean.addColorStop(0.5, "#2f74c9");
  ocean.addColorStop(1, "#123f8c");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  const greens = ["#2f7d43", "#3c9350", "#4aa85c", "#276b3a"];
  const sables = ["#c8a558", "#b8944a"];
  for (let k = 0; k < 8; k++) {
    const cx = W * (0.12 + rng() * 0.76);
    const cy = H * (0.22 + rng() * 0.56);
    const rad = H * (0.1 + rng() * 0.16);
    for (let i = 0; i < 30; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * rad;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d * 0.75;
      ctx.fillStyle = rng() < 0.18 ? sables[i % 2] : greens[i % greens.length];
      ctx.beginPath();
      ctx.arc(x, y, rad * (0.3 + rng() * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#eaf4ff";
  for (let x = 0; x < W; x += 12) {
    ctx.fillRect(x, 0, 12, 24 + Math.sin(x * 0.05) * 10 + rng() * 8);
    const bot = 24 + Math.cos(x * 0.04) * 10 + rng() * 8;
    ctx.fillRect(x, H - bot, 12, bot);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Soft puff used for the clouds the camera falls through.
function makeCloudTexture(): THREE.Texture {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(21);
  for (let i = 0; i < 26; i++) {
    const x = S * (0.2 + rng() * 0.6);
    const y = S * (0.3 + rng() * 0.4);
    const r = S * (0.12 + rng() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function Globe({
  globe,
  texture,
  picked,
}: {
  globe: React.RefObject<THREE.Mesh | null>;
  texture: THREE.Texture;
  picked: THREE.Vector3 | null;
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 6, 10]} intensity={1.7} />

      <mesh ref={globe}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
      </mesh>

      {/* Faint atmosphere shell. */}
      <mesh scale={1.06}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#6fb0ff"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
        />
      </mesh>

      {picked && (
        <mesh position={picked} scale={0.16}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#ffd25e" />
        </mesh>
      )}
    </>
  );
}

function CloudField({ texture }: { texture: THREE.Texture }) {
  const clouds = useMemo(() => {
    const rng = mulberry32(99);
    return Array.from({ length: 16 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 10 + rng() * 45;
      const y = 22 + rng() * 70;
      const s = 26 + rng() * 40;
      return {
        pos: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number],
        scale: s,
        opacity: 0.45 + rng() * 0.35,
      };
    });
  }, []);

  return (
    <>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale * 0.55, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={c.opacity}
            depthWrite={false}
          />
        </sprite>
      ))}
    </>
  );
}

type IntroProps = {
  phase: Phase;
  onPick: () => void;
  onDescendDone: () => void;
  onLanded: () => void;
};

export default function Intro({ phase, onPick, onDescendDone, onLanded }: IntroProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const globe = useRef<THREE.Mesh>(null);
  const earthTex = useMemo(makeEarthTexture, []);
  const cloudTex = useMemo(makeCloudTexture, []);
  const [picked, setPicked] = useState<THREE.Vector3 | null>(null);

  const descendStart = useRef(new THREE.Vector3());
  const descendDir = useRef(new THREE.Vector3(0, 0, 1));
  const descendT = useRef(0);
  const landT = useRef(0);
  const landStart = useRef(new THREE.Vector3());
  const landEnd = useRef(new THREE.Vector3(0, 9, 27));
  const look = useRef(new THREE.Vector3(0, 3, 6));
  const done = useRef(false);

  // Pick a point on the globe. Drag-thresholded (like PlotArea) so orbiting the
  // camera doesn't count as a click.
  useEffect(() => {
    if (phase !== "globe") return;
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const s = down;
      down = null;
      if (!s || e.button !== 0) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) return;
      const mesh = globe.current;
      if (!mesh) return;
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) return;
      descendDir.current.copy(hit.point).normalize();
      setPicked(hit.point.clone());
      onPick();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [phase, camera, gl, onPick]);

  // Capture start poses as each phase begins.
  useEffect(() => {
    done.current = false;
    if (phase === "globe") {
      camera.position.set(0, 2.4, 13.5);
      camera.fov = 60;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
    } else if (phase === "descend") {
      descendStart.current.copy(camera.position);
      descendT.current = 0;
    } else if (phase === "landing") {
      landT.current = 0;
      camera.position.copy(landStart.current.set(0, 170, 62));
      camera.fov = 60;
      camera.updateProjectionMatrix();
      camera.lookAt(look.current);
    }
  }, [phase, camera]);

  useFrame((_, delta) => {
    // Clamp: a background tab throttles rAF, so the first frame back can carry a
    // huge delta that would otherwise skip the whole cinematic in one step.
    const dt = Math.min(delta, 0.05);
    if (phase === "descend") {
      descendT.current = Math.min(1, descendT.current + dt / 1.15);
      const t = easeInCubic(descendT.current);
      const end = descendDir.current
        .clone()
        .multiplyScalar(GLOBE_RADIUS * 1.06);
      camera.position.lerpVectors(descendStart.current, end, t);
      camera.lookAt(0, 0, 0);
      camera.fov = 60 + 22 * t; // slight FOV punch for a sense of speed
      camera.updateProjectionMatrix();
      if (descendT.current >= 1 && !done.current) {
        done.current = true;
        onDescendDone();
      }
    } else if (phase === "landing") {
      landT.current = Math.min(1, landT.current + dt / 2.8);
      const t = easeOutCubic(landT.current);
      camera.position.lerpVectors(landStart.current, landEnd.current, t);
      camera.lookAt(look.current);
      if (landT.current >= 1 && !done.current) {
        done.current = true;
        onLanded();
      }
    }
  });

  const showGlobe = phase === "globe" || phase === "descend";

  return (
    <>
      {showGlobe && (
        <Globe globe={globe} texture={earthTex} picked={picked} />
      )}

      {(phase === "globe" || phase === "descend") && (
        <Stars radius={120} depth={40} count={3000} factor={4} fade speed={0.6} />
      )}

      {phase === "globe" && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
        />
      )}

      {(phase === "landing" || phase === "play") && <CloudField texture={cloudTex} />}
    </>
  );
}
