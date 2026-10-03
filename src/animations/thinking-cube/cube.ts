/**
 * Rubik's cube state as pure data.
 *
 * Coordinates are CSS's: x right, y DOWN, z toward the viewer. A cubie lives at
 * an integer position in [-1,1]^3 and carries a `basis` — the images of its
 * local x/y/z axes — which is exactly what `matrix3d` wants, so a piece's
 * stickers follow its orientation for free.
 */

export type Vec = [number, number, number];
/** Index into a Vec: 0 = x, 1 = y, 2 = z. */
export type Axis = 0 | 1 | 2;
export type Move = { axis: Axis; layer: -1 | 1; dir: 1 | -1 };
export type Basis = [Vec, Vec, Vec];

export type Cubie = {
  id: number;
  /** Solved position — fixes which of the six faces get stickers. Never changes. */
  home: Vec;
  pos: Vec;
  basis: Basis;
};

/**
 * Rotate a vector 90° * dir about `axis`, matching CSS's `rotate3d`:
 * a positive turn sends y→z (about x), z→x (about y), x→y (about z).
 */
export function spin([x, y, z]: Vec, axis: Axis, dir: number): Vec {
  // `+ 0` folds -0 back to 0 so transform strings and equality checks stay clean.
  if (axis === 0) return [x, -dir * z + 0, dir * y + 0];
  if (axis === 1) return [dir * z + 0, y, -dir * x + 0];
  return [-dir * y + 0, dir * x + 0, z];
}

const IDENTITY: Basis = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export function makeCube(): Cubie[] {
  const cubies: Cubie[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        cubies.push({
          id: cubies.length,
          home: [x, y, z],
          pos: [x, y, z],
          basis: IDENTITY,
        });
  return cubies;
}

export const inLayer = (c: Cubie, m: Move) => c.pos[m.axis] === m.layer;

export function applyMove(cubies: Cubie[], m: Move): Cubie[] {
  return cubies.map((c) =>
    inLayer(c, m)
      ? {
          ...c,
          pos: spin(c.pos, m.axis, m.dir),
          basis: c.basis.map((b) => spin(b, m.axis, m.dir)) as Basis,
        }
      : c,
  );
}

export const isSolved = (cubies: Cubie[]) =>
  cubies.every(
    (c) =>
      c.pos.every((v, i) => v === c.home[i]) &&
      c.basis.every((b, i) => b[i] === 1),
  );

/** Column-major 4x4, columns being the images of x, y, z and the origin. */
export const matrix3d = ([bx, by, bz]: Basis) =>
  `matrix3d(${bx},0,${by},0,${bz},0,0,0,0,1)`;

/** Seeded so the first render matches between server and client. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scramble(n: number, rand: () => number): Move[] {
  const moves: Move[] = [];
  let lastAxis = -1;
  while (moves.length < n) {
    const axis = Math.floor(rand() * 3) as Axis;
    // Back-to-back turns on one axis read as a single slow turn — skip them.
    if (axis === lastAxis) continue;
    lastAxis = axis;
    moves.push({
      axis,
      layer: rand() < 0.5 ? -1 : 1,
      dir: rand() < 0.5 ? 1 : -1,
    });
  }
  return moves;
}

/** The solution to a scramble is the scramble, backwards and inverted. */
export const invert = (moves: Move[]): Move[] =>
  moves
    .slice()
    .reverse()
    .map((m) => ({ ...m, dir: -m.dir as 1 | -1 }));

/** How far out the piece sits — 0 core, 1 face centre, 2 edge, 3 corner. */
export const shell = (p: Vec) => Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]);

/** Ids in the order pieces should emerge: core first, then outward. */
export const spawnOrder = (cubies: Cubie[]) =>
  cubies
    .slice()
    .sort((a, b) => shell(a.pos) - shell(b.pos) || a.id - b.id)
    .map((c) => c.id);

/**
 * `tint` is a flat overlay standing in for directional light, so the six sides
 * of a piece read as a solid object rather than a coloured square.
 * ponytail: baked per face, so it turns with the piece instead of staying put —
 * imperceptible at this size; swap for a real light if the cube ever gets big.
 */
export const FACES = [
  { axis: 0, dir: 1, rotate: "rotateY(90deg)", sticker: "#e0392c", tint: "rgba(0,0,0,0.10)" }, // right
  { axis: 0, dir: -1, rotate: "rotateY(-90deg)", sticker: "#ef7d21", tint: "rgba(0,0,0,0.22)" }, // left
  { axis: 1, dir: -1, rotate: "rotateX(90deg)", sticker: "#f2f2ef", tint: "rgba(255,255,255,0.16)" }, // up
  { axis: 1, dir: 1, rotate: "rotateX(-90deg)", sticker: "#f4cf2a", tint: "rgba(0,0,0,0.30)" }, // down
  { axis: 2, dir: 1, rotate: "", sticker: "#199e4a", tint: "rgba(255,255,255,0.03)" }, // front
  { axis: 2, dir: -1, rotate: "rotateY(180deg)", sticker: "#1a5ecb", tint: "rgba(0,0,0,0.18)" }, // back
] as const;
