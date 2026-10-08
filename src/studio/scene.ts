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
import { SCREEN_SPECULAR, buildDevice, disposeTree, type Built } from "./devices3d"
import type { Finish } from "./finishes"
import type { Pose } from "./poses"

const rad = THREE.MathUtils.degToRad

/** A product-photography set, for reflections: a grey room darker towards the floor, a big soft key box up front
    left, a fill opposite, a long box overhead for flat tops, tall rim strips behind and long strips either side that
    draw the bright lines down metal edges, and a gentle fill behind the camera so glass seen face-on carries a faint
    sheen. Metal is nothing but what it reflects, so this set is most of how the devices look. Values are light, not
    colour: they're rendered to HDR. */
function studioSet() {
  const set = new THREE.Scene()
  const c = document.createElement("canvas")
  c.width = 4
  c.height = 256
  const g = c.getContext("2d")!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, "#b8b8be")
  grad.addColorStop(0.46, "#7c7c82")
  grad.addColorStop(0.54, "#3e3e44")
  grad.addColorStop(1, "#121214")
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const sky = new THREE.CanvasTexture(c)
  sky.colorSpace = THREE.SRGBColorSpace
  set.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })))
  const box = (w: number, h: number, light: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(light), side: THREE.DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    set.add(m)
  }
  box(30, 22, 9, -18, 20, 26) // key
  box(18, 24, 2.6, 22, 6, 24) // fill, opposite the key
  box(44, 18, 6, 0, 42, 2) // overhead
  box(6, 44, 9, -36, 6, -12) // rim, left
  box(6, 44, 7, 36, 6, -14) // rim, right
  box(5, 34, 4, -42, 2, 8) // side strip, left
  box(5, 34, 4, 42, 2, 6) // side strip, right
  box(48, 26, 0.9, 0, 6, 46) // fill, behind the camera
  box(76, 30, 2.2, 0, 14, -46) // the sweep behind the set: what a silver deck or a flat top seen at an angle mirrors
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

export type DeviceSpec = { id: DeviceId; posture: Posture; landscape: boolean; finish: Finish; screenBg: string }
export type Look = { shadow: boolean; reflections: number }

