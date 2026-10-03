// detail.wgsl from Desktop/experiment animation/motiscope-output/webgl/vgpu, imports resolved by @vgpu/wgsl
// Surface-detail maps for the coins and notes. `npm run bake` renders them headless with vgpu and
// embeds them in ../index.html. Per-pixel grain is left to the page shaders so the maps compress well.
//   kind 0 = metal: r scratch depth, g grime, b fingerprint oil, a corrosion pits
//   kind 1 = paper: r fibre height, g formation (cloudiness), b soil, a crumple height
      
     
      

struct _vgsl_b72c78e3__Params { kind: f32, seed: f32, aspect: f32, pad: f32 }
@group(0) @binding(0) var<uniform> params: _vgsl_b72c78e3__Params;

const _vgsl_b72c78e3__TAU: f32 = 6.2831853;

// distance to a segment, and how far along it we are
fn _vgsl_b72c78e3__seg(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return vec2f(length(pa - ba * h), h);
}

// One random stroke per lattice cell; a 5x5 scan lets long strokes cross cells.
// Width and length are in cell units; bend > 0 curls the strokes (paper fibres).
fn _vgsl_b72c78e3__strokes(p: vec2f, density: f32, width: f32, lenMin: f32, lenMax: f32, bend: f32, seed: f32, additive: bool) -> f32 {
  let q = p + bend * vec2f(_vgsl_322f54c0__simplex2d(p * 0.35 + vec2f(seed, 3.1)), _vgsl_322f54c0__simplex2d(p * 0.35 + vec2f(7.7, seed)));
  let base = floor(q);
  var acc = 0.0;
  for (var j: i32 = -2; j <= 2; j++) {
    for (var i: i32 = -2; i <= 2; i++) {
      let cell = base + vec2f(f32(i), f32(j));
      let h = _vgsl_b1d4b403__hash3(vec3f(cell, seed));
      if (h.z > density) { continue; }
      let ang = h.x * _vgsl_b72c78e3__TAU;
      let hl = (lenMin + (lenMax - lenMin) * h.y) * 0.5;
      let c = cell + _vgsl_b1d4b403__hash2(cell + vec2f(seed * 7.1, 1.3));
      let d = vec2f(cos(ang), sin(ang)) * hl;
      let s = _vgsl_b72c78e3__seg(q, c - d, c + d);
      let w = width * (0.5 + fract(h.x * 13.7));
      let v = (1.0 - smoothstep(0.0, w, s.x)) * sin(s.y * 3.14159265) * (0.35 + 0.65 * fract(h.y * 7.31));
      if (additive) { acc += v; } else { acc = max(acc, v); }
    }
  }
  return acc;
}

// polishing swirls: short circular hairline arcs
fn _vgsl_b72c78e3__arcs(p: vec2f, density: f32, seed: f32) -> f32 {
  let base = floor(p);
  var acc = 0.0;
  for (var j: i32 = -2; j <= 2; j++) {
    for (var i: i32 = -2; i <= 2; i++) {
      let cell = base + vec2f(f32(i), f32(j));
      let h = _vgsl_b1d4b403__hash3(vec3f(cell, seed + 5.0));
      if (h.z > density) { continue; }
      let dv = p - (cell + _vgsl_b1d4b403__hash2(cell + vec2f(2.9, seed)));
      let rad = 0.5 + h.y * 1.3;
      let span = fract(atan2(dv.y, dv.x) / _vgsl_b72c78e3__TAU - h.x);
      let arcMask = smoothstep(0.0, 0.04, span) * (1.0 - smoothstep(0.2, 0.28 + 0.3 * h.y, span));
      let ring = 1.0 - smoothstep(0.0, 0.009, abs(length(dv) - rad));
      acc = max(acc, ring * arcMask * 0.55);
    }
  }
  return acc;
}

