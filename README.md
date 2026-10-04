# Animation Engine

Every animation from your Desktop projects in one place — tune it live, watch it inside exact iPhone / iPad / MacBook frames, see what it costs each device's GPU, get Emil Kowalski–style suggestions, and export the tuned code.

```bash
npm install
npm run dev      # open the printed URL
npm run check    # suggestion-rule + GPU-math self-check
npm run build
```

## What's in it

| Category | Animations | Fetched from |
| --- | --- | --- |
| Shaders & GPU | Coins & Notes, Napkin Note, vgpu Detail Maps | `experiment animation/motiscope-output/{webgl,cloth}`, `webgl/vgpu/detail.wgsl` |
| Characters | Hello, Maze Walk | `portfolio v2/public/scripts/pet-buddy.js`, `animations/…/pet-buddy-hero` |
| Chat & AI | Chat Quiz, Thinking Cube | `portfolio v2/…/chat-quiz`, `card animation/…/thinking-cube` |
| Cards & Reveals | Info Notch Card, Scratch Card | `animations/src/animations/…` |
| Navigation | Tab Hop, Nav Scrubber | `animations/src/animations/…` |
| Celebration | Payment Success | `animation/src/components/PaymentSuccessScene.tsx` |
| UI Patterns | Bottom Sheet, Modal, Side Drawer, Toast Stack, Popover Menu | built here, on skeleton loading screens |

## The stage

- **Devices** — iPhone 16 Pro (402×874 @3x, 62pt corners, Dynamic Island), iPhone Duo, iPad Pro 11″ M4 (834×1210 @2x, landscape camera), MacBook Pro 14″ (1512×982, notch + menu bar). Each animation runs in a real iframe at the device's viewport, so CSS breakpoints behave exactly as on the device; the caption shows which Tailwind breakpoint is active. Rotate for landscape, or **Compare** to see all three at true relative size.
- **iPhone Duo** — Apple's book-style foldable, modelled in 3D. Folded it's the 5.4″ cover screen (466×678 @3x, vertical Dynamic Island top right); open it's the 7.6″ inner screen (951×669 — App Store Connect's size for the 1878×2670 panel, so a point is the same physical size on both screens); half open is the stand posture with the content pinned to the top half (669×465). Every posture rotates except the stand. Folding and unfolding swing the hinge in 3D, and the animation keeps running: its viewport changes while the hinge moves, the way iOS hands an app from one screen to the other, so you see how it reflows. `F` folds and unfolds.
- **Screen builder** — switch the stage to *Screen*, then drag animations out of the library (a live preview follows the pointer and a dashed box shows where it will land) or click one to drop it in. Move and resize them on the device, hide or reorder them in the Layers list, tune each one separately, and put an image or video behind them (drop the file on the page). Positions are fractions of the screen, so a layout survives rotation, folding and other devices. Everything on the screen runs together, and Performance shows the screen's cost plus a per-layer breakdown.
- **Reduced motion** emulates `prefers-reduced-motion` inside the frame (media queries, `matchMedia`, Motion).
- **Native DPR** makes canvases render at the device's pixel ratio, so fill-rate cost is the device's.
- **Theme** switches the engine and the animations between dark and light, live: the animation inside every device re-themes without reloading. It follows the system until you pick one.

## The app

- **Desktop / laptop** — library · stage · inspector, each column with its own header. Below 1280px the library becomes a drawer.
- **Phones** — the preview keeps most of the screen. Properties are edited one at a time in an adjust bar (control on top, a scrolling row of property chips underneath); the full list, Performance, Audit and Code open as a swipe-to-dismiss sheet from the tab bar. Landscape phones get the side-panel layout.
- **Links** — `/#bottom-sheet` opens straight to an animation.
- **Keyboard** — `/` or `Ctrl/⌘ K` search, `[` `]` previous / next, `1`–`5` devices, `F` fold, `L` rotate, `R` replay, `M` reduced motion, `T` theme, `?` all shortcuts; in the screen builder the arrow keys nudge the picked layer and `Delete` removes it. Single-key shortcuts can be turned off in that dialog.
- **Accessibility** — every text colour passes WCAG AA in both themes; tabs and segmented controls are real tablists / radio groups with arrow-key navigation; dialogs are native `<dialog>`; tooltips also show on keyboard focus; the UI respects reduced motion.

## GPU & perf

Measured in the frame: frame pacing, main-thread work per frame (script + style + layout + paint), GPU time (WebGL2 timer queries, WebGPU work-done), canvas fill and which CSS properties change every frame (compositor / repaint / layout). On localhost each device frame runs on its own site (`iphone.localhost`, …) so Chrome gives it its own process and the numbers don't bleed into each other.

The device GPU load is an **estimate**: host GPU time × (this computer's GPU class ÷ the device chip's throughput), against the device's 120Hz budget (8.3ms). The computer's class is auto-detected and can be corrected in the Performance tab.

## Adding an animation

The library is whatever is in `src/animations/` — one folder per animation, found automatically.

- **React:** `src/animations/<id>/meta.ts` (name, category, behaviour, schema), `params.ts` (the tunable values), `index.tsx` (default export takes `p`). Export rewrites `params.ts` with the tuned values.
- **Static page:** `public/anim/<id>/index.html` with `<script src="/engine-bridge.js"></script>` first in `<head>`, a `/* @engine:params */ … /* @engine:end */` block, and `window.engine?.onParams(...)` to apply live changes; plus `src/animations/<id>/meta.ts` with `html: true`. Export bakes the values into the block and drops the bridge.
