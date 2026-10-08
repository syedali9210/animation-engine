// Mockup studio — the four devices as real 3D objects, built from Apple's published dimensions.
// Units are the device's own points (1 unit = 1 CSS px of its screen), so the live screen lands on the glass 1:1:
//   iPhone 16 Pro  71.5 × 149.6 × 8.25 mm, 6.04 pt/mm      iPad Pro 11″ (M4)  177.5 × 249.7 × 5.3 mm, 5.20 pt/mm
//   MacBook Pro 14″  312.6 × 221.2 × 15.5 mm, 5 pt/mm     iPhone Duo  the frame's own model (DUO in ../devices)
// Every device faces +z with its screen; the screen itself is a hole the WebGL layer leaves open, so the live page
// underneath shows through, under the glass's reflections.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { DUO, LAPTOP, PHONE_BUTTONS, TABLET_BUTTONS, type DeviceId, type Posture } from "../devices"
import type { Finish } from "./finishes"

export type Built = {
  /** the whole device; the scene poses it */
  root: THREE.Group
  /** where the live screen goes: its centre on the glass, x right and y up in the screen's own orientation */
  anchor: THREE.Object3D
  /** the live screen's size in CSS px (landscape already swapped) */
  slot: { w: number; h: number }
  /** CSS border-radius for the screen, only where a thin bezel can't hide its square corners (uniform radii only:
      Chrome clips mixed ones through a mask layer that smears under 3D transforms) */
  radius: string
  /** a laid-flat device (the Mac) rests on its base; the rest stand on an edge */
  rests: "base" | "edge"
  /** the studio glare on each screen: the scene slides it across the glass as the device turns */
  glare: Glare[]
  sheen: THREE.MeshPhysicalMaterial[]
}
export type Glare = { mat: THREE.MeshBasicMaterial; tex: THREE.Texture }

/* ---------------- geometry ---------------- */

type Radii = number | [number, number, number, number] // top-left, top-right, bottom-right, bottom-left

/** A rounded rectangle centred on the origin. */
export function roundRect(w: number, h: number, r: Radii) {
  const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r
  const x = -w / 2
  const y = -h / 2
  const s = new THREE.Shape()
  s.moveTo(x + bl, y)
  s.lineTo(x + w - br, y)
  if (br > 0) s.absarc(x + w - br, y + br, br, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - tr)
  if (tr > 0) s.absarc(x + w - tr, y + h - tr, tr, 0, Math.PI / 2, false)
  s.lineTo(x + tl, y + h)
  if (tl > 0) s.absarc(x + tl, y + h - tl, tl, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + bl)
  if (bl > 0) s.absarc(x + bl, y + bl, bl, Math.PI, Math.PI * 1.5, false)
  return s
}

/** A W×H×D slab centred on the origin, faces on ±z, corners rounded by R in its plane and front/back edges by e. */
function slab(W: number, H: number, D: number, R: Radii, e: number, curve = 28) {
  const inner: Radii = typeof R === "number" ? Math.max(0.01, R - e) : (R.map((x) => Math.max(0.01, x - e)) as Radii)
  const g = new THREE.ExtrudeGeometry(roundRect(W - 2 * e, H - 2 * e, inner), {
    depth: D - 2 * e,
    bevelEnabled: true,
    bevelThickness: e,
    bevelSize: e,
    bevelSegments: 8,
    curveSegments: curve,
  })
  g.translate(0, 0, -(D - 2 * e) / 2)
  return g
}

const flat = (w: number, h: number, r: Radii) => new THREE.ShapeGeometry(roundRect(w, h, r), 32)

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  parent.add(m)
  return m
}

/* ---------------- materials ---------------- */

/** The screen opening: writes "nothing here" (alpha 0) so the live page behind the canvas shows through. */
const hole = () => new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, ...bias(2) })

/** Layers lying on the glass (the screen opening, its reflections, the island) win the depth test against it, however
    far the camera is. */
const bias = (n: number) => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 2 })

/** Light added on top of what's under it (the live page, or the black bezel) without covering it: colour adds,
    alpha stays as it was. */
const additive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
} as const

