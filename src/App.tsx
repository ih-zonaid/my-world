import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Joystick, VirtualButton } from "ecctrl/input";
import World from "./World";
import Car from "./Car";
import Person from "./Person";
import PlotArea from "./PlotArea";
import Store, { type PlacingKind } from "./Store";
import PropPlacer from "./PropPlacer";
import ShopUI from "./ShopUI";
import Intro from "./Intro";
import { BLOCKS, itemById } from "./items";
import { insidePlot } from "./plot";
import {
  applyRestock,
  clampInPlot,
  loadSave,
  newMyShop,
  saveSave,
  type PlacedItem,
  type Shop,
  type Stack,
} from "./shop";
import type { Mode, Phase } from "./state";

const countOf = (stacks: Stack[], id: string) => stacks.find((s) => s.id === id)?.count ?? 0;

function addItem(stacks: Stack[], id: string, n: number): Stack[] {
  const i = stacks.findIndex((s) => s.id === id);
  if (i === -1) return n > 0 ? [...stacks, { id, count: n }] : stacks;
  const count = stacks[i].count + n;
  if (count <= 0) return stacks.filter((s) => s.id !== id);
  const next = stacks.slice();
  next[i] = { id, count };
  return next;
}

// Like addItem but keeps zero-count entries, so an NPC shelf can show "sold out".
const decStack = (stacks: Stack[], id: string): Stack[] =>
  stacks.map((s) => (s.id === id ? { ...s, count: Math.max(0, s.count - 1) } : s));