export class StudioScene {
  readonly el: HTMLDivElement
  /** the live screen goes in here; it's laid over the device's screen in 3D */
  readonly slot: HTMLDivElement
  private renderer: THREE.WebGLRenderer
  private css = new CSS3DRenderer()
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(26, 1, 10, 200000)
  private stage = new THREE.Group()
  private shadow = new ContactShadow()
  private screenObj: CSS3DObject
  private device?: Built
  /** the device's box in its own (unturned) space */
  private local = new THREE.Box3()
  private pose?: Pose
  private look: Look = { shadow: true, reflections: 1 }
  private size = { w: 1, h: 1 }

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

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const set = studioSet()
    this.scene.environment = pmrem.fromScene(set, 0.015, 0.1, 100, { size: 512 }).texture
    pmrem.dispose()
    set.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.geometry.dispose()
        ;(n.material as THREE.MeshBasicMaterial).map?.dispose()
        ;(n.material as THREE.Material).dispose()
      }
    })
    // one key light for crisp highlights along the metal edges; the room does the rest
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(-0.55, 1, 0.85)
    this.scene.add(key, this.stage, this.shadow.group)

    this.slot = document.createElement("div")
    this.slot.style.cssText = "position:relative;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden"
    // The screen lives in the scene for good and follows the device's screen each frame, instead of being parented to
    // a device: an iframe that leaves the page reloads, and the animation shouldn't restart when the finish changes.
    // Rendering once now puts it in the page, so its frames start loading straight away.
    this.screenObj = new CSS3DObject(this.slot)
    this.screenObj.matrixAutoUpdate = false
    this.scene.add(this.screenObj)
    this.css.render(this.scene, this.camera)
  }

  setDevice(spec: DeviceSpec) {
    if (this.device) {
      this.stage.remove(this.device.root)
      disposeTree(this.device.root)
    }
    const d = buildDevice(spec.id, spec)
    // rotate about the device's middle
    d.root.updateMatrixWorld(true)
    d.root.position.copy(new THREE.Box3().setFromObject(d.root).getCenter(new THREE.Vector3()).negate())
    d.root.updateMatrixWorld(true)
    this.local = new THREE.Box3().setFromObject(d.root)
    this.stage.add(d.root)
    this.slot.style.width = `${d.slot.w}px`
    this.slot.style.height = `${d.slot.h}px`
    this.slot.style.background = spec.screenBg
    this.slot.style.borderRadius = d.radius
    this.device = d
    return d.slot
  }

  setLook(look: Look) {
    this.look = look
    this.shadow.group.visible = look.shadow
  }

  setPose(p: Pose) {
    this.pose = p
  }

  resize(w: number, h: number, dpr: number) {
    this.size = { w, h }
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.css.setSize(w, h)
  }

  /** Frame the posed device: the camera backs off until every corner of its own box, turned with it, fits in the
      frame, then zooms. */
  private frame(p: Pose) {
    const cam = this.camera
    cam.fov = p.fov
    cam.aspect = this.size.w / this.size.h
    cam.near = 1 // wide open while searching; tightened once the distance is known
    cam.far = 1e7
    cam.updateProjectionMatrix()
    this.stage.rotation.set(rad(p.pitch), rad(p.yaw), rad(p.roll), "YXZ")
    this.stage.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(this.device!.root)
    const L = this.local
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? L.max.x : L.min.x, i & 2 ? L.max.y : L.min.y, i & 4 ? L.max.z : L.min.z).applyMatrix4(this.stage.matrixWorld))
    const center = L.getCenter(new THREE.Vector3()).applyMatrix4(this.stage.matrixWorld)
    const dir = new THREE.Vector3(Math.sin(rad(p.azim)) * Math.cos(rad(p.elev)), Math.sin(rad(p.elev)), Math.cos(rad(p.azim)) * Math.cos(rad(p.elev)))
    const radius = L.getSize(new THREE.Vector3()).length() / 2
    const fits = (d: number) => {
      cam.position.copy(center).addScaledVector(dir, d)
      cam.lookAt(center)
      cam.updateMatrixWorld(true)
      return corners.every((c) => {
        const v = c.clone().project(cam)
        return Math.abs(v.x) <= 0.84 && Math.abs(v.y) <= 0.84 && v.z < 1
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
    // hugs the device (and the floor under it) instead of running from 10 to 200,000
    cam.near = Math.max(1, dist - radius * 1.6)
    cam.far = dist + radius * 3 + 2000
    cam.updateProjectionMatrix()
    // shift the subject up or down the frame by moving the camera along its own up axis
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion)
    const halfH = Math.tan(rad(p.fov / 2)) * cam.position.distanceTo(center)
    cam.position.addScaledVector(up, -p.rise * 2 * halfH)
    cam.updateMatrixWorld(true)
    return box
  }

  render() {
    if (!this.device || !this.pose) return
    const box = this.frame(this.pose)
    if (this.look.shadow) {
      const blur = this.shadow.place(box, this.device.rests === "base" ? 0 : this.pose.lift, 1)
      this.shadow.update(this.renderer, this.scene, blur)
    }
    this.stage.updateMatrixWorld(true)
    this.screenObj.matrix.copy(this.device.anchor.matrixWorld)
    this.screenObj.matrixWorldNeedsUpdate = true
    // the softbox's reflection slides across the glass as the device turns against the camera
    const at = new THREE.Vector3().setFromMatrixPosition(this.device.anchor.matrixWorld)
    const q = this.device.anchor.getWorldQuaternion(new THREE.Quaternion())
    const toCam = this.camera.position.clone().sub(at).normalize()
    const sx = toCam.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(q))
    const sy = toCam.dot(new THREE.Vector3(0, 1, 0).applyQuaternion(q))
    // "reflections" turns the glass up or down; the metal keeps the room's full light
    for (const g of this.device.glare) {
      g.tex.offset.set(0.5 + 0.22 - sx * 0.9, 0.5 - 0.1 + sy * 0.9)
      g.mat.color.setScalar(this.look.reflections)
    }
    for (const m of this.device.sheen) m.specularIntensity = SCREEN_SPECULAR * this.look.reflections
    this.renderer.render(this.scene, this.camera)
    this.css.render(this.scene, this.camera)
  }

  dispose() {
    if (this.device) disposeTree(this.device.root)
    this.shadow.dispose()
    this.scene.environment?.dispose()
    this.renderer.dispose()
    this.el.remove()
  }
}