/** A studio softbox caught in the glass: a wide soft band, drawn as light on black (it's added, not blended). */
let band: THREE.CanvasTexture | null = null
function glareTexture() {
  if (band) return band
  const c = document.createElement("canvas")
  c.width = c.height = 256
  const g = c.getContext("2d")!
  g.fillStyle = "#000"
  g.fillRect(0, 0, 256, 256)
  const d = g.createLinearGradient(0, 0, 256, 256)
  d.addColorStop(0, "rgb(6,6,6)")
  d.addColorStop(0.32, "rgb(2,2,2)")
  d.addColorStop(0.45, "rgb(12,12,12)")
  d.addColorStop(0.5, "rgb(16,16,16)")
  d.addColorStop(0.56, "rgb(8,8,8)")
  d.addColorStop(0.7, "rgb(0,0,0)")
  g.fillStyle = d
  g.fillRect(0, 0, 256, 256)
  band = new THREE.CanvasTexture(c)
  band.colorSpace = THREE.SRGBColorSpace
  return band
}

/** Reflections on the glass over the screen: added on top of the live page without covering it. */
/** Screens carry an anti-reflective coating: about a quarter of bare glass's 4%. */
export const SCREEN_SPECULAR = 0.28
export const sheenMaterial = () => new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.05, ior: 1.52, specularIntensity: SCREEN_SPECULAR, ...additive, ...bias(3) })

function materials(f: Finish) {
  const aluminium = f.back === f.metal
  return {
    metal: new THREE.MeshPhysicalMaterial({ color: f.metal, metalness: 1, roughness: f.rough }),
    // textured matte glass on the back, anodised aluminium where there's no glass
    back: aluminium
      ? new THREE.MeshPhysicalMaterial({ color: f.back, metalness: 1, roughness: f.rough })
      : new THREE.MeshPhysicalMaterial({ color: f.back, metalness: 0, roughness: 0.48, specularIntensity: 0.7, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    // the camera plateau: the same glass, polished
    gloss: new THREE.MeshPhysicalMaterial({ color: f.back, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    // camera bezels: polished metal in the band's colour
    ring: new THREE.MeshPhysicalMaterial({ color: f.metal, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
    flash: new THREE.MeshPhysicalMaterial({ color: 0xece4d2, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.08, ...bias(5) }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x030304, metalness: 0, roughness: 0.06, ior: 1.52, clearcoat: 1, clearcoatRoughness: 0.05 }),
    // the island, the notch, camera holes: black glass that doesn't catch the room
    black: new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.4, ...bias(4) }),
    // coated lens glass: near black, with the blue-violet bloom of its anti-reflective layers
    // (anti-reflective: a quarter of bare glass's reflection, or a softbox fills the whole disc and it reads as a cap)
    lens: new THREE.MeshPhysicalMaterial({ color: 0x050609, metalness: 0, roughness: 0.08, specularIntensity: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.04, iridescence: 0.22, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 600], ...bias(5) }),
    lensCore: new THREE.MeshPhysicalMaterial({ color: 0x060914, metalness: 0, roughness: 0.05, specularIntensity: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.02, iridescence: 0.3, iridescenceIOR: 1.7, iridescenceThicknessRange: [320, 640], ...bias(6) }),
    // antenna bands: the plastic breaks in the titanium, a shade apart from it
    seam: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(f.metal).multiplyScalar(0.72), metalness: 0, roughness: 0.6 }),
    hole: hole(),
    sheen: sheenMaterial(),
    glares: [] as Glare[],
  }
}
type Mats = ReturnType<typeof materials>

