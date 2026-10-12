import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Joystick, VirtualButton } from "ecctrl/input";
import World from "./World";
import Car from "./Car";
import Person from "./Person";
import type { Mode } from "./state";

export default function App() {
  const [mode, setMode] = useState<Mode>("car");

  // F toggles between driving the car and walking as the kid.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && !e.repeat) setMode((m) => (m === "car" ? "walk" : "car"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Phones/tablets get a lower pixel ratio to stay smooth.
  const dpr: [number, number] = [1, 1.5];
  return (
    <>
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 60, near: 0.1, far: 400, position: [0, 6, 14] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#9ad1f5"]} />
        <fog attach="fog" args={["#9ad1f5", 40, 160]} />
        <Physics gravity={[0, -9.81, 0]}>
          <World />
          <Car active={mode === "car"} />
          {mode === "walk" && <Person />}
        </Physics>
      </Canvas>

      {/* Touch controls (shown on every device; handy on phones) */}
      <Joystick joystickWrapperStyle={{ left: 16, bottom: 16 }} />
      {mode === "car" ? (
        <VirtualButton
          id="brake"
          label="Brake"
          buttonWrapperStyle={{ right: 28, bottom: 40 }}
        />
      ) : (
        <VirtualButton
          id="jump"
          label="Jump"
          buttonWrapperStyle={{ right: 28, bottom: 40 }}
        />
      )}
    </>
  );
}