// loop-and-whorl ridges with a soft oval edge and broken lines
fn _vgsl_b72c78e3__fingerprint(p: vec2f, center: vec2f, rot: f32, size: f32, seed: f32) -> f32 {
  let d0 = p - center;
  let cr = cos(rot);
  let sr = sin(rot);
  let d = vec2f(d0.x * cr - d0.y * sr, d0.x * sr + d0.y * cr) / vec2f(size * 0.7, size);
  let warp = _vgsl_322f54c0__simplex2d(p * 9.0 + vec2f(seed)) * 0.012 + _vgsl_322f54c0__simplex2d(p * 3.0 - vec2f(seed)) * 0.02;
  let r = length(d + vec2f(0.0, d.y * 0.15)) + warp;
  let ridges = smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(r * 150.0));
  let edge = 1.0 - smoothstep(0.55, 1.0, length(d));
  let broken = smoothstep(-0.6, 0.0, _vgsl_322f54c0__simplex2d(p * 45.0 + vec2f(seed * 3.0)));
  return ridges * edge * broken;
}

fn _vgsl_b72c78e3__metal(uv: vec2f, seed: f32) -> vec4f {
  let fine = _vgsl_b72c78e3__strokes(uv * 40.0, 0.55, 0.018, 0.6, 2.6, 0.0, seed, false);
  let deep = _vgsl_b72c78e3__strokes(uv * 14.0, 0.3, 0.011, 0.8, 3.4, 0.0, seed + 11.0, false);
  let swirl = _vgsl_b72c78e3__arcs(uv * 22.0, 0.35, seed);
  let scratch = clamp(max(max(fine, deep), swirl), 0.0, 1.0);

  let grime = clamp(_vgsl_322f54c0__fbmSimplex2d(uv * 5.0 + vec2f(seed), 5, 2.1, 0.55) * 0.9 + 0.5, 0.0, 1.0);
  let oil = max(_vgsl_b72c78e3__fingerprint(uv, vec2f(0.32, 0.38), 0.5, 0.16, seed), _vgsl_b72c78e3__fingerprint(uv, vec2f(0.7, 0.66), -0.9, 0.13, seed + 4.0));

  let v = _vgsl_07c5daa4__voronoi2d(uv * 90.0 + vec2f(seed));
  let pit = (1.0 - smoothstep(0.05, 0.16, v.f1)) * step(0.93, _vgsl_b1d4b403__hash2(vec2f(v.cell) + vec2f(seed)).x);
  return vec4f(scratch, grime, oil, pit);
}

fn _vgsl_b72c78e3__paper(uv: vec2f, aspect: f32, seed: f32) -> vec4f {
  let p = uv * vec2f(aspect, 1.0);
  let fibA = _vgsl_b72c78e3__strokes(p * 60.0, 0.9, 0.05, 0.8, 2.2, 0.6, seed, true);
  let fibB = _vgsl_b72c78e3__strokes(p * 25.0, 0.6, 0.035, 1.0, 2.8, 0.8, seed + 3.0, true);
  let fibre = clamp(fibA * 0.35 + fibB * 0.3, 0.0, 1.0);
  let formation = clamp(_vgsl_322f54c0__fbmSimplex2d(p * 7.0 + vec2f(seed), 5, 2.07, 0.55) * 0.8 + 0.5, 0.0, 1.0);

  // soil gathers at the edges, in the fold lines (thirds + half, matching the folds), in smudges and a thumbprint
  let e = min(min(uv.x * aspect, (1.0 - uv.x) * aspect), min(uv.y, 1.0 - uv.y));
  let edgeNoise = _vgsl_322f54c0__fbmSimplex2d(p * 14.0 + vec2f(seed * 2.0), 4, 2.0, 0.5);
  var soil = (1.0 - smoothstep(0.0, 0.06 + 0.03 * edgeNoise, e)) * 0.8;
  let fold = exp(-abs(abs(uv.x - 0.5) - 1.0 / 6.0) * aspect * 90.0) + exp(-abs(uv.y - 0.5) * 90.0);
  soil += fold * smoothstep(-0.3, 0.4, _vgsl_322f54c0__simplex2d(p * 20.0 + vec2f(seed))) * 0.55;
  soil += smoothstep(0.45, 0.8, _vgsl_322f54c0__fbmSimplex2d(p * 2.5 + vec2f(seed * 5.0), 4, 2.0, 0.5)) * 0.35;
  soil += _vgsl_b72c78e3__fingerprint(p, vec2f(0.28 * aspect, 0.72), 0.3, 0.11, seed) * 0.35;

  // crumple: faceted creases at three scales, a few straight handling creases, soft undulation
  var crumple = _vgsl_b72c78e3__facets(p * 3.2, seed) * 0.55 + _vgsl_b72c78e3__facets(p * 7.5 + vec2f(5.0), seed + 1.0) * 0.3 + _vgsl_b72c78e3__facets(p * 17.0 + vec2f(9.0), seed + 2.0) * 0.14;
  crumple -= _vgsl_b72c78e3__strokes(p * 2.6, 0.45, 0.006, 2.0, 5.0, 0.0, seed + 21.0, false) * 0.18;
  crumple += _vgsl_322f54c0__simplex2d(p * 1.7 + vec2f(seed * 1.3)) * 0.12;
  return vec4f(fibre, formation, clamp(soil, 0.0, 1.0), clamp(0.5 + crumple, 0.0, 1.0));
}

