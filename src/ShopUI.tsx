import { useState } from "react";
import { BLOCKS, itemById } from "./items";
import type { Shop, Stack } from "./shop";

type ShopUIProps = {
  shop: Shop;
  wallet: number;
  inventory: Stack[];
  onBuy: (shopId: string, itemId: string) => void;
  onClose: () => void;
  onSelectBlock: (index: number) => void;
  onSpawnProp: (itemId: string) => void;
  onToggleShowcase: (itemId: string) => void;
};

export default function ShopUI({
  shop,
  wallet,
  inventory,
  onBuy,
  onClose,
  onSelectBlock,
  onSpawnProp,
  onToggleShowcase,
}: ShopUIProps) {
  const [tab, setTab] = useState<"items" | "showcase">("items");
  const isMine = shop.owner === "me";

  return (
    <div id="shop">
      <div id="shop-head">
        <span>{isMine ? "My Shop" : "Shop"}</span>
        <button type="button" onClick={onClose} title="Close">
          ×
        </button>
      </div>
      <div id="shop-wallet">{wallet} coins</div>

      {isMine ? (
        <>
          <div id="shop-tabs">
            <button
              type="button"
              className={tab === "items" ? "active" : ""}
              onClick={() => setTab("items")}
            >
              Items
            </button>
            <button
              type="button"
              className={tab === "showcase" ? "active" : ""}
              onClick={() => setTab("showcase")}
            >
              Showcase
            </button>
          </div>

          {inventory.length === 0 ? (
            <div className="shop-note">No items yet — buy some from a shop.</div>
          ) : (
            <div id="shop-grid">
              {inventory.map(({ id, count }) => {
                const def = itemById(id);
                if (!def) return null;
                const onShowcase = shop.showcase.includes(id);
                const label =
                  tab === "showcase"
                    ? onShowcase
                      ? "Remove from showcase"
                      : "Put on showcase"
                    : def.kind === "block"
                      ? "Select block"
                      : "Place in world";
                return (
                  <button
                    key={id}
                    type="button"
                    className={`slot${tab === "showcase" && onShowcase ? " on" : ""}`}
                    title={label}
                    onClick={() =>
                      tab === "showcase"
                        ? onToggleShowcase(id)
                        : def.kind === "block"
                          ? onSelectBlock(BLOCKS.findIndex((b) => b.id === id))
                          : onSpawnProp(id)
                    }
                  >
                    <span className="swatch" style={{ background: def.swatch }} />
                    <span className="count">{count}</span>
                    <span className="label">{def.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="shop-note">
            {tab === "items"
              ? "Click a block to equip it, or a prop to place it."
              : "Click an item to toggle it on the display."}
          </div>
        </>
      ) : (
        <div id="shop-list">
          {shop.stock.map(({ id, count }) => {
            const def = itemById(id);
            if (!def) return null;
            return (
              <button
                key={id}
                type="button"
                className="shop-item"
                disabled={count <= 0 || wallet < def.price}
                onClick={() => onBuy(shop.id, id)}
              >
                <span className="swatch" style={{ background: def.swatch }} />
                <span className="name">{def.name}</span>
                <span className="stock">{count > 0 ? count : "—"}</span>
                <span className="price">{def.price}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
