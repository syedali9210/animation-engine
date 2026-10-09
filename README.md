# Animation Engine

Every animation from your Desktop projects in one place — tune it live, watch it inside exact iPhone / iPad / MacBook frames, compose it into a cinematic 3D product film or still (several devices, components beside them, titles, scenes and transitions) for a portfolio or a post, see what it costs each device's GPU, and export the tuned code.

```bash
npm install
npm run dev      # open the printed URL
npm run check    # suggestion-rule + GPU-math self-check
npm run posters  # with the dev server up: re-shoot the library cards' stills (public/thumbs)
npm run build
```

## What's in it

| Category | Animations | Fetched from |
| --- | --- | --- |
| Shaders & GPU | Coins & Notes, Napkin Note, vgpu Detail Maps | `experiment animation/motiscope-output/{webgl,cloth}`, `webgl/vgpu/detail.wgsl` |
| Characters | Hello, Maze Walk | `portfolio v2/public/scripts/pet-buddy.js`, `animations/…/pet-buddy-hero` |
| Chat & AI | Chat Quiz, Thinking Cube | `portfolio v2/…/chat-quiz`, `card animation/…/thinking-cube` |
| Cards & Reveals | Info Notch Card, Scratch Card, Scroll Dissolve Reveal | `animations/src/animations/…`; Scroll Dissolve Reveal is [VengeanceUI](https://github.com/Ashutoshx7/VengeanceUI)'s, as published |
| Navigation | Tab Hop, Nav Scrubber | `animations/src/animations/…` |
| Celebration | Payment Success | `animation/src/components/PaymentSuccessScene.tsx` |
| UI Patterns | Bottom Sheet, Modal, Side Drawer, Toast Stack, Popover Menu | built here, on skeleton loading screens |
| Swiggy App | Home Screen, and its components on their own: Section Selector, Search Bar, Category Tabs, Offer Cards, Dish Row, Restaurant Cards, 99 Store Cards, Restaurant Feed, Bottom Nav | `swiggy/src/App.tsx` (Figma Make), split into components in `src/animations/_swiggy` |

## The stage

- **Devices** — iPhone 16 Pro (402×874 @3x, 62pt corners, Dynamic Island), iPhone Duo, iPad Pro 11″ M4 (834×1210 @2x, landscape camera), MacBook Pro 14″ (1512×982, notch + menu bar). Each animation runs in a real iframe at the device's viewport, so CSS breakpoints behave exactly as on the device; the caption shows which Tailwind breakpoint is active. Rotate for landscape, or **Compare** to see all three at true relative size.
- **iPhone Duo** — Apple's book-style foldable, modelled in 3D: two 5.2 mm titanium slabs (Star White / Night Sky, mirror-polished edges) on a hinge. Folded it's the 5.4″ cover screen (466×678 @3x); open it's the 7.6″ inner screen (951×669 — App Store Connect's size for the 1878×2670 panel); half open the app keeps to the right half, away from the crease (465×669), as a book standing on its edges, or rotated, as a stand with the base on the table (669×465). Status follows iOS 27 on the Duo: one circle in the top-right corner (battery ring, signal dots, Wi-Fi in the middle) with the time under it and the punch-hole camera below. Folding follows Apple's layout, where the open screen's right half matches the cover: opening, the cover turns off, the left half swings away to reveal the app already on the right half, and the app then widens across the whole screen; closing, the app narrows onto the right half, the left half swings over it and the magnets snap it shut, and the app is on the cover in the same place. The animation never reloads — it genuinely resizes, so you see it reflow. `F` folds and unfolds.
- **Screen builder** — open *Screen builder* at the top of the library, then drag animations out of the library (a live preview follows the pointer and a dashed box shows where it will land) or press **+** on a card to drop it in. Move and resize them on the device, hide or reorder them in the Layers list, tune each one separately, and put an image or video behind them (drop the file on the page). Positions are fractions of the screen, so a layout survives rotation, folding and other devices. Everything on the screen runs together, and the performance chip shows the screen's cost plus a per-layer breakdown. A full app screen makes a real base: drop a sheet, a toast or one of the Swiggy components over the Swiggy Home Screen and the stand-in skeleton (or the component's own backdrop) steps aside.
- **Reduced motion** emulates `prefers-reduced-motion` inside the frame (media queries, `matchMedia`, Motion).
- **Native DPR** makes canvases render at the device's pixel ratio, so fill-rate cost is the device's.
- **Theme** switches the engine and the animations between dark and light, live: the animation inside every device re-themes without reloading. It follows the system until you pick one.