// continuous faceted relief: each cell rises or sinks to a point, with sharp creases along cell edges
// (f2 - f1 is zero on every edge, so the sign flip between neighbours never tears the surface)
fn _vgsl_b72c78e3__facets(p: vec2f, seed: f32) -> f32 {
  let base = floor(p);
  var f1 = 9.0;
  var f2 = 9.0;
  var id = vec2f(0.0);
  for (var j: i32 = -1; j <= 1; j++) {
    for (var i: i32 = -1; i <= 1; i++) {
      let cell = base + vec2f(f32(i), f32(j));
      let d = length(p - (cell + _vgsl_b1d4b403__hash2(cell + vec2f(seed, 17.0))));
      if (d < f1) { f2 = f1; f1 = d; id = cell; } else if (d < f2) { f2 = d; }
    }
  }
  return (f2 - f1) * (_vgsl_b1d4b403__hash2(id + vec2f(3.3, seed)).x * 2.0 - 1.0);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  if (params.kind < 0.5) { return _vgsl_b72c78e3__metal(uv, params.seed); }
  return _vgsl_b72c78e3__paper(uv, params.aspect, params.seed);
}

// from @vgpu\wgsl-std\src\hash\index.wgsl
// Wellons lowbias32: https://github.com/skeeto/hash-prospector
 

 fn _vgsl_b1d4b403__pcg2d(value: vec2u) -> vec2u {
  // 2D multi-output variant cross-mixes with the LCG multiplier instead of pcg3d's y*z pattern.
  var hashed = value * 1664525u + 1013904223u;
  hashed.x = hashed.x + hashed.y * 1664525u;
  hashed.y = hashed.y + hashed.x * 1664525u;
  hashed = hashed ^ (hashed >> vec2u(16u));
  hashed.x = hashed.x + hashed.y * 1664525u;
  hashed.y = hashed.y + hashed.x * 1664525u;
  hashed = hashed ^ (hashed >> vec2u(16u));
  return hashed;
}

 fn _vgsl_b1d4b403__pcg3d(value: vec3u) -> vec3u {
  var hashed = value * 1664525u + 1013904223u;
  hashed.x = hashed.x + hashed.y * hashed.z;
  hashed.y = hashed.y + hashed.z * hashed.x;
  hashed.z = hashed.z + hashed.x * hashed.y;
  hashed = hashed ^ (hashed >> vec3u(16u));
  hashed.x = hashed.x + hashed.y * hashed.z;
  hashed.y = hashed.y + hashed.z * hashed.x;
  hashed.z = hashed.z + hashed.x * hashed.y;
  hashed = hashed ^ (hashed >> vec3u(16u));
  return hashed;
}

 fn _vgsl_b1d4b403__unitFloat(hash: u32) -> f32 {
  return f32(hash >> 8u) * (1.0 / 16777216.0);
}

 

 fn _vgsl_b1d4b403__hash2(seed: vec2f) -> vec2f {
  let hashed = _vgsl_b1d4b403__pcg2d(bitcast<vec2u>(seed));
  return vec2f(_vgsl_b1d4b403__unitFloat(hashed.x), _vgsl_b1d4b403__unitFloat(hashed.y));
}

 fn _vgsl_b1d4b403__hash3(seed: vec3f) -> vec3f {
  let hashed = _vgsl_b1d4b403__pcg3d(bitcast<vec3u>(seed));
  return vec3f(_vgsl_b1d4b403__unitFloat(hashed.x), _vgsl_b1d4b403__unitFloat(hashed.y), _vgsl_b1d4b403__unitFloat(hashed.z));
}

