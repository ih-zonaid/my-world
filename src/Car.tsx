import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider } from "@react-three/rapier";
import {
  EcctrlVehicle,
  ShapeCastWheel,
  type EcctrlVehicleHandle,
} from "ecctrl/vehicle";
import { useJoystickStore, useButtonStore } from "ecctrl/input";
import * as THREE from "three";
import { game, keys } from "./state";

const START: [number, number, number] = [0, 2, 10];
// Mass matters: the default ecctrl suspension (springK=180) is tuned for a light body.
// If you make the car heavier, raise springK/dampingC on <ShapeCastWheel> too.
const CAR_MASS = 20;

// ----------------------------------------------------------------------------
// YOUR CAR LIVES HERE.
// The body below is a simple box so the project has no download. To use a GLB:
//   const { scene } = useGLTF("/models/car.glb");  // from @react-three/drei
//   ...and render <primitive object={scene} /> instead of the box meshes.
// ----------------------------------------------------------------------------
type WheelProps = {
  position: [number, number, number];
  steer?: boolean;
  drive?: boolean;
};

function Wheel({ position, steer, drive }: WheelProps) {
  return (
    <ShapeCastWheel position={position} steerWheel={steer} driveWheel={drive} brakeWheel>
      <mesh castShadow rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.38, 0.38, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </ShapeCastWheel>
  );
}

export default function Car({ active }: { active: boolean }) {
  const vehicle = useRef<EcctrlVehicleHandle>(null);
  const camPos = useRef(new THREE.Vector3(0, 6, 22));
  const camLook = useRef(new THREE.Vector3(...START));
  const tmp = useRef({
    fwd: new THREE.Vector3(),
    target: new THREE.Vector3(),
    ideal: new THREE.Vector3(),
  });

  useEffect(() => {
    if (typeof window !== "undefined" && import.meta.env.DEV) window.__car = vehicle; // dev-only debug handle
  }, []);

  // Release inputs the moment we hand control over (e.g. to the walking kid).
  useEffect(() => {
    if (active) return;
    const v = vehicle.current;
    if (!v) return;
    v.setMovement({ forward: false, backward: false, steerLeft: false, steerRight: false, brake: false });
  }, [active]);

  useFrame((state, delta) => {
    const v = vehicle.current;
    if (!v) return;

    game.carPos.copy(v.currPos);
    if (!active) return;

    // ---- read input: keyboard + on-screen joystick ----
    const joy = useJoystickStore.getState().joysticks?.default ?? { x: 0, y: 0, active: false };
    const jx = joy.active ? joy.x : 0;
    const jy = joy.active ? joy.y : 0;
    const braking = !!keys.Space || !!useButtonStore.getState().buttons?.brake;

    v.setMovement({
      forward: !!(keys.KeyW || keys.ArrowUp) || jy > 0.25,
      backward: !!(keys.KeyS || keys.ArrowDown) || jy < -0.25,
      steerLeft: !!(keys.KeyA || keys.ArrowLeft) || jx < -0.25,
      steerRight: !!(keys.KeyD || keys.ArrowRight) || jx > 0.25,
      brake: braking,
    });

    // ---- reset car ----
    if (keys.KeyR || v.currPos.y < -20) {
      v.body.setTranslation({ x: START[0], y: START[1], z: START[2] }, true);
      v.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      v.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      v.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    // ---- chase camera ----
    const t = tmp.current;
    t.fwd.set(0, 0, 1).applyQuaternion(v.currQuat);
    t.fwd.y = 0;
    t.fwd.normalize();
    t.ideal.copy(v.currPos).addScaledVector(t.fwd, -9).add(new THREE.Vector3(0, 4.5, 0));
    camPos.current.lerp(t.ideal, 1 - Math.exp(-4 * delta));
    t.target.copy(v.currPos).add(new THREE.Vector3(0, 1, 0));
    camLook.current.lerp(t.target, 1 - Math.exp(-8 * delta));
    state.camera.position.copy(camPos.current);
    state.camera.lookAt(camLook.current);
  });

  return (
    <EcctrlVehicle ref={vehicle} position={START}>
      <CuboidCollider args={[0.9, 0.35, 2]} mass={CAR_MASS} />
      {/* body */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.7, 4]} />
        <meshStandardMaterial color="#d9382f" />
      </mesh>
      <mesh castShadow position={[0, 0.55, -0.2]}>
        <boxGeometry args={[1.5, 0.5, 2]} />
        <meshStandardMaterial color="#9fd3ff" />
      </mesh>
      {/* wheels: front (steer) and rear */}
      <Wheel position={[0.95, -0.3, 1.4]} steer drive />
      <Wheel position={[-0.95, -0.3, 1.4]} steer drive />
      <Wheel position={[0.95, -0.3, -1.4]} drive />
      <Wheel position={[-0.95, -0.3, -1.4]} drive />
    </EcctrlVehicle>
  );
}