/** The front: black glass edge to edge, the screen opening in it, and the reflections over that opening. */
function front(parent: THREE.Object3D, m: Mats, glass: { w: number; h: number; r: Radii; y?: number } | null, screen: { w: number; h: number; r: Radii; x?: number; y?: number }, z: number) {
  if (glass) add(parent, flat(glass.w, glass.h, glass.r), m.glass, 0, glass.y ?? 0, z + 0.02)
  add(parent, flat(screen.w, screen.h, screen.r), m.hole, screen.x ?? 0, screen.y ?? 0, z + 0.08)
  add(parent, flat(screen.w, screen.h, screen.r), m.sheen, screen.x ?? 0, screen.y ?? 0, z + 0.12).renderOrder = 2
  const tex = glareTexture().clone()
  tex.repeat.set(1 / screen.w, 1 / screen.h)
  tex.offset.set(0.5, 0.5)
  tex.needsUpdate = true
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, ...additive, ...bias(4) })
  add(parent, flat(screen.w, screen.h, screen.r), mat, screen.x ?? 0, screen.y ?? 0, z + 0.2).renderOrder = 3
  m.glares.push({ mat, tex })
}

/** Side controls: a capsule standing out of the band. */
function button(parent: THREE.Object3D, mat: THREE.Material, along: "x" | "y", len: number, x: number, y: number, depth: number, out = 3) {
  const g = along === "y" ? new RoundedBoxGeometry(out * 2, len, depth, 3, Math.min(out, depth / 2) * 0.95) : new RoundedBoxGeometry(len, out * 2, depth, 3, Math.min(out, depth / 2) * 0.95)
  return add(parent, g, mat, x, y, 0)
}

/** A camera on a device's back (which faces -z), centred at (x, y) on a surface at depth z: a polished bezel ring
    standing `h` off it (a lathed profile, so its rounded lip catches the light), the coated glass a step inside the
    lip, and the lens element under the glass. */
function camera(parent: THREE.Object3D, m: Mats, x: number, y: number, z: number, r: number, h: number) {
  const lip = r * 0.82
  const profile = [
    [lip, h * 0.84],
    [lip + r * 0.03, h * 0.96],
    [r * 0.96, h],
    [r, h * 0.86],
    [r * 1.005, 0],
  ].map(([a, b]) => new THREE.Vector2(a, b))
  const bezel = add(parent, new THREE.LatheGeometry(profile, 72), m.ring, x, y, z)
  bezel.rotation.x = -Math.PI / 2 // its axis along -z, out of the back
  const glass = add(parent, new THREE.CircleGeometry(lip, 72), m.lens, x, y, z - h * 0.84)
  glass.rotation.y = Math.PI
  const core = add(parent, new THREE.CircleGeometry(lip * 0.42, 48), m.lensCore, x, y, z - h * 0.84 - 0.05)
  core.rotation.y = Math.PI
}

/** A flush round part on the back (flash, LiDAR, microphone). */
function dot(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, r: number) {
  add(parent, new THREE.CircleGeometry(r, 40), mat, x, y, z).rotation.y = Math.PI
}

/* ---------------- iPhone 16 Pro ---------------- */

const IPHONE = { W: 431.6, H: 903.1, D: 49.8, R: 76.8, e: 7, screen: { w: 402, h: 874, r: 62 } }

