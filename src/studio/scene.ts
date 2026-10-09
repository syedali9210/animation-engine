// Mockup studio — the 3D stage. Three layers, back to front:
//   backdrop  plain CSS: a colour, a gradient, or nothing (a transparent PNG)
//   screen    CSS3D: the live page, placed exactly where the device's screen is
//   device    WebGL: the device, its shadow and the reflections on its glass. Where the screen is, this layer is left
//             open (alpha 0), so the real page shows through, under the glass's reflections.
// The same class draws the live preview in the engine and every frame of an export.
import * as THREE from "three"
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js"
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js"
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js"
import type { DeviceId, Posture } from "../devices"
import type { Light, Slot } from "./comp"
import { PT_PER_MM, SCREEN_SPECULAR, buildDevice, disposeTree, type Built } from "./devices3d"
import type { Finish } from "./finishes"
import type { Pose } from "./poses"

const rad = THREE.MathUtils.degToRad

/** A product-photography set, for reflections: a grey room darker towards the floor, a big soft key box up front
    left, a fill opposite, a long box overhead for flat tops, tall rim strips behind and long strips either side that
    draw the bright lines down metal edges, and a gentle fill behind the camera so glass seen face-on carries a faint
    sheen. Metal is nothing but what it reflects, so this set is most of how the devices look. Values are light, not
    colour: they're rendered to HDR. */
type Rig = {
  sky: [number, string][]
  /** soft boxes: width, height, light, position */
  boxes: [number, number, number, number, number, number][]
  key: number
  exposure: number
}
const RIGS: Record<Light, Rig> = {
  studio: {
    sky: [
      [0, "#b8b8be"],
      [0.46, "#7c7c82"],
      [0.54, "#3e3e44"],
      [1, "#121214"],
    ],
    boxes: [
      [30, 22, 9, -18, 20, 26], // key
      [18, 24, 2.6, 22, 6, 24], // fill, opposite the key
      [44, 18, 6, 0, 42, 2], // overhead
      [6, 44, 9, -36, 6, -12], // rim, left
      [6, 44, 7, 36, 6, -14], // rim, right
      [5, 34, 4, -42, 2, 8], // side strip, left
      [5, 34, 4, 42, 2, 6], // side strip, right
      [48, 26, 0.9, 0, 6, 46], // fill, behind the camera
      [76, 30, 2.2, 0, 14, -46], // the sweep behind the set: what a silver deck or a flat top seen at an angle mirrors
    ],
    key: 1.1,
    exposure: 1,
  },
  // a launch film's room: nearly black, so the device is drawn by its edges; long strips for rims and a top light
  dramatic: {
    sky: [
      [0, "#2c2c31"],
      [0.46, "#111113"],
      [0.54, "#08080a"],
      [1, "#000000"],
    ],
    boxes: [
      [44, 14, 10, 0, 42, 4], // top light
      [5, 48, 18, -36, 6, -12], // rim, left
      [5, 48, 15, 36, 6, -14], // rim, right
      [4, 36, 8, -42, 2, 10], // side strip, left
      [4, 36, 7, 42, 2, 8], // side strip, right
      [16, 10, 2.4, -18, 22, 26], // a small key, for the glass
      [60, 6, 1.4, 0, 8, -46], // a thin line on the back wall
    ],
    key: 0.45,
    exposure: 1.05,
  },
  // bright and even, for white and pastel backgrounds
  soft: {
    sky: [
      [0, "#ececf0"],
      [0.46, "#cfcfd5"],
      [0.54, "#a3a3aa"],
      [1, "#5c5c62"],
    ],
    boxes: [
      [46, 32, 6, -16, 18, 28], // a wide key
      [34, 28, 4, 24, 8, 26], // a wide fill
      [52, 22, 5, 0, 42, 2], // overhead
      [8, 44, 4, -36, 6, -12], // rims
      [8, 44, 3.5, 36, 6, -14],
      [80, 34, 3, 0, 14, -46], // the sweep
    ],
    key: 0.8,
    exposure: 1,
  },
}

