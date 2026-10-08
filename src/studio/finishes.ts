// Mockup studio — the devices' finishes. Plain data (no three.js), so the panel and the shot load without the 3D.
import type { DeviceId } from "../devices"

export type Finish = { id: string; name: string; metal: string; back: string; rough: number }

/** Apple's own finish names. Metal is the band (or the aluminium); back is the glass or anodising behind. */
export const FINISHES: Record<DeviceId, Finish[]> = {
  iphone: [
    { id: "black", name: "Black Titanium", metal: "#56565a", back: "#38383b", rough: 0.24 },
    { id: "natural", name: "Natural Titanium", metal: "#c9c3b9", back: "#bdb7ad", rough: 0.24 },
    { id: "white", name: "White Titanium", metal: "#e8e6e1", back: "#eeede9", rough: 0.24 },
    { id: "desert", name: "Desert Titanium", metal: "#cfb397", back: "#c8b19a", rough: 0.24 },
  ],
  duo: [
    { id: "night", name: "Night Sky", metal: "#3a4256", back: "#1b2130", rough: 0.12 },
    { id: "star", name: "Star White", metal: "#e6e1d8", back: "#e9e5de", rough: 0.12 },
  ],
  ipad: [
    { id: "black", name: "Space Black", metal: "#3e3e42", back: "#3e3e42", rough: 0.32 },
    { id: "silver", name: "Silver", metal: "#e2e3e6", back: "#e2e3e6", rough: 0.3 },
  ],
  macbook: [
    { id: "black", name: "Space Black", metal: "#3a3a3e", back: "#3a3a3e", rough: 0.32 },
    { id: "silver", name: "Silver", metal: "#e3e4e7", back: "#e3e4e7", rough: 0.3 },
  ],
}