export default function App() {
  const [saved] = useState(loadSave);
  const [phase, setPhase] = useState<Phase>("globe");
  const [mode, setMode] = useState<Mode>("walk");
  const [selected, setSelected] = useState(0);
  const [erasing, setErasing] = useState(false);
  const [placing, setPlacing] = useState<PlacingKind>(null);
  const [placingProp, setPlacingProp] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>(saved.shops);
  const [openShopId, setOpenShopId] = useState<string | null>(null);
  const [wallet, setWallet] = useState(saved.wallet);
  const [inventory, setInventory] = useState<Stack[]>(saved.inventory);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const nextId = useRef(0);

  // The physics world only exists once we've landed (nothing to simulate on the globe).
  const inWorld = phase === "landing" || phase === "play";
  const playing = phase === "play";
  const openShop = shops.find((s) => s.id === openShopId) ?? null;

  // F toggles car <-> kid; 1-6 pick the block; E erases; B/N place a shop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || phase !== "play") return;
      if (e.code === "KeyF") setMode((m) => (m === "car" ? "walk" : "car"));
      if (e.code === "KeyE") setErasing((v) => !v);
      if (e.code === "KeyB") {
        setPlacing((p) => (p === "me" ? null : "me"));
        setPlacingProp(null);
        setErasing(false);
      }
      const slot = Number(e.key);
      if (slot >= 1 && slot <= BLOCKS.length) {
        setSelected(slot - 1);
        setErasing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // Driving cancels placement and closes the sidebar.
  useEffect(() => {
    if (mode !== "walk") {
      setPlacing(null);
      setPlacingProp(null);
      setOpenShopId(null);
    }
  }, [mode]);

  // NPC shops slowly restock.
  useEffect(() => {
    setShops((s) => applyRestock(s));
    const t = setInterval(() => setShops((s) => applyRestock(s)), 5000);
    return () => clearInterval(t);
  }, []);

  // Persist the economy.
  useEffect(() => {
    saveSave({ wallet, inventory, shops });
  }, [wallet, inventory, shops]);

  const canPlace = useCallback((id: string) => countOf(inventory, id) > 0, [inventory]);
  const onPlaced = useCallback((id: string) => setInventory((inv) => addItem(inv, id, -1)), []);
  const onErased = useCallback((id: string) => setInventory((inv) => addItem(inv, id, 1)), []);

  const placeShop = (pos: [number, number, number]) => {
    // Your shop only fits inside the plot; keep waiting if the click lands outside.
    if (!insidePlot(pos[0], pos[2])) return;
    const spot: [number, number, number] = [clampInPlot(pos[0]), 0, clampInPlot(pos[2])];
    setShops((prev) => [...prev.filter((s) => s.owner !== "me"), newMyShop(spot)]);
    setPlacing(null);
  };

  const buy = (shopId: string, itemId: string) => {
    const def = itemById(itemId);
    const shop = shops.find((s) => s.id === shopId);
    if (!def || !shop) return;
    if (countOf(shop.stock, itemId) <= 0 || wallet < def.price) return;
    setWallet((w) => w - def.price);
    setShops((list) =>
      list.map((s) => (s.id === shopId ? { ...s, stock: decStack(s.stock, itemId) } : s))
    );
    setInventory((inv) => addItem(inv, itemId, 1));
  };

  // Arm placement for a prop, then the next world click drops it there.
  const startProp = (itemId: string) => {
    if (countOf(inventory, itemId) <= 0) return;
    setPlacingProp(itemId);
    setPlacing(null);
    setErasing(false);
  };

  const placeProp = (pos: [number, number, number]) => {
    if (!placingProp || countOf(inventory, placingProp) <= 0) return;
    const remaining = countOf(inventory, placingProp) - 1;
    setInventory((inv) => addItem(inv, placingProp, -1));
    setItems((list) => [...list, { id: nextId.current++, type: placingProp, pos }]);
    if (remaining <= 0) setPlacingProp(null);
  };

  const toggleShowcase = (shopId: string, itemId: string) => {
    setShops((list) =>
      list.map((s) => {
        if (s.id !== shopId) return s;
        const has = s.showcase.includes(itemId);
        return {
          ...s,
          showcase: has ? s.showcase.filter((x) => x !== itemId) : [...s.showcase, itemId],
        };
      })
    );
  };

  const selectBlock = (index: number) => {
    if (index < 0) return;
    setSelected(index);
    setErasing(false);
    setPlacingProp(null);
  };

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
            <PlotArea
              selected={selected}
              erasing={erasing}
              enabled={playing && mode === "walk" && !placing && !placingProp}
              canPlace={canPlace}
              onPlaced={onPlaced}
              onErased={onErased}
            />
            <PropPlacer
              itemId={placingProp}
              onPlace={placeProp}
              onCancel={() => setPlacingProp(null)}
            />
            <Store
              shops={shops}
              items={items}
              placing={placing}
              onPlace={placeShop}
              onEnterShop={(id) => setOpenShopId(id)}
              onExitShop={() => setOpenShopId(null)}
            />
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
              : placingProp
                ? `Click in your plot to place ${itemById(placingProp)?.name ?? "item"} · right-click/Esc = cancel`
                : placing
                  ? "Click inside your plot to place your shop · B = cancel"
                  : "W/A/S/D walk · Space = jump · Shift = run · click = place · E = erase · 1-6 = block · B = your shop · F = drive"}
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
              {BLOCKS.map((block, i) => {
                const count = countOf(inventory, block.id);
                return (
                  <button
                    key={block.id}
                    type="button"
                    disabled={count <= 0}
                    className={!erasing && i === selected && count > 0 ? "active" : ""}
                    onClick={() => selectBlock(i)}
                    title={`${block.name} (${count})`}
                  >
                    <span className="dot" style={{ background: block.swatch }} />
                    <span className="cnt">{count}</span>
                    <span className="num">{i + 1}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className={erasing ? "active" : ""}
                onClick={() => {
                  setErasing(true);
                  setPlacingProp(null);
                }}
                title="Erase"
              >
                <span className="dot erase" />
                <span className="num">E</span>
              </button>
              <button
                type="button"
                className={placing === "me" ? "active" : ""}
                onClick={() => {
                  setPlacing((p) => (p === "me" ? null : "me"));
                  setErasing(false);
                }}
                title="Place your shop"
              >
                <span className="dot store">$</span>
                <span className="num">B</span>
              </button>
            </div>
          )}

          {openShop && (
            <ShopUI
              shop={openShop}
              wallet={wallet}
              inventory={inventory}
              onBuy={buy}
              onClose={() => setOpenShopId(null)}
              onSelectBlock={selectBlock}
              onStartPlacing={startProp}
              onToggleShowcase={(id) => toggleShowcase(openShop.id, id)}
            />
          )}
        </>
      )}
    </>
  );
}