/** A product-photography set, for reflections: a room darker towards the floor, soft boxes, tall rim strips behind
    and long strips either side that draw the bright lines down metal edges. Metal is nothing but what it reflects, so
    this set is most of how the devices look. Values are light, not colour: they're rendered to HDR. */
function studioSet(light: Light) {
  const rig = RIGS[light]
  const set = new THREE.Scene()
  const c = document.createElement("canvas")
  c.width = 4
  c.height = 256
  const g = c.getContext("2d")!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  for (const [at, col] of rig.sky) grad.addColorStop(at, col)
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const sky = new THREE.CanvasTexture(c)
  sky.colorSpace = THREE.SRGBColorSpace
  set.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })))
  for (const [w, h, light, x, y, z] of rig.boxes) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(light), side: THREE.DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    set.add(m)
  }
  return set
}

/** A soft shadow on the floor: the device seen from below, as depth, blurred (three.js's contact-shadow technique). */
class ContactShadow {
  readonly group = new THREE.Group()
  private rt = new THREE.WebGLRenderTarget(512, 512)
  private rtBlur = new THREE.WebGLRenderTarget(512, 512)
  private plane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private blurPlane: THREE.Mesh
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private depth = new THREE.MeshDepthMaterial()
  private darkness = { value: 1.6 }
  private h = new THREE.ShaderMaterial(HorizontalBlurShader)
  private v = new THREE.ShaderMaterial(VerticalBlurShader)

  constructor() {
    this.rt.texture.generateMipmaps = false
    this.rtBlur.texture.generateMipmaps = false
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2)
    this.plane = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.rt.texture, transparent: true, depthWrite: false, opacity: 0.55 }))
    this.plane.renderOrder = 1
    this.plane.scale.y = -1
    this.blurPlane = new THREE.Mesh(geo)
    this.blurPlane.visible = false
    this.cam.rotation.x = Math.PI / 2 // looks up at the device from the floor
    this.group.add(this.plane, this.blurPlane, this.cam)
    const darkness = this.darkness
    this.depth.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = darkness
      shader.fragmentShader = "uniform float darkness;\n" + shader.fragmentShader.replace("gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );", "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );")
    }
    this.depth.depthTest = false
    this.depth.depthWrite = false
    this.h.depthTest = false
    this.v.depthTest = false
  }

  /** Lay the floor under `box` (the posed device), `lift` below its lowest point. */
  place(box: THREE.Box3, lift: number, opacity: number) {
    const size = box.getSize(new THREE.Vector3())
    const span = Math.max(size.x, size.z) * 1.7 + 400
    this.group.position.set((box.min.x + box.max.x) / 2, box.min.y - lift, (box.min.z + box.max.z) / 2)
    this.plane.scale.set(span, -span, span)
    this.blurPlane.scale.set(span, span, span)
    Object.assign(this.cam, { left: -span / 2, right: span / 2, top: span / 2, bottom: -span / 2, far: size.y + lift + 1 })
    this.cam.updateProjectionMatrix()
    // the higher it floats, the fainter and softer
    this.plane.material.opacity = opacity * (0.95 - 0.45 * Math.min(1, lift / 400))
    return 1.4 + 6 * Math.min(1, lift / 300)
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, blur: number) {
    const bg = scene.background
    scene.background = null
    this.plane.visible = false
    scene.overrideMaterial = this.depth
    const alpha = renderer.getClearAlpha()
    renderer.setClearAlpha(0)
    renderer.setRenderTarget(this.rt)
    renderer.clear()
    renderer.render(scene, this.cam)
    scene.overrideMaterial = null
    this.plane.visible = true
    this.blur(renderer, blur)
    this.blur(renderer, blur * 0.4)
    renderer.setRenderTarget(null)
    renderer.setClearAlpha(alpha)
    scene.background = bg
  }

  private blur(renderer: THREE.WebGLRenderer, amount: number) {
    this.blurPlane.visible = true
    this.blurPlane.material = this.h
    this.h.uniforms.tDiffuse.value = this.rt.texture
    this.h.uniforms.h.value = amount / 256
    renderer.setRenderTarget(this.rtBlur)
    renderer.render(this.blurPlane, this.cam)
    this.blurPlane.material = this.v
    this.v.uniforms.tDiffuse.value = this.rtBlur.texture
    this.v.uniforms.v.value = amount / 256
    renderer.setRenderTarget(this.rt)
    renderer.render(this.blurPlane, this.cam)
    this.blurPlane.visible = false
  }

  dispose() {
    this.rt.dispose()
    this.rtBlur.dispose()
    this.plane.geometry.dispose()
    this.plane.material.dispose()
    this.depth.dispose()
    this.h.dispose()
    this.v.dispose()
  }
}

