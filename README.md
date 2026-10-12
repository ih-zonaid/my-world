# My World

A small browser 3D world: **Vite + React Three Fiber + Rapier + [ecctrl](https://github.com/pmndrs/ecctrl)** (MIT).
Drive a car (a ground with ramps, crates and trees) or step out and walk around as an adventurer kid — chase camera in the car, orbit camera on foot, keyboard + on-screen touch joystick.

## Run it

```bash
pnpm install
pnpm dev           # open the URL it prints; on your phone use the Network URL (same Wi-Fi)
pnpm build         # production build in dist/
```

Controls: **W/A/S/D or arrows** drive/walk, **Space** brake (car) or jump (kid), **Shift** run, **F** switch between car and kid, **R** reset car. On a phone: joystick (bottom-left) plus Brake/Jump button.

## Deploy (GitHub Pages)

Every push to `main` type-checks, builds, and publishes the app via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to:

**https://ih-zonaid.github.io/my-world/**

One-time setup: in the repo go to **Settings → Pages** and set **Source** to
**GitHub Actions**. After that, each push to `main` (or a manual run from the
**Actions** tab) redeploys the site.

The app is a project site, so the production build is served from the
`/my-world/` sub-path — that is the `base` set in `vite.config.ts`. Rename the
repo and you must update that value to match.

## Where to change things

| File | What it is |
|---|---|
| `src/World.tsx` | The map: ground, ramps, crates, trees, lights. Edit freely. |
| `src/Car.tsx` | Your car: input, chase camera, wheels. Swap the box for a GLB here. |
| `src/Person.tsx` | The walking kid: ecctrl character, camera, animations. |
| `src/state.ts` | Shared keyboard state + last car/kid positions (frame-level, no re-renders). |
| `src/App.tsx` | Canvas, physics, touch controls, **F** car↔kid toggle. |
| `public/models/` | Put free `.glb` models here (Kenney, Quaternius, Poly Pizza). |

The kid model is the **Mage** from [KayKit Character Pack: Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) (CC0), trimmed to 7 movement clips with `gltf-transform` to keep the file small.

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
