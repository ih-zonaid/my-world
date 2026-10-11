# My World

A small browser 3D driving world: **Vite + React Three Fiber + Rapier + [ecctrl](https://github.com/pmndrs/ecctrl)** (MIT).
One drivable car, a ground with ramps, crates and trees, a chase camera, keyboard + on-screen touch joystick.

## Run it

```bash
npm install
npm run dev        # open the URL it prints; on your phone use the Network URL (same Wi-Fi)
npm run build      # production build in dist/
```

Controls: **W/A/S/D or arrows** drive, **Space** brake, **R** reset car. On a phone: joystick (bottom-left) and Brake button.

## Where to change things

| File | What it is |
|---|---|
| `src/World.tsx` | The map: ground, ramps, crates, trees, lights. Edit freely. |
| `src/Car.tsx` | Your car: input, chase camera, wheels. Swap the box for a GLB here. |
| `src/App.tsx` | Canvas, physics, touch controls. |
| `public/models/` | Put free `.glb` models here (Kenney, Quaternius, Poly Pizza). |

### Use a GLB model

```tsx
import { useGLTF } from "@react-three/drei";
const { scene } = useGLTF("/models/house.glb");
<RigidBody type="fixed" colliders="trimesh"><primitive object={scene} /></RigidBody>
```

For the car, render `<primitive object={scene} />` inside `<EcctrlVehicle>` instead of the box meshes, and keep the wheel positions matching your model.

## Good to know

- **Car mass:** ecctrl's default suspension is tuned for a light body, so `CAR_MASS = 20` in `Car.tsx`. A heavier car needs higher `springK` / `dampingC` on the `<ShapeCastWheel>`s, or it sinks and won't move.
- **Bundle size:** about 1.1 MB gzipped, mostly the Rapier physics engine (its WebAssembly is embedded). Fine on normal connections; later you can lazy-load the game behind a loading screen.
- **Pin versions** in `package.json` (ecctrl is young); upgrade on purpose, not by accident.
- **Mobile performance:** keep models low-poly, compress GLBs (`gltf-transform` with Draco/Meshopt, KTX2 textures), keep shadows few. Test on a real mid-range Android phone.

## Next step: multiplayer

Not included yet. Plan: a small Node **Colyseus** server; each client sends its car's position/rotation 10-15 times per second, and `OtherCars.tsx` draws one car per remote player and smooths it toward the latest position. Keep remote cars as simple moving bodies, not full physics cars.