/** One device in the scene, and where it stands in the group. `key` names its screen, which outlives rebuilds. */
export type Placed = { key: string; id: DeviceId; posture: Posture; landscape: boolean; finish: Finish; screenBg: string; slot: Slot }
export type Look = { shadow: boolean; reflections: number; light: Light }
/** Where the devices sit in the frame, how they come in, how far apart they're taken (0 whole, 1 in parts), and how far
    into the scene we are (seconds). */
export type Framing = { at: Slot; arrival: "none" | "drop" | "slide"; t: number; apart?: number }
/** A device part's label point, where the camera sees it: CSS px in the stage, and which way from the device it sits. */
export type PartMark = { key: string; name: string; x: number; y: number; side: -1 | 1 }

type Held = { key: string; slot: Slot; built: Built; group: THREE.Group; home: THREE.Vector3 }
type Screen = { el: HTMLDivElement; obj: CSS3DObject }

const expoOut = (x: number) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - 2 ** (-10 * x))

export class StudioScene {
  readonly el: HTMLDivElement
  private renderer: THREE.WebGLRenderer
  private css = new CSS3DRenderer()
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(26, 1, 10, 200000)
  private stage = new THREE.Group()
  private shadow = new ContactShadow()
  private key = new THREE.DirectionalLight(0xffffff, 1.1)
  private envs = new Map<Light, THREE.Texture>()
  private held: Held[] = []
  private screens = new Map<string, Screen>()
  /** the group's box in its own (unturned) space */
  private local = new THREE.Box3()
  private single = true
  private pose?: Pose
  private framing: Framing = { at: "center", arrival: "none", t: 99 }
  private look: Look = { shadow: true, reflections: 1, light: "studio" }
  private size = { w: 1, h: 1 }
  private marks: PartMark[] = []

