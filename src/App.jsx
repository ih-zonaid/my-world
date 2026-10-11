import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Joystick, VirtualButton } from "ecctrl/input";
import World from "./World.jsx";
import Car from "./Car.jsx";

export default function App() {
  // Phones/tablets get a lower pixel ratio to stay smooth.
  const dpr = [1, 1.5];
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
          <Car />
        </Physics>
      </Canvas>

      {/* Touch controls (shown on every device; handy on phones) */}
      <Joystick joystickWrapperStyle={{ left: 16, bottom: 16 }} />
      <VirtualButton
        id="brake"
        label="Brake"
        buttonWrapperStyle={{ right: 28, bottom: 40 }}
      />
    </>
  );
}
