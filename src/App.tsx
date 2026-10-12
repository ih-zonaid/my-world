import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Joystick, VirtualButton } from "ecctrl/input";
import World from "./World";
import Car from "./Car";
import Person from "./Person";
import PlotArea from "./PlotArea";
import Intro from "./Intro";
import { PALETTE } from "./plot";
import type { Mode, Phase } from "./state";

export default function App() {
  const [phase, setPhase] = useState<Phase>("globe");
  const [mode, setMode] = useState<Mode>("walk");
  const [selected, setSelected] = useState(0);
  const [erasing, setErasing] = useState(false);

  // The physics world only exists once we've landed (nothing to simulate on the globe).
  const inWorld = phase === "landing" || phase === "play";
  const playing = phase === "play";

  // F toggles car <-> kid; 1-6 pick the block to place; E erases. Only while playing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || phase !== "play") return;
      if (e.code === "KeyF") setMode((m) => (m === "car" ? "walk" : "car"));
      if (e.code === "KeyE") setErasing((v) => !v);
      const slot = Number(e.key);
      if (slot >= 1 && slot <= PALETTE.length) {
        setSelected(slot - 1);
        setErasing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // Phones/tablets get a lower pixel ratio to stay smooth.
  const dpr: [number, number] = [1, 1.5];
  return (
    <>
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 60, near: 0.1, far: 400, position: [0, 2.4, 13.5] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {inWorld ? (
          <>
            <color attach="background" args={["#9ad1f5"]} />
            <fog attach="fog" args={["#9ad1f5", 40, 160]} />
          </>
        ) : (
          <color attach="background" args={["#05060d"]} />
        )}

        <Intro
          phase={phase}
          onPick={() => setPhase("descend")}
          onDescendDone={() => setPhase("landing")}
          onLanded={() => setPhase("play")}
        />

        {inWorld && (
          <Physics gravity={[0, -9.81, 0]}>
            <World />
            <PlotArea selected={selected} erasing={erasing} enabled={playing && mode === "walk"} />
            <Car active={playing && mode === "car"} />
            {playing && mode === "walk" && <Person />}
          </Physics>
        )}
      </Canvas>

      {/* Cloud/white wash that hides the globe -> ground scene swap. */}
      <div id="wash" className={phase === "descend" ? "descend" : ""} />

      {phase === "globe" && (
        <div id="enter">Click a spot on the globe to enter your world</div>
      )}

      {playing && (
        <>
          <div id="hint">
            {mode === "car"
              ? "W/A/S/D drive · Space = brake · F = get out · R = reset car · touch: joystick"
              : "W/A/S/D walk · Space = jump · Shift = run · click = place · E = erase · 1-6 = block · F = drive"}
          </div>

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

          {mode === "walk" && (
            <div id="hotbar">
              {PALETTE.map((block, i) => (
                <button
                  key={block.name}
                  type="button"
                  className={!erasing && i === selected ? "active" : ""}
                  onClick={() => {
                    setSelected(i);
                    setErasing(false);
                  }}
                  title={block.name}
                >
                  <span className="dot" style={{ background: block.color }} />
                  <span className="num">{i + 1}</span>
                </button>
              ))}
              <button
                type="button"
                className={erasing ? "active" : ""}
                onClick={() => setErasing(true)}
                title="Erase"
              >
                <span className="dot erase" />
                <span className="num">E</span>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
