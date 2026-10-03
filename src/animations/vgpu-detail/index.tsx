import { useEffect, useRef, useState } from "react";
import detailWgsl from "./detail.wgsl?raw";
import { params as defaults, type Params } from "./params";

// Coins & Notes bakes these fields offline (vgpu, headless) into PNGs. Here the same WGSL runs live on
// WebGPU every frame — which shows exactly why it was baked: it's one of the heaviest shaders you have.
const VIEW_WGSL = /* wgsl */ `
struct View { pan: vec2f, res: vec2f, zoom: f32, channel: f32, contrast: f32, pad: f32, lo: vec4f, hi: vec4f }
@group(0) @binding(1) var<uniform> view: View;

struct VOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs_main(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2f, 3>(vec2f(-1., -3.), vec2f(-1., 1.), vec2f(3., 1.));
  var o: VOut;
  o.pos = vec4f(p[i], 0., 1.);
  o.uv = p[i] * vec2f(.5, -.5) + .5;
  return o;
}
@fragment fn fs_view(@location(0) uv: vec2f) -> @location(0) vec4f {
  let q = (uv - .5) * vec2f(view.res.x / view.res.y, 1.) / view.zoom + .5 + view.pan;
  let d = detail(q);
  var v = dot(d, vec4f(.45, .2, .2, .15));
  if (view.channel > .5) { v = d[u32(view.channel) - 1u]; }
  v = clamp((v - .5) * view.contrast + .5, 0., 1.);
  return vec4f(mix(view.lo.rgb, view.hi.rgb, v), 1.);
}`;
// the baked entry point becomes a plain function the viewer samples
const SHADER = detailWgsl.replace("@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {", "fn detail(uv: vec2f) -> vec4f {") + VIEW_WGSL;

const CHANNELS = ["Composite", "R", "G", "B", "A"];
export const CHANNEL_NAMES = { metal: ["scratch depth", "grime", "fingerprint oil", "corrosion pits"], paper: ["fibre height", "formation", "soil", "crumple"] };
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
/** "rgb(9, 9, 11)" -> [r, g, b] in 0..1 — empty colour params follow the page theme this way */
const css = (c: string) => (c.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map((n) => Number(n) / 255);

export default function VgpuDetail({ p = defaults }: { p?: Params }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pr = useRef(p);
  pr.current = p;
  const draw = useRef<() => void>(() => {});
  const [status, setStatus] = useState("Starting WebGPU…");

  useEffect(() => {
    let raf = 0;
    let dead = false;
    let device: any; // WebGPU handles stay untyped so this file needs no @webgpu/types
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      const gpu = (navigator as any).gpu;
      const adapter = await gpu?.requestAdapter();
      if (!adapter) return setStatus("WebGPU isn't available in this browser — try Chrome or Edge 113+.");
      device = await adapter.requestDevice();
      if (dead) return device.destroy();
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("webgpu") as any;
      const format = gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: "opaque" });
      const module = device.createShaderModule({ code: SHADER });
      const info = await module.getCompilationInfo();
      const err = info.messages.find((m: any) => m.type === "error");
      if (err) return setStatus(`WGSL: ${err.message}`);
      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs_main" },
        fragment: { module, entryPoint: "fs_view", targets: [{ format }] },
      });
      const UNIFORM_COPY = 0x40 | 0x08; // GPUBufferUsage.UNIFORM | COPY_DST
      const paramsBuf = device.createBuffer({ size: 16, usage: UNIFORM_COPY });
      const viewBuf = device.createBuffer({ size: 64, usage: UNIFORM_COPY });
      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: paramsBuf } },
          { binding: 1, resource: { buffer: viewBuf } },
        ],
      });
      setStatus("");

      let pan = 0;
      let last = performance.now();
      const render = () => {
        const q = pr.current;
        const now = performance.now();
        if (q.animate && !reduce) pan += (q.drift * (now - last)) / 1000;
        last = now;
        const w = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio * q.resolution));
        const h = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio * q.resolution));
        if (canvas.width !== w || canvas.height !== h) Object.assign(canvas, { width: w, height: h });
        const paper = q.kind === "paper";
        device.queue.writeBuffer(paramsBuf, 0, new Float32Array([paper ? 1 : 0, q.seed, paper ? 2 : 1, 0]));
        const theme = getComputedStyle(boxRef.current!);
        const lo = q.low ? rgb(q.low) : css(theme.backgroundColor);
        const hi = q.high ? rgb(q.high) : css(theme.color);
        device.queue.writeBuffer(viewBuf, 0, new Float32Array([pan, pan * 0.37, w, h, q.zoom, CHANNELS.indexOf(q.channel), q.contrast, 0, ...lo, 1, ...hi, 1]));
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(3);
        pass.end();
        device.queue.submit([enc.finish()]);
      };
      // reduced motion (or Animate off): draw on change only, no 120Hz loop over a still image
      const loop = () => {
        render();
        raf = pr.current.animate && !reduce ? requestAnimationFrame(loop) : 0;
      };
      draw.current = () => {
        if (!raf) loop();
      };
      loop();
    })().catch((e) => setStatus(String(e?.message ?? e)));
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      device?.destroy();
    };
  }, []);

  useEffect(() => draw.current(), [p]);
  // a theme flip changes the auto colours; redraw even when the drift is paused
  useEffect(() => {
    const mo = new MutationObserver(() => draw.current());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => mo.disconnect();
  }, []);

  const names = CHANNEL_NAMES[p.kind as keyof typeof CHANNEL_NAMES];
  return (
    <div ref={boxRef} className="absolute inset-0 bg-background text-foreground">
      <canvas ref={canvasRef} className="block h-full w-full" aria-label={`vgpu ${p.kind} detail map, live`} />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-black/55 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/85 backdrop-blur-sm">
        {status || (
          <>
            detail.wgsl · {p.kind} · {p.channel === "Composite" ? "rgba composite" : `${p.channel} = ${names["RGBA".indexOf(p.channel)]}`}
          </>
        )}
      </div>
    </div>
  );
}