function iphone(m: Mats, landscape: boolean): Built {
  const { W, H, D, R, e, screen } = IPHONE
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  add(body, slab(W, H, D, R, e), m.metal)
  const cap = { w: W - 2 * e - 1, h: H - 2 * e - 1, r: R - e - 0.5 }
  front(body, m, cap, screen, D / 2)
  // Dynamic Island: 126 × 37 pt, 11 pt below the top of the screen
  add(body, flat(126, 37, 18.5), m.black, 0, screen.h / 2 - 11 - 18.5, D / 2 + 0.16)
  // back glass and the camera plateau (top right seen from the front: top left from behind)
  add(body, flat(cap.w, cap.h, cap.r), m.back, 0, 0, -D / 2 - 0.02).rotation.y = Math.PI
  const plateau = { s: 214, x: W / 2 - 13 - 107, y: H / 2 - 13 - 107, h: 7 }
  add(body, slab(plateau.s, plateau.s, plateau.h * 2, 58, 3), m.gloss, plateau.x, plateau.y, -D / 2)
  const face = -D / 2 - plateau.h
  // two cameras down the outer column, the telephoto between them on the inner one (seen from behind: left, right)
  for (const [lx, ly] of [
    [52, 52],
    [52, -52],
    [-50, 0],
  ])
    camera(body, m, plateau.x + lx, plateau.y + ly, face, 46, 9)
  dot(body, m.flash, plateau.x - 52, plateau.y + 64, face - 0.1, 12)
  dot(body, m.black, plateau.x - 52, plateau.y - 64, face - 0.1, 10)
  dot(body, m.black, plateau.x - 6, plateau.y + 84, face - 0.1, 2.6)
  // Action button, volume, side button, Camera Control (sapphire, flush)
  for (const b of PHONE_BUTTONS) {
    const x = (b.side === "left" ? -1 : 1) * (W / 2 + 0.6)
    const y = H / 2 - b.at - b.len / 2
    if (b.at === 600) button(body, m.black, "y", b.len, W / 2 - 0.4, y, 13, 2)
    else button(body, m.metal, "y", b.len, x, y, 15)
  }
  // antenna bands across the band, near each corner
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(body, new THREE.BoxGeometry(1.4, 3.2, D - 2 * e), m.seam, sx * (W / 2 - 0.2), sy * (H / 2 - 112), 0)
  const anchor = new THREE.Object3D()
  anchor.position.set(0, 0, D / 2 + 0.08)
  body.add(anchor)
  if (landscape) {
    body.rotation.z = Math.PI / 2 // the island to the left
    anchor.rotation.z = -Math.PI / 2
  }
  return { root, anchor, slot: landscape ? { w: screen.h, h: screen.w } : { w: screen.w, h: screen.h }, radius: `${screen.r}px`, rests: "edge", glare: m.glares, sheen: [m.sheen] }
}

/* ---------------- iPad Pro 11″ ---------------- */

const IPAD = { W: 922.4, H: 1297.7, D: 27.5, R: 62.2, e: 3.4, screen: { w: 834, h: 1210, r: 18 } }

function ipad(m: Mats, landscape: boolean): Built {
  const { W, H, D, R, e, screen } = IPAD
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  add(body, slab(W, H, D, R, e), m.metal)
  front(body, m, { w: W - 2 * e - 1, h: H - 2 * e - 1, r: R - e - 0.5 }, screen, D / 2)
  // the front camera, on the landscape edge (the right side in portrait)
  add(body, new THREE.CircleGeometry(4.2, 32), m.lens, W / 2 - 22, 0, D / 2 + 0.16)
  add(body, new THREE.RingGeometry(4.2, 5.4, 32), m.black, W / 2 - 22, 0, D / 2 + 0.15)
  for (const b of TABLET_BUTTONS) {
    if (b.side === "top") button(body, m.metal, "x", b.len, -W / 2 + b.at + b.len / 2, H / 2 + 0.5, 9, 2.4)
    else button(body, m.metal, "y", b.len, W / 2 + 0.5, H / 2 - b.at - b.len / 2, 9, 2.4)
  }
  // the camera bump behind, top left seen from the back: the wide camera, LiDAR under it, the flash beside
  const bump = { x: W / 2 - 30 - 56, y: H / 2 - 30 - 90 }
  add(body, slab(112, 180, 8, 40, 3), m.back, bump.x, bump.y, -D / 2 - 2)
  camera(body, m, bump.x, bump.y + 40, -D / 2 - 6, 34, 6)
  dot(body, m.black, bump.x + 6, bump.y - 44, -D / 2 - 6.1, 14)
  dot(body, m.flash, bump.x - 30, bump.y - 44, -D / 2 - 6.1, 8)
  const anchor = new THREE.Object3D()
  anchor.position.set(0, 0, D / 2 + 0.08)
  body.add(anchor)
  if (landscape) {
    body.rotation.z = Math.PI / 2
    anchor.rotation.z = -Math.PI / 2
  }
  return { root, anchor, slot: landscape ? { w: screen.h, h: screen.w } : { w: screen.w, h: screen.h }, radius: "", rests: "edge", glare: m.glares, sheen: [m.sheen] }
}

/* ---------------- MacBook Pro 14″ ---------------- */

const MAC = { W: 1563, depth: 1106, base: 54, lidH: 1045, lidT: 21, R: 40, open: 112, screen: { w: 1512, h: 950 + LAPTOP.menu }, bottom: 38 }

