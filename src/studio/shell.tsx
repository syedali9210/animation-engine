// Mockup studio — the live screen as the device shows it: the app, with the OS's own chrome over it (status bar and
// home indicator, or the Mac's menu bar above it). The studio and the export render page both draw it.
import type { ReactNode } from "react"
import { LAPTOP, MenuBar, ScreenChrome, viewport, type Device, type Posture, type ScreenInk } from "../devices"

const DUO_SCREEN = { folded: "cover", half: "half", open: "full" } as const

export function ScreenShell({ d, landscape, posture, dark, ink, bg, children }: { d: Device; landscape: boolean; posture: Posture; dark: boolean; ink?: ScreenInk; bg: string; children: ReactNode }) {
  const v = viewport(d, landscape, posture)
  if (d.id === "macbook")
    return (
      <div style={{ width: v.w, height: v.h + LAPTOP.menu, background: bg }}>
        <MenuBar dark={dark} />
        <div className="relative overflow-hidden" style={{ width: v.w, height: v.h }}>
          {children}
        </div>
      </div>
    )
  return (
    <div className="relative overflow-hidden" style={{ width: v.w, height: v.h, background: bg }}>
      {children}
      <ScreenChrome d={d} v={v} landscape={landscape && d.rotates} dark={dark} ink={ink} duo={d.fold ? DUO_SCREEN[posture] : undefined} />
    </div>
  )
}