// from @vgpu\wgsl-std\src\noise\index.wgsl
struct _vgsl_07c5daa4__VoronoiSample2 {
  f1: f32,
  f2: f32,
  cell: vec2i,
}

 

 fn _vgsl_07c5daa4__voronoi2d(position: vec2f) -> _vgsl_07c5daa4__VoronoiSample2 {
  let baseCell = vec2i(floor(position));
  var nearestDistance = 1.0e20;
  var secondDistance = 1.0e20;
  var nearestCell = baseCell;

  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let cell = baseCell + vec2i(x, y);
      let hashed = _vgsl_b1d4b403__pcg2d(bitcast<vec2u>(cell));
      let feature = vec2f(f32(cell.x), f32(cell.y)) + vec2f(_vgsl_b1d4b403__unitFloat(hashed.x), _vgsl_b1d4b403__unitFloat(hashed.y));
      let distance = length(feature - position);

      if (distance < nearestDistance) {
        secondDistance = nearestDistance;
        nearestDistance = distance;
        nearestCell = cell;
      } else if (distance < secondDistance) {
        secondDistance = distance;
      }
    }
  }

  return _vgsl_07c5daa4__VoronoiSample2(nearestDistance, secondDistance, nearestCell);
}

 

// from @vgpu\wgsl-std\src\noise\simplex\index.wgsl
// Simplex noise on the skewed simplicial lattice (Perlin 2001; Gustavson, "Simplex noise
// demystified"), re-derived on this package's integer pcg hashes -- no code copied, no permutation
// table, no period-289 float hash, and no `sqrt`/trig anywhere in the core (see
// ../internal/gradient.wgsl for the determinism contract this module inherits).
//
// Range is a *proof*, not an observation: the kernel sum is bounded by its measured supremum
// (0.0100802047 for 2D, 0.0130071572 for 3D) and the normalizers below sit just under 1/sup, so
// abs(simplex2d(p)) <= 0.98786 and abs(simplex3d(p)) <= 0.98854 for every finite input. Do not
// replace them with the folkloric webgl-noise scale factors, which exceed 1 and force consumers to
// clamp. sigma is ~0.533 (2D) / ~0.388 (3D): ~1.7x Perlin's, with ~2.5x the slope, so
// `simplex3d(p)` is a higher-frequency field than `perlin3d(p)` -- scale `p` by ~0.4-0.5 when
// migrating (see index.docs.md).
        

// Skew/unskew constants, spelled as precomputed decimal literals because `sqrt` is banned in the
// core: its accuracy is implementation-defined, which would make the goldens driver-dependent.
const _vgsl_322f54c0__simplexF2: f32 = 0.36602540378443865;      // (sqrt(3) - 1) / 2
const _vgsl_322f54c0__simplexG2: f32 = 0.21132486540518713;      // (3 - sqrt(3)) / 6
const _vgsl_322f54c0__simplexG2Twice: f32 = 0.42264973081037427; // 2 * simplexG2
       // 1 / 3
      // 1 / 6
  // 2 * simplexG3
                // 3 * simplexG3