/** The keyboard, row by row: key widths in units (1u = 90 pt pitch, a 78 pt cap). */
const KEYS: { h: number; keys: number[] }[] = [
  { h: 0.72, keys: [1.5, ...Array(12).fill(1), 1] }, // esc, F1–F12, Touch ID
  { h: 1, keys: [...Array(13).fill(1), 1.5] }, // ` 1 … = delete
  { h: 1, keys: [1.5, ...Array(13).fill(1)] }, // tab Q … \
  { h: 1, keys: [1.8, ...Array(11).fill(1), 1.7] }, // caps A … ' return
  { h: 1, keys: [2.3, ...Array(10).fill(1), 2.2] }, // shift Z … / shift
  { h: 1, keys: [1, 1, 1, 1.25, 5, 1.25, 1, -3] }, // fn control option command space command option, arrows
]

function keyboard(m: Mats) {
  const U = 90
  const gap = 12
  const parts: THREE.BufferGeometry[] = []
  const width = 14.5 * U
  let z = 0
  for (const row of KEYS) {
    const rh = row.h * U
    let x = -width / 2
    for (const k of row.keys) {
      if (k < 0) {
        // inverted-T arrows: left, up over down, right
        const w = U - gap
        const left = new RoundedBoxGeometry(w, 6, rh - gap, 2, 2.4)
        left.translate(x + U / 2, 0, z + rh / 2)
        const right = new RoundedBoxGeometry(w, 6, rh - gap, 2, 2.4)
        right.translate(x + 2.5 * U, 0, z + rh / 2)
        const up = new RoundedBoxGeometry(w, 6, rh / 2 - gap * 0.75, 2, 2.4)
        up.translate(x + 1.5 * U, 0, z + rh / 4)
        const down = new RoundedBoxGeometry(w, 6, rh / 2 - gap * 0.75, 2, 2.4)
        down.translate(x + 1.5 * U, 0, z + (3 * rh) / 4)
        parts.push(left, up, down, right)
        x += 3 * U
        continue
      }
      const g = new RoundedBoxGeometry(k * U - gap, 6, rh - gap, 2, 2.4)
      g.translate(x + (k * U) / 2, 0, z + rh / 2)
      parts.push(g)
      x += k * U
    }
    z += rh
  }
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return { geo: merged, width, depth: z }
}

/** Speaker grilles: a field of tiny holes, as a texture. */
function grille() {
  const c = document.createElement("canvas")
  c.width = 64
  c.height = 512
  const g = c.getContext("2d")!
  g.fillStyle = "#000"
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = "#fff"
  for (let y = 4; y < c.height; y += 8)
    for (let x = 4 + ((y / 8) % 2) * 4; x < c.width; x += 8) {
      g.beginPath()
      g.arc(x, y, 1.6, 0, Math.PI * 2)
      g.fill()
    }
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  return t
}