## Studio

Switch the stage from **Preview** to **Studio** to make a composition: scenes played one after another, each made of layers, over one background. Layers on the left, the stage and its timeline in the middle, the picked thing's settings on the right.

- **Devices, matched** — up to three devices per scene: a primary in the middle and one either side (pick them in the scene's *Devices*, or drag a device chip onto a place or onto the stage). Each stands at its real size against the primary, the side ones turned in and the smaller ones a step forward, all under one camera, so scale, distance and perspective agree. iPhone 16 Pro, iPhone Duo (folded / half open / open), iPad Pro 11″, MacBook Pro 14″, each in Apple's finishes, each screen live: whatever's open in the engine, any animation from the library, or a picture.
- **Components beside them** — add any animation as a component outside a device. With devices in the scene they move to one side and the component takes the other (*Devices sit* left, middle or right flips the layout). Drag a component, picture or title on the stage to move it; its corner resizes it.
- **Pictures and titles** — drop an image on the page (or *Add → Picture*) and it becomes a layer. Titles come in the launch films' ways:
  - a light **sweeping** across dim words;
  - words **parting** around a device (a `|` marks the split);
  - **typed** with a caret;
  - lines rising out of a **mask**;
  - **word by word**;
  - or rise, fade, blur in.

  Their faces are Text, Display (the brand's, set tight) or Label (spaced caps).
- **Component shots** — a component can be filmed tilted back and settling, on a slow dolly, in an extreme **macro** close-up gliding across one part of it (drawn at that size, so it stays sharp), floating, or orbited.
- **Breakdown** — *Add → Breakdown* takes a screen apart into its components: the header, search, tabs, cards, tab bar and so on. Each is a live plate cut from the running screen, drawn at the size it's seen, so it stays sharp. Four views:
  - **On the table:** the components lift out of the device and are laid out beside it, numbered, each leaving a dashed socket where it was.
  - **In layers:** the device lies tilted and its components float above it. Each layer carries the screen's outline at its height, and all are labelled with leader lines.
  - **Close up:** one component, large, the camera closing in on its key element (its biggest heading or main control).
  - **Assemble:** from the table back into the screen, then the device glides to the middle.

  Components come from the code: `data-component="Name"` on a wrapper names one. Without it, they're found by structure. A title can say `{part}` (the close-up's component) or `{note}` (what's in it).
- **Teardowns** — the iPhone, iPad and MacBook are also modelled in parts:
  - phones and tablets: display, logic board, battery, frame, back glass, camera system;
  - the MacBook: keyboard, trackpad, display, enclosure.

  A scene can take the hardware apart, hold it apart or assemble it, with every part labelled.
- **Callouts** — a label with a leader line to any point, like a technical drawing's.
- **Hairline** — any device screen, component or picture can be redrawn as thin ink lines, live. It's drawn from the page itself:
  - every surface becomes its own outline, filled with the ground so overlapping things hide each other;
  - text stays text, icons keep their strokes, and pictures and canvases become the edges of their brightness.

  Switched on, the page draws in back to front, layer by layer. In Preview, `H` (or the pen in the dock) does it to the animation itself.
- **Scenes** — each has a length, a camera (angle, lens, zoom; drag the stage to turn it, scroll or pinch to zoom), a move (Reveal, Spin in, Hero turn, Pull back, Orbit, Sway, Push in, Rise, Tour) and how its devices arrive (in place, drop in, slide in), plus a transition in: cut, dissolve, dip, push, zoom or blur. *+* adds the next shot with the same devices and camera.
- **Templates** — the three launch films below, each cut from one reference ad: **Typed launch**, **Glass launch** and **Prompt launch**. Picking one fills the frame with that film, with your product's screen and name. Also **App film**, built from the iPhone 17 Pro and 18 Pro films (`taste builder/kit/launch-film/apple-launch-analysis.md`), which takes the *screen* apart, not the phone: its components go out on a table, then into layers, then two close-ups, then back together.

  Plus Hero shot, Device + component, Family, Keynote reveal, Launch film and Social 9:16. Each is built from what's open, in its own words and your brand. *Undo* puts back what you had.
- **Copy writer** — reads what the component is and shows (its name, description, the text it renders, its buttons, the strings in its code) and writes the film's lines: a hook, feature lines, a split line, a tagline, a call to action. The name is the product's: the brand you set, or `brand` in the component's meta ("Swiggy"). It never invents a number, and a name on the screen isn't a feature. With `ANTHROPIC_API_KEY` set for the dev server it asks Claude (`STUDIO_COPY_MODEL` picks the model); without it, it writes them by rule. Titles show its lines to pick from.
- **Brand** — *Background → Use your design system*: drop its CSS (custom properties, shadcn's HSL, Tailwind v4's `@theme`), a Tailwind config, a theme file, a tokens JSON, a page's HTML or a screenshot. The engine reads:
  - its ground, surface, ink, muted colour, accent and the colour on the accent;
  - its text, display and mono fonts (loaded from Google Fonts when they're there).

  You check and adjust them, with a contrast warning, and the film uses them.
- **Background director** — with *Director* on, each scene's background is chosen from what's in it:
  - a dark room for a reveal or a line-up;
  - paper or the brand's light for a feature;
  - a pale table for components laid out, a dark room for their layers, the brand's light for a close-up;
  - a technical drawing for a hardware teardown;
  - the brand's colour for the end card.

  Neighbouring scenes alternate dark and light, and one ground blends into the next across the cut. Set a scene's background by hand and the director learns it for scenes like that one. Any scene can keep its own.
- **Background** — studio sweeps, colour fields, transparent, or any colour (the eyedropper picks one off the screen in Chrome and Edge; swatches drag onto the stage), plus one effect over it: glow, dots, grid, lines, grain, dither or a drawing sheet (ruled border, zone references, title block), with its amount and colour. Light: Studio, Keynote (a dark room, bright rims) or Soft.
- **Layers** — scenes and their layers front first; the dot marks what's animated, the eye hides a layer, drag (or `Alt ↑↓`) reorders, ⋯ duplicates, moves or deletes; `Delete` removes the picked layer.

**Export** renders the composition in headless Chrome on the dev server: an image of the picked scene (settled, camera as set; a transparent background gives alpha), or a video of every scene stepped frame by frame so nothing drops (H.264 MP4, or ProRes 4444 with alpha over a transparent background) at 16:9 (1080p or 4K), 4:3, 1:1, 4:5 or 9:16, 30 or 60 fps. Needs Chrome or Edge, and ffmpeg for video (`STUDIO_CHROME` / `STUDIO_FFMPEG` point at them if they aren't found). Pictures are kept by the dev server, so they survive a reload.

## Launch films

The *Launch films* category holds whole films, each a deterministic timeline: every frame is a function of one clock, so an export renders it exactly. Each one is cut shot by shot from a real launch ad, with the product's live screens running inside it and the words as params. The copy writer fills the words; edit them in the inspector.

- **Typed launch** (42 s, after the Numtera ad):
  - a hook that types and then edits itself, among live fragments of your product;
  - a huge word, then "Meet [icon] Name" on your accent;
  - the product tilted under a dolly;
  - a split screen whose checklist ticks;
  - a keyword in `{braces}` that becomes a progress bar;
  - a dark interlude, a macro across the live screen, they / we;
  - a typed CTA.
- **Glass launch** (34 s, after the LangEase ad):
  - single words blurring in, then a word, your icon dropping in, and a word;
  - a tunnel of live phones, then a progress bar;
  - a glass orb with its check and confetti;
  - a tap, then a black button that turns into your accent;
  - a spark into a three-word line, then the end card.
- **Prompt launch** (31 s, after the Claude Design ad, on warm paper):
  - a pill clicked open into a prompt that types, then italic status words;
  - the result pulling back into its window;
  - macro clicks on the toolbar and a comment;
  - the plan ticking off, then the screen changing before your eyes;
  - a collage.
- **provider-guard Launch** (46 s): a film for one real product, built from its own UI code (the Studio's stylesheet and markup) and the numbers published in vercel/ai#20932.

To make one: pick the film in Studio → *Templates*. It fills the frame at 16:9 and its scene runs for the film's length. *Export → Video* renders it. The films share `src/animations/_film/` (the clock, the stage, the easing, typed text, a cursor, live screens, phones, confetti). A new film is a new folder that draws `render(t)` with that kit.

## The app

- **Desktop / laptop / tablet landscape** — library · stage · inspector. The library is a grid of cards with a still of each animation (hover one to play it live) and category chips; the stage has a floating dock for device, rotation, reduced motion, replay and the frame rate; the inspector shows only the properties. Performance and checks open from the frame-rate chip, code export (and the way to the studio) from **Export**. Below 1120px wide the library becomes a drawer you open from the title. In the studio the left column is the layers, and the library is a drawer at every size.
- **Tablets held upright** — the stage gets the full width; a sheet under it (its handle collapses it for a bigger preview) switches between the properties, in two columns, and the library. In the studio it holds the layers and the picked thing's settings side by side. Controls grow to finger size on touch screens.
- **Phones** — one top bar (the title opens the library, Preview / Studio, ⋯), device controls in a pill over the stage, and one property at a time in a 44pt row with a scrolling row of chips under it; the handle (tap or swipe it up) or *All* opens every property in a swipe-to-dismiss sheet. In the studio four labelled buttons under the stage open Layers, Edit, Background and Export as sheets. Landscape phones get the side-panel layout.
- **Sliders** — the whole field is the slider: drag anywhere on it, click the number (or just type) to enter a value, arrow keys step it (Shift for ×10), double-click or Backspace resets it.
- **Links** — `/#bottom-sheet` opens straight to an animation.
- **Keyboard** — `/` or `Ctrl/⌘ K` search, `[` `]` previous / next, `1`–`5` devices, `P` preview / studio, `F` fold, `L` rotate, `R` replay, `M` reduced motion, `H` hairline, `T` theme, `?` all shortcuts; in the screen builder the arrow keys nudge the picked layer and `Delete` removes it. Single-key shortcuts can be turned off in that dialog.
- **Accessibility** — every text colour passes WCAG AA in both themes; segmented controls are real radio groups with arrow-key navigation; dialogs are native `<dialog>` and menus native popovers (Escape and click-away close them); tooltips also show on keyboard focus; the UI respects reduced motion.

## GPU & perf

Measured in the frame: frame pacing, main-thread work per frame (script + style + layout + paint), GPU time (WebGL2 timer queries, WebGPU work-done), canvas fill and which CSS properties change every frame (compositor / repaint / layout). On localhost each device frame runs on its own site (`iphone.localhost`, …) so Chrome gives it its own process and the numbers don't bleed into each other.

The device GPU load is an **estimate**: host GPU time × (this computer's GPU class ÷ the device chip's throughput), against the device's 120Hz budget (8.3ms). The computer's class is auto-detected and can be corrected from the frame-rate chip.

## Adding an animation

The library is whatever is in `src/animations/` — one folder per animation, found automatically. Run `npm run posters <id>` for its card still; `poster: { at, y }` in its meta picks the moment and where the 4:3 crop sits on the screen.

- **React:** `src/animations/<id>/meta.ts` (name, category, behaviour, schema), `params.ts` (the tunable values), `index.tsx` (default export takes `p`). Export rewrites `params.ts` with the tuned values.
- **App screens** (a whole screen): `layout: "fill"`, scroll your own container rather than the window, and leave the top 62px and bottom 34px for the device's status bar and home indicator. Call `window.engine?.report("status", { top: "light" | "dark", bottom: "light" | "dark" })` whenever what's under them changes, and the device draws light or dark system ink to match (as `UIStatusBarStyle` does on iOS).
- **An app's components** (the Swiggy App group is the model): shared components in an underscore folder (`_swiggy/`, not a library item), each one also given its own library folder that previews it in context (`Showcase`) and `includes` the shared folder for export. Motion tokens are CSS variables on the screen's root (`--sw-slide`, `--sw-press`…), so one screen tunes every component inside it. Size things from the screen width (no fixed design-width pixels): rows that don't fit scroll with a deliberate peek, and turn into grids from 768px.
- **Static page:** `public/anim/<id>/index.html` with `<script src="/engine-bridge.js"></script>` first in `<head>`, a `/* @engine:params */ … /* @engine:end */` block, and `window.engine?.onParams(...)` to apply live changes; plus `src/animations/<id>/meta.ts` with `html: true`. Export bakes the values into the block and drops the bridge.
