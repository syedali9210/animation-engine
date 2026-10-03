// Tab Hop — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  tabs: "Home, Projects, Archive",
  autoplay: true,
  intervalMs: 1800,
  hopMs: 340,
  hopHeight: 14,
  squash: 0.82,
  stretch: 1.1,
  lean: 7,
  indicatorMs: 350,
  indicatorBounce: 0.15,
  blinkMs: 3400,
  body: "#db744f",
  highlight: "#ec9a78",
  shade: "#b95a3c",
  shadeDark: "#8f4530",
};

export type Params = typeof params;