function macbook(m: Mats): Built {
  const { W, depth, base, lidH, lidT, R, open, screen, bottom } = MAC
  const root = new THREE.Group()
  // base, lying in the xz plane: top surface at y = base, front edge towards +z
  const shell = add(root, slab(W, depth, base, R, 5), m.metal, 0, base / 2, 0)
  shell.rotation.x = -Math.PI / 2
  const top = base + 0.05
  const kb = keyboard(m)
  const kbZ = -depth / 2 + 58 // the keyboard's back edge, clear of the hinge
  // the black well the keys sit in
  const well = add(root, flat(kb.width + 28, kb.depth + 26, 14), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.85 }), 0, top, kbZ + kb.depth / 2)
  well.rotation.x = -Math.PI / 2
  add(root, kb.geo, new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.6 }), 0, top + 2.6, kbZ)
  // speaker grilles either side of the keyboard
  const holes = grille()
  for (const sx of [-1, 1]) {
    const s = add(root, flat(64, kb.depth + 4, 10), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0b, roughness: 0.9, transparent: true, alphaMap: holes, depthWrite: false }), sx * (kb.width / 2 + 62), top + 0.02, kbZ + kb.depth / 2)
    s.rotation.x = -Math.PI / 2
  }
  // the trackpad: glass in the base's own colour, a shade smoother than the blasted aluminium around it
  const pad = add(root, flat(752, 460, 26), new THREE.MeshPhysicalMaterial({ color: new THREE.Color(m.metal.color).multiplyScalar(0.97), metalness: 1, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.2 }), 0, top + 0.02, depth / 2 - 34 - 230)
  pad.rotation.x = -Math.PI / 2
  // hinge, then the lid on it
  const pivot = new THREE.Group()
  pivot.position.set(0, base - 5, -depth / 2 + 16)
  root.add(pivot)
  const hinge = add(pivot, new THREE.CylinderGeometry(13, 13, W - 2 * R - 60, 32), new THREE.MeshPhysicalMaterial({ color: 0x1b1b1d, metalness: 0.7, roughness: 0.4 }))
  hinge.rotation.z = Math.PI / 2
  const lid = new THREE.Group()
  lid.rotation.x = -((open - 90) * Math.PI) / 180
  pivot.add(lid)
  add(lid, slab(W, lidH, lidT, [R, R, 10, 10], 3.5), m.metal, 0, lidH / 2, 0)
  const sy = bottom + screen.h / 2
  front(lid, m, { w: W - 9, h: lidH - 9, r: [R - 4, R - 4, 7, 7], y: lidH / 2 }, { w: screen.w, h: screen.h, r: [10, 10, 3, 3], y: sy }, lidT / 2)
  // the notch, 190 × 32 at the top of the screen, with the camera in it
  add(lid, flat(190, LAPTOP.menu, [0.01, 0.01, 10, 10]), m.black, 0, bottom + screen.h - LAPTOP.menu / 2, lidT / 2 + 0.16)
  add(lid, new THREE.CircleGeometry(3.6, 24), m.lens, 0, bottom + screen.h - 15, lidT / 2 + 0.2)
  const anchor = new THREE.Object3D()
  anchor.position.set(0, sy, lidT / 2 + 0.08)
  lid.add(anchor)
  return { root, anchor, slot: { w: screen.w, h: screen.h }, radius: "", rests: "base", glare: m.glares, sheen: [m.sheen] }
}

/* ---------------- iPhone Duo ---------------- */