  constructor(host: HTMLElement, { preserve = false } = {}) {
    this.el = document.createElement("div")
    this.el.style.cssText = "position:absolute;inset:0;overflow:hidden"
    host.appendChild(this.el)
    this.css.domElement.style.cssText = "position:absolute;inset:0"
    this.el.appendChild(this.css.domElement)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: preserve, powerPreference: "high-performance" })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping // Khronos' tone mapper for product renders: true colours
    this.renderer.toneMappingExposure = 1
    const canvas = this.renderer.domElement
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none"
    this.el.appendChild(canvas)
    // one key light for crisp highlights along the metal edges; the room does the rest
    this.key.position.set(-0.55, 1, 0.85)
    this.scene.add(this.key, this.stage, this.shadow.group)
    this.setLook(this.look)
  }

  private env(light: Light) {
    let tex = this.envs.get(light)
    if (!tex) {
      const pmrem = new THREE.PMREMGenerator(this.renderer)
      const set = studioSet(light)
      tex = pmrem.fromScene(set, 0.015, 0.1, 100, { size: 512 }).texture
      pmrem.dispose()
      set.traverse((n) => {
        if (n instanceof THREE.Mesh) {
          n.geometry.dispose()
          ;(n.material as THREE.MeshBasicMaterial).map?.dispose()
          ;(n.material as THREE.Material).dispose()
        }
      })
      this.envs.set(light, tex)
    }
    return tex
  }

  /** The element a device's live screen goes in. It lives in the scene for good and follows its device's screen each
      frame, instead of being parented to a device: an iframe that leaves the page reloads, and the animation shouldn't
      restart when the finish changes. Rendering once puts it in the page, so its frames start loading straight away. */
  slotOf(key: string) {
    let sc = this.screens.get(key)
    if (!sc) {
      const el = document.createElement("div")
      el.style.cssText = "position:relative;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden"
      const obj = new CSS3DObject(el)
      obj.matrixAutoUpdate = false
      obj.visible = false
      this.scene.add(obj)
      sc = { el, obj }
      this.screens.set(key, sc)
      // in the page from the start, laid out but unseen until its device is drawn (the renderer only attaches what it
      // draws), so a screen's frames load at their real size before a scene is first seen, and an export can step
      // every scene's frames from t = 0
      el.style.visibility = "hidden"
      this.css.domElement.firstElementChild?.firstElementChild?.appendChild(el)
    }
    return sc.el
  }

  /** Builds the devices and stands them as a group. Each is drawn at its real size against the primary one (they're
      modelled in their own screen points, and a point is a different length on each), so one camera sees them all
      with one perspective. Alone, a device floats at its middle; in a group they stand on one floor: the primary in
      the middle, the others either side, turned a little towards it, the smaller ones a step forward. */
  setDevices(list: Placed[]) {
    for (const h of this.held) {
      this.stage.remove(h.group)
      disposeTree(h.group)
    }
    this.held = []
    const primary = list.find((l) => l.slot === "center") ?? list[0]
    this.single = list.length <= 1
    for (const l of list) {
      const built = buildDevice(l.id, l)
      const group = new THREE.Group()
      group.add(built.root)
      if (primary) built.root.scale.setScalar(PT_PER_MM[primary.id] / PT_PER_MM[l.id])
      // turn the side devices in towards the middle, then centre each on its own middle
      if (!this.single) group.rotation.y = l.slot === "left" ? rad(16) : l.slot === "right" ? rad(-16) : 0
      group.updateMatrixWorld(true)
      built.root.position.sub(new THREE.Box3().setFromObject(built.root).getCenter(new THREE.Vector3()).applyMatrix4(group.matrixWorld.clone().invert()))
      this.held.push({ key: l.key, slot: l.slot, built, group, home: new THREE.Vector3() })
      this.stage.add(group)
      const el = this.slotOf(l.key)
      el.style.width = `${built.slot.w}px`
      el.style.height = `${built.slot.h}px`
      el.style.background = l.screenBg
      el.style.borderRadius = built.radius
    }
    // screens whose device has gone
    for (const [key, sc] of this.screens)
      if (!list.some((l) => l.key === key)) {
        this.scene.remove(sc.obj)
        sc.el.remove()
        this.screens.delete(key)
      }
    if (!this.single) {
      const box = (h: Held) => {
        h.group.updateMatrixWorld(true)
        return new THREE.Box3().setFromObject(h.group)
      }
      const sizes = new Map(this.held.map((h) => [h, box(h).getSize(new THREE.Vector3())]))
      const mid = this.held.find((h) => h.slot === "center") ?? this.held[0]
      const c = sizes.get(mid)!
      for (const h of this.held) {
        const z = sizes.get(h)!
        h.home.y = z.y / 2 // standing on the floor at y = 0
        if (h === mid) continue
        const dir = h.slot === "left" ? -1 : 1
        const gap = Math.max(c.x, z.x) * 0.07
        h.home.x = dir * (c.x / 2 + gap + z.x / 2)
        // smaller devices a step in front of the primary, bigger ones a step behind
        h.home.z = z.y < c.y ? (c.z / 2 + z.z / 2) * 0.55 : -(c.z / 2 + z.z / 2) * 0.35
      }
      // two on the same side stand one beside the other
      for (const side of ["left", "right"] as const) {
        const row = this.held.filter((h) => h !== mid && h.slot === side)
        for (let i = 1; i < row.length; i++) {
          const prev = row[i - 1]
          const dir = side === "left" ? -1 : 1
          row[i].home.x = prev.home.x + dir * (sizes.get(prev)!.x / 2 + c.x * 0.05 + sizes.get(row[i])!.x / 2)
        }
      }
    }
    for (const h of this.held) h.group.position.copy(h.home)
    // the stage turns about the group's middle
    this.local = new THREE.Box3()
    for (const h of this.held) {
      h.group.updateMatrixWorld(true)
      this.local.union(new THREE.Box3().setFromObject(h.group))
    }
    const mid = this.local.getCenter(new THREE.Vector3())
    for (const h of this.held) {
      h.home.sub(mid)
      h.group.position.copy(h.home)
    }
    this.local.translate(mid.negate())
  }

  setLook(look: Look) {
    this.look = look
    this.shadow.group.visible = look.shadow
    this.scene.environment = this.env(look.light)
    this.key.intensity = RIGS[look.light].key
    this.renderer.toneMappingExposure = RIGS[look.light].exposure
  }

  setPose(p: Pose, framing: Framing = { at: "center", arrival: "none", t: 99 }) {
    this.pose = p
    this.framing = framing
  }

  resize(w: number, h: number, dpr: number) {
    this.size = { w, h }
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.css.setSize(w, h)
  }

  /** Frame the posed group: the camera backs off until every corner of its own box, turned with it, fits in the
      frame (or in one half of it, when the devices keep to a side), then zooms. */
  private frame(p: Pose) {
    const cam = this.camera
    const side = this.framing.at === "center" ? 0 : this.framing.at === "left" ? -1 : 1
    cam.fov = p.fov
    cam.aspect = this.size.w / this.size.h
    cam.near = 1 // wide open while searching; tightened once the distance is known
    cam.far = 1e7
    cam.updateProjectionMatrix()
    this.stage.rotation.set(rad(p.pitch), rad(p.yaw), rad(p.roll), "YXZ")
    this.stage.updateMatrixWorld(true)
    const L = this.local.clone()
    // taken apart, the parts travel: the box grows by how far they go (the whole group's box, moved with each part)
    const apart = this.framing.apart ?? 0
    if (apart > 0) {
      const base = L.clone()
      for (const h of this.held) {
        const s = h.built.root.scale.x
        for (const pt of h.built.parts) {
          const v = pt.away.clone().multiplyScalar(apart * s).applyQuaternion(h.group.quaternion)
          L.expandByPoint(base.min.clone().add(v))
          L.expandByPoint(base.max.clone().add(v))
        }
      }
    }
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? L.max.x : L.min.x, i & 2 ? L.max.y : L.min.y, i & 4 ? L.max.z : L.min.z).applyMatrix4(this.stage.matrixWorld))
    const posed = new THREE.Box3().setFromPoints(corners)
    const center = L.getCenter(new THREE.Vector3()).applyMatrix4(this.stage.matrixWorld)
    const dir = new THREE.Vector3(Math.sin(rad(p.azim)) * Math.cos(rad(p.elev)), Math.sin(rad(p.elev)), Math.cos(rad(p.azim)) * Math.cos(rad(p.elev)))
    const radius = L.getSize(new THREE.Vector3()).length() / 2
    const reach = side ? 0.42 : 0.84
    const fits = (d: number) => {
      cam.position.copy(center).addScaledVector(dir, d)
      cam.lookAt(center)
      cam.updateMatrixWorld(true)
      return corners.every((c) => {
        const v = c.clone().project(cam)
        return Math.abs(v.x) <= reach && Math.abs(v.y) <= 0.84 && v.z < 1
      })
    }
    let lo = radius * 0.3
    let hi = radius * 60
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) hi = mid
      else lo = mid
    }
    const dist = hi / Math.max(0.2, p.zoom)
    cam.position.copy(center).addScaledVector(dir, dist)
    cam.lookAt(center)
    // depth precision: the glass, the screen opening and the glare sit fractions of a point apart, so the depth range
    // hugs the devices (and the floor under them) instead of running from 10 to 200,000
    cam.near = Math.max(1, dist - radius * 1.6)
    cam.far = dist + radius * 3 + 2000
    cam.updateProjectionMatrix()
    // shift the subject up or down the frame, and to one side, by moving the camera along its own axes
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion)
    const halfH = Math.tan(rad(p.fov / 2)) * cam.position.distanceTo(center)
    cam.position.addScaledVector(up, -p.rise * 2 * halfH)
    cam.position.addScaledVector(right, -(p.pan ?? 0) * 2 * halfH * cam.aspect)
    if (side) cam.position.addScaledVector(right, -side * 0.5 * halfH * cam.aspect)
    cam.updateMatrixWorld(true)
    return posed
  }

  /** Devices coming into the scene, one after another: dropping in from above, or sliding in from their side. */
  private arrive() {
    const { arrival, t } = this.framing
    const span = this.local.getSize(new THREE.Vector3())
    const order = [...this.held].sort((a, b) => (a.slot === "center" ? -1 : b.slot === "center" ? 1 : 0))
    order.forEach((h, i) => {
      const k = arrival === "none" ? 1 : expoOut((t - i * 0.18) / 1.1)
      const off = (1 - k) * (arrival === "drop" ? span.y * 1.3 : 0)
      const slide = arrival === "slide" ? (1 - k) * (h.slot === "left" ? -1 : h.slot === "right" ? 1 : 0) * span.x * 0.9 : 0
      const rise = arrival === "slide" && h.slot === "center" ? -(1 - k) * span.y * 1.2 : 0
      h.group.position.set(h.home.x + slide, h.home.y + off + rise, h.home.z)
    })
  }

  /** Where each part's label points this frame: only while the devices are taken apart. */
  partMarks() {
    return this.marks
  }

  render() {
    if (!this.held.length || !this.pose) return
    const apart = this.framing.apart ?? 0
    for (const h of this.held) for (const pt of h.built.parts) pt.obj.position.copy(pt.away).multiplyScalar(apart)
    const box = this.frame(this.pose)
    this.arrive()
    if (this.look.shadow) {
      const floats = this.single && this.held[0].built.rests !== "base"
      const blur = this.shadow.place(box, floats ? this.pose.lift : 0, 1)
      this.shadow.update(this.renderer, this.scene, blur)
    }
    this.stage.updateMatrixWorld(true)
    for (const h of this.held) {
      const sc = this.screens.get(h.key)
      if (sc) {
        sc.obj.visible = true
        sc.el.style.visibility = ""
        sc.obj.matrix.copy(h.built.anchor.matrixWorld)
        sc.obj.matrixWorldNeedsUpdate = true
      }
      // the softbox's reflection slides across the glass as the device turns against the camera
      const at = new THREE.Vector3().setFromMatrixPosition(h.built.anchor.matrixWorld)
      const q = h.built.anchor.getWorldQuaternion(new THREE.Quaternion())
      const toCam = this.camera.position.clone().sub(at).normalize()
      const sx = toCam.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(q))
      const sy = toCam.dot(new THREE.Vector3(0, 1, 0).applyQuaternion(q))
      // "reflections" turns the glass up or down; the metal keeps the room's full light
      for (const g of h.built.glare) {
        g.tex.offset.set(0.5 + 0.22 - sx * 0.9, 0.5 - 0.1 + sy * 0.9)
        g.mat.color.setScalar(this.look.reflections)
      }
      for (const m of h.built.sheen) m.specularIntensity = SCREEN_SPECULAR * this.look.reflections
    }
    this.renderer.render(this.scene, this.camera)
    this.css.render(this.scene, this.camera)
    // label points, seen through this frame's camera
    this.marks = []
    if (apart > 0.02) {
      const mid = new THREE.Vector3()
      for (const h of this.held) mid.add(new THREE.Vector3().setFromMatrixPosition(h.group.matrixWorld))
      mid.divideScalar(this.held.length).project(this.camera)
      for (const h of this.held)
        for (const pt of h.built.parts) {
          const v = pt.obj.localToWorld(pt.at.clone()).project(this.camera)
          this.marks.push({ key: `${h.key}:${pt.name}`, name: pt.name, x: ((v.x + 1) / 2) * this.size.w, y: ((1 - v.y) / 2) * this.size.h, side: v.x < mid.x ? -1 : 1 })
        }
    }
  }

  dispose() {
    for (const h of this.held) disposeTree(h.group)
    this.shadow.dispose()
    for (const t of this.envs.values()) t.dispose()
    this.renderer.dispose()
    this.el.remove()
  }
}
