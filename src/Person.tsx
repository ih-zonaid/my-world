import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import {
  EcctrlAnimationStateController,
  useEcctrlAnimationStore,
  type EcctrlAnimationState,
} from "ecctrl/animation";
import { EcctrlCameraControls, type EcctrlCameraControlsHandle } from "ecctrl/camera";
import { useJoystickStore, useButtonStore } from "ecctrl/input";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { game, keys } from "./state";

// KayKit "Adventurers" character pack (CC0) — Mage, trimmed to the movement clips.
// https://kaylousberg.itch.io/kaykit-adventurers
const CLIPS: Record<EcctrlAnimationState, string> = {
  IDLE: "Idle",
  WALK: "Walking_A",
  RUN: "Running_A",
  JUMP_START: "Jump_Start",
  JUMP_IDLE: "Jump_Idle",
  JUMP_FALL: "Jump_Full_Long",
  JUMP_LAND: "Jump_Land",
};

// The character floats with a spring, so the collider never quite touches the
// ground. Keep that hover small, put the model's feet at the collider bottom,
// and the kid reads as standing on the ground.
const CAPSULE_HALF = 0.3;
const CAPSULE_RADIUS = 0.3;
const FLOAT_HEIGHT = 0.05;
const FEET_Y = -(CAPSULE_HALF + CAPSULE_RADIUS);
const KID_SCALE = 0.55; // ~2.7 unit model (with hat) -> ~1.5 m kid

function KidModel() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/kid.glb");
  const { actions } = useAnimations(animations, group);
  const animationState = useEcctrlAnimationStore((s) => s.animationState);

  // GLTF meshes don't cast shadows unless told to (idempotent, safe on the cached scene).
  const model = useMemo(() => {
    scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) object.castShadow = true;
    });
    return scene;
  }, [scene]);

  useEffect(() => {
    const action = actions[CLIPS[animationState]] ?? actions[CLIPS.IDLE];
    if (!action) return;
    action.reset().fadeIn(0.15).play();
    return () => {
      action.fadeOut(0.15);
    };
  }, [actions, animationState]);

  // The model's origin is at its feet, so drop it to the bottom of the capsule.
  return (
    <group ref={group} scale={KID_SCALE} position={[0, FEET_Y, 0]}>
      <primitive object={model} />
    </group>
  );
}

function FollowCamera({ ecctrl }: { ecctrl: React.RefObject<EcctrlHandle | null> }) {
  const controls = useRef<EcctrlCameraControlsHandle>(null);
  const needsInit = useRef(true);

  useFrame(() => {
    const v = ecctrl.current;
    const c = controls.current;
    if (!v || !c) return;
    const p = v.currPos;

    // The physics body appears a frame after mount; snap behind the kid once it exists.
    if (needsInit.current) {
      if (p.lengthSq() < 0.01) return;
      c.setPosition(p.x, p.y + 2.2, p.z + 5, false);
      c.setTarget(p.x, p.y + 1, p.z, false);
      needsInit.current = false;
      return;
    }
    c.moveTo(p.x, p.y + 1, p.z, true);
  });

  return <EcctrlCameraControls ref={controls} makeDefault smoothTime={0.08} />;
}

export default function Person() {
  const ecctrl = useRef<EcctrlHandle>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && import.meta.env.DEV) window.__kid = ecctrl; // dev-only debug handle
  }, []);
  // Spawn where the kid last walked, else beside the parked car.
  const spawn = useRef(
    game.kidPos
      ? game.kidPos.clone()
      : game.carPos.clone().add(new THREE.Vector3(2.2, 1, 0))
  );

  useFrame(() => {
    const v = ecctrl.current;
    if (!v) return;

    const joy = useJoystickStore.getState().joysticks?.default ?? { x: 0, y: 0, active: false };
    const jx = joy.active ? joy.x : 0;
    const jy = joy.active ? joy.y : 0;

    v.setMovement({
      forward: !!(keys.KeyW || keys.ArrowUp),
      backward: !!(keys.KeyS || keys.ArrowDown),
      leftward: !!(keys.KeyA || keys.ArrowLeft),
      rightward: !!(keys.KeyD || keys.ArrowRight),
      run: !!(keys.ShiftLeft || keys.ShiftRight) || Math.hypot(jx, jy) > 0.9,
      jump: !!keys.Space || !!useButtonStore.getState().buttons?.jump,
      // Always sent: ecctrl keeps the last joystick value when the field is omitted,
      // so leaving it out would make the kid walk forever after one stick push.
      joystick: { x: jx, y: jy },
    });

    game.kidPos ??= new THREE.Vector3();
    game.kidPos.copy(v.currPos);

    // Fell off the world: respawn at the walk spawn point.
    if (v.currPos.y < -20) {
      v.body.setTranslation({ x: spawn.current.x, y: spawn.current.y, z: spawn.current.z }, true);
      v.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      v.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  return (
    <>
      <EcctrlAnimationStateController ecctrl={ecctrl} />
      <Ecctrl
        ref={ecctrl}
        position={[spawn.current.x, spawn.current.y, spawn.current.z]}
        capsuleHalfHeight={CAPSULE_HALF}
        capsuleRadius={CAPSULE_RADIUS}
        floatHeight={FLOAT_HEIGHT}
        maxWalkVel={2.4}
        maxRunVel={4.8}
      >
        <Suspense fallback={null}>
          <KidModel />
        </Suspense>
      </Ecctrl>
      <FollowCamera ecctrl={ecctrl} />
    </>
  );
}