function duo(m: Mats, posture: Posture, landscape: boolean, screenBg: string): Built {
  const { pw, ph, t, gap, r: R, cover, inner, camera, fold } = DUO
  const rh = 6 // corners along the hinge
  const e = 3
  const c = t / 2 + gap / 2 // the hinge line sits between the two screens
  const theta = posture === "folded" ? Math.PI : posture === "half" ? (70 * Math.PI) / 180 : 0
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  // A: the right half, fixed
  add(body, slab(pw, ph, t, [rh, R, R, rh], e), m.metal, pw / 2, 0, 0)
  add(body, flat(pw - e - 1, ph - 2 * e - 1, [rh, R - e, R - e, rh]), m.glass, pw / 2 - e / 2, 0, t / 2 + 0.02)
  add(body, flat(pw - e - 1, ph - 2 * e - 1, [R - e, rh, rh, R - e]), m.back, pw / 2 - e / 2, 0, -t / 2 - 0.02).rotation.y = Math.PI
  // Touch ID and Camera Control on its outer edge, volume on top
  button(body, m.metal, "y", 76, pw + 0.6, ph / 2 - 140 - 38, 14, 2.6)
  button(body, m.black, "y", 52, pw - 0.2, ph / 2 - 420 - 26, 12, 2)
  button(body, m.metal, "x", 56, 250 + 28, ph / 2 + 0.6, 14, 2.6)
  button(body, m.metal, "x", 56, 318 + 28, ph / 2 + 0.6, 14, 2.6)
  // B: the left half, on the hinge
  const hinge = new THREE.Group()
  hinge.position.set(0, 0, c)
  hinge.rotation.y = theta
  body.add(hinge)
  const B = new THREE.Group()
  B.position.set(-pw / 2, 0, -c)
  hinge.add(B)
  add(B, slab(pw, ph, t, [R, rh, rh, R], e), m.metal)
  add(B, flat(pw - e - 1, ph - 2 * e - 1, [R - e, rh, rh, R - e]), m.glass, -e / 2, 0, t / 2 + 0.02)
  add(B, flat(pw - e - 1, ph - 2 * e - 1, [rh, R - e, R - e, rh]), m.glass, -e / 2, 0, -t / 2 - 0.02).rotation.y = Math.PI

  const anchor = new THREE.Object3D()
  let slot: { w: number; h: number }
  let radius = "" // open and half open, the bezel hides the corners
  if (posture === "open") {
    // the inner screen, across both halves now they're one flat sheet
    front(body, m, null, { w: inner.w, h: inner.h, r: inner.r }, t / 2)
    anchor.position.set(0, 0, t / 2 + 0.08)
    body.add(anchor)
    slot = { w: inner.w, h: inner.h }
  } else if (posture === "half") {
    // the app keeps to A's half, clear of the crease; B's half of the inner screen stays lit beside it
    const w = inner.x + inner.w - pw - fold
    const x = fold + w / 2
    front(body, m, null, { w, h: inner.h, r: [0.01, inner.r, inner.r, 0.01], x }, t / 2)
    anchor.position.set(x, 0, t / 2 + 0.08)
    body.add(anchor)
    // B's own space runs from its outer edge (-pw/2) to the hinge (+pw/2); the screen starts inner.x in
    const page = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: screenBg, emissiveIntensity: 0.9, roughness: 0.1 })
    add(B, flat(pw - inner.x, inner.h, [inner.r, 0.01, 0.01, inner.r]), page, inner.x / 2, 0, t / 2 + 0.06)
    add(B, flat(pw - inner.x, inner.h, [inner.r, 0.01, 0.01, inner.r]), m.sheen, inner.x / 2, 0, t / 2 + 0.1).renderOrder = 2
    slot = { w, h: inner.h }
  } else {
    // shut: the cover screen on B's back, which now faces out; the hinge is on its left
    const cx = cover.x + cover.w / 2 // from the hinge
    const cy = ph / 2 - (cover.y + cover.h / 2)
    const back = new THREE.Group()
    back.position.set(0, 0, -t / 2)
    back.rotation.y = Math.PI
    B.add(back)
    // in B's own space x runs away from the hinge; seen from the back it's mirrored
    const bx = (u: number) => u - pw / 2
    front(back, m, null, { w: cover.w, h: cover.h, r: cover.r, x: bx(cx), y: cy }, 0)
    add(back, new THREE.CircleGeometry(camera.d / 2, 32), m.black, bx(cover.x + camera.x), ph / 2 - (cover.y + camera.y), 0.2)
    anchor.position.set(bx(cx), cy, 0.08)
    back.add(anchor)
    slot = { w: cover.w, h: cover.h }
    radius = `${cover.r}px`
  }
  if (landscape) {
    body.rotation.z = -Math.PI / 2
    anchor.rotation.z += Math.PI / 2
    slot = { w: slot.h, h: slot.w }
  }
  return { root, anchor, slot, radius, rests: "edge", glare: m.glares, sheen: [m.sheen] }
}

/* ---------------- entry ---------------- */

/** How many of its own points make a millimetre, per device: the scale that stands them side by side at true size. */
export const PT_PER_MM: Record<DeviceId, number> = { iphone: 6.04, duo: 6.04, ipad: 5.2, macbook: 5 }

export function buildDevice(id: DeviceId, o: { posture: Posture; landscape: boolean; finish: Finish; screenBg: string }): Built {
  const m = materials(o.finish)
  if (id === "iphone") return iphone(m, o.landscape)
  if (id === "ipad") return ipad(m, o.landscape)
  if (id === "macbook") return macbook(m)
  return duo(m, o.posture, o.landscape, o.screenBg)
}

/** Free a device's GPU memory before building another. */
export function disposeTree(o: THREE.Object3D) {
  o.traverse((n) => {
    if (n instanceof THREE.Mesh) {
      n.geometry.dispose()
      for (const mat of Array.isArray(n.material) ? n.material : [n.material]) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
        mat.dispose()
      }
    }
  })
}