// Kernel radius^2 is 0.5, NOT the widespread 0.6 (Gustavson/webgl-noise canonical value):
// 0.6 measurably produces C0 cracks (max |dv| ~4.6e-5 to 9.5e-5 vs ~2.9e-8 to 4.8e-8 at 0.5,
// i.e. ~1000x worse) because its support radius (0.775) exceeds the 4-corner traversal's
// reach. See `simplexCrackDetector` in tests/simplex.test.ts -- do not "fix" this back to 0.6.
//
// Why 0.5 is exactly right rather than merely smaller: on the face where the corner ranking flips,
// the corner the traversal drops sits at squared distance >= 0.5 from the sample, with equality at
// the tightest point (2D: d = (simplexG2 - 0.5, 0.5), |d|^2 = 0.5 exactly). At radius^2 = 0.5 that
// dropped corner therefore contributes exactly 0 with a vanishing first and second derivative
// (t^4), so the field stays C2 across every simplex face. At 0.6 the same corner still carries
// t = 0.1, and dropping it is a discontinuity.
fn _vgsl_322f54c0__simplexKernel2(cell: vec2i, d: vec2f) -> f32 {
  let t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  let t2 = t * t;
  return t2 * t2 * _vgsl_3cc2b6d8__gradDot2(_vgsl_3cc2b6d8__gradIndex2(cell), d);
}



// 2D simplex: 3 corners of a triangle in the sheared lattice. `vec2i(base)` (never
// `vec2i(position)`) keeps negative coordinates correct, and there is no float `mod` anywhere --
// WGSL's `%` truncates toward the dividend, unlike GLSL's `mod`, which is how ported noise code
// silently breaks for p < 0.
 fn _vgsl_322f54c0__simplex2d(position: vec2f) -> f32 {
  let skew = (position.x + position.y) * _vgsl_322f54c0__simplexF2;
  let base = floor(position + vec2f(skew));
  let cell = vec2i(base);
  let unskew = (base.x + base.y) * _vgsl_322f54c0__simplexG2;
  let d0 = position - (base - vec2f(unskew));
  // Which of the two triangles of the sheared cell we are in: the ranking of d0's components.
  let second = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), d0.x > d0.y);
  let d1 = d0 - second + vec2f(_vgsl_322f54c0__simplexG2);
  let d2 = d0 - vec2f(1.0) + vec2f(_vgsl_322f54c0__simplexG2Twice);
  var total = _vgsl_322f54c0__simplexKernel2(cell, d0);
  total = total + _vgsl_322f54c0__simplexKernel2(cell + vec2i(second), d1);
  total = total + _vgsl_322f54c0__simplexKernel2(cell + vec2i(1, 1), d2);
  // raw sup = 0.0100802047, so 98.0 < 1/sup: abs(value) <= 0.98786, never clipped.
  return 98.0 * total;
}

// 3D simplex: 4 corners of a tetrahedron, i.e. half the 8 corners perlin3d needs (4 pcg3d hashes
// against Perlin's 8).
 

// Amplitude-normalized FBM: dividing by the sum of the amplitudes is what makes the (-1, 1)
// guarantee survive octaves (abs(sum) <= weight by construction, and weight >= 1 so the division is
// always safe). `octaves` is clamped to [1, 16] because an unbounded dynamic loop count is a
// GPU-hang risk, and `gain` to [0, 1] because a negative gain would break weight = sum of |a| and
// with it the range proof. Both clamps are silent and documented. Free invariant:
// `fbmSimplex2d(p, 1, lacunarity, gain)` is exactly `simplex2d(p)`.
 fn _vgsl_322f54c0__fbmSimplex2d(position: vec2f, octaves: i32, lacunarity: f32, gain: f32) -> f32 {
  let count = clamp(octaves, 1, 16);
  let decay = clamp(gain, 0.0, 1.0);
  var sum = 0.0;
  var amplitude = 1.0;
  var weight = 0.0;
  var sample = position;
  for (var i = 0; i < count; i = i + 1) {
    sum = sum + amplitude * _vgsl_322f54c0__simplex2d(sample);
    weight = weight + amplitude;
    sample = sample * lacunarity;
    amplitude = amplitude * decay;
  }
  return sum / weight;
}

 

