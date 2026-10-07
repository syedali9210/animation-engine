// Swiggy App — how a component previews on its own in a device: full width, on the background it lives on in the
// app, clear of the status bar. On a built screen with something behind it (bare), only the component shows.
import { useEffect, type CSSProperties, type ReactNode } from "react"
import { useBare } from "../_skeleton/Skeleton"

const BG = {
  hero: "bg-[linear-gradient(115deg,#3b0315,#2c0010)]",
  panel: "bg-[linear-gradient(180deg,#82012b,#4b011d_45%,#2c0011)]",
  white: "bg-white",
  grey: "bg-[#f2f2f5]",
}

export function Showcase({ on = "white", at = "center", style, children }: { on?: keyof typeof BG; at?: "center" | "bottom"; style?: CSSProperties; children: ReactNode }) {
  const bare = useBare()
  const dark = on === "hero" || on === "panel"
  // status bar and home indicator ink for this background; bare, it leaves that to whatever is behind it
  useEffect(() => {
    window.engine?.report("status", bare ? {} : { top: dark ? "light" : "dark", bottom: dark && at !== "bottom" ? "light" : "dark" })
  }, [bare, dark, at])
  return (
    <div className={`swiggy no-scrollbar absolute inset-0 flex flex-col overflow-y-auto pt-[62px] ${bare ? "" : BG[on]}`} style={style}>
      <div className={`w-full ${at === "bottom" ? "mt-auto" : "my-auto py-6"}`}>{children}</div>
    </div>
  )
}