// from @vgpu\wgsl-std\src\noise\internal\gradient.wgsl
// Shared, table-free gradient core for the gradient-noise families (perlin/, simplex/).
//
// Private module: it is intentionally absent from this package's `package.json` exports, so the
// only way in is a relative import from a sibling noise module
// (`import { gradDot3 } from "../internal/gradient.wgsl";`). The declarations still carry `export`
// because the resolver keys its import graph off that literal token
// (packages/wgsl/src/runtime/parser.ts) -- `export` here means "importable by a relative sibling",
// not "public API".
//
// Determinism contract (locked by tests/noise-gradient.test.ts):
//   * no `array<...>` anywhere: permutation/gradient tables cost shader text in every consumer and
//     backends expand or spill them anyway, buying nothing over a few `select`s.
//   * no `sin`/`cos`/`sqrt`/`inverseSqrt`/`pow` anywhere: their accuracy is implementation-defined
//     (WGSL allows several ulp), so an angle-based gradient would drift per driver and make golden
//     tests flaky. Everything below is `+ - * select` plus the exactly specified u32 hash ops, so
//     *which* gradient a cell gets is bit-identical on every backend.
//
// References (algorithms, no code copied): Perlin 2002 "Improving Noise" (quintic fade, 12
// cube-edge gradients), Perlin 2001 / Gustavson "Simplex noise demystified".
      

// 1 / sqrt(2), spelled as a literal because `sqrt` is banned above.
 const _vgsl_3cc2b6d8__noiseInvSqrt2: f32 = 0.7071067811865476;

// Gradient selector: pcg2d/pcg3d over the bit pattern of the integer cell (same idiom as
// voronoi2d/voronoi3d), giving a 2^32-cell period instead of the folklore period-289 float hash.
 fn _vgsl_3cc2b6d8__gradIndex2(cell: vec2i) -> u32 { return _vgsl_b1d4b403__pcg2d(bitcast<vec2u>(cell)).x & 7u; }

// 12 gradients out of 32 bits: bias is 4/2^32 ~= 1e-9.
 

// 8 unit gradients. index 0..3 -> (1,0) (-1,0) (0,1) (0,-1);  4..7 -> (+-1,+-1)/sqrt(2).
// Unit length keeps the 2D field's amplitude bound closed-form (raw sup |perlin2d| = 1/sqrt(2)).
 fn _vgsl_3cc2b6d8__gradDot2(index: u32, d: vec2f) -> f32 {
  let axis = select(d.x, d.y, (index & 2u) != 0u);
  let axisDot = select(axis, -axis, (index & 1u) != 0u);
  let sx = select(d.x, -d.x, (index & 1u) != 0u);
  let sy = select(d.y, -d.y, (index & 2u) != 0u);
  return select(axisDot, _vgsl_3cc2b6d8__noiseInvSqrt2 * (sx + sy), index >= 4u);
}

// Perlin's 12 cube-edge gradients (+-1,+-1,0) (+-1,0,+-1) (0,+-1,+-1), length sqrt(2): the dot
// product costs one add plus two negations, no multiplies.
// index/4 selects the component pair: 0 -> (x,y), 1 -> (x,z), 2 -> (y,z); bits 0/1 are the signs.
 

// Quintic fade 6t^5 - 15t^4 + 10t^3 (Perlin 2002): zero first *and* second derivative at the cell
// boundaries, so lattice seams stay invisible in derivatives (normals) too.
 
 
