import { useEffect, useRef } from "react";

export type CoinParts = {
  root: SVGGElement;
  spin: SVGGElement;
  shadow: SVGEllipseElement;
};

export default function Coin({
  onReady,
  id,
  radius = 42,
  face = "#f7d34d",
  edge = "#c99417",
}: {
  onReady: (parts: CoinParts) => void;
  id: string;
  radius?: number;
  face?: string;
  edge?: string;
}) {
  const partsRef = useRef<Partial<CoinParts>>({});
  const readyCalled = useRef(false);

  useEffect(() => {
    if (readyCalled.current) return;
    const p = partsRef.current;
    if (p.root && p.spin && p.shadow) {
      readyCalled.current = true;
      onReady(p as CoinParts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof CoinParts>(key: K) => (el: CoinParts[K] | null) => {
    if (el) partsRef.current[key] = el;
  };

  const round = (n: number) => Math.round(n * 1000) / 1000;

  const notches = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const x1 = round(Math.cos(angle) * (radius - 2));
    const y1 = round(Math.sin(angle) * (radius - 2));
    const x2 = round(Math.cos(angle) * (radius - 8));
    const y2 = round(Math.sin(angle) * (radius - 8));
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={edge}
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  });

  return (
    <g ref={set("root")} id={`coin-${id}`}>
      <ellipse
        ref={set("shadow")}
        cx={0}
        cy={radius + 14}
        rx={radius * 0.85}
        ry={9}
        fill="#000000"
        opacity={0.35}
      />
      <g ref={set("spin")}>
        <circle r={radius} fill={face} stroke={edge} strokeWidth={4} />
        <circle r={radius - 9} fill="none" stroke="#e0ac1f" strokeWidth={2} />
        {notches}
        {/* off-center mark so rotation reads clearly */}
        <circle cx={radius * 0.4} cy={-radius * 0.35} r={5} fill="#e0ac1f" />
        <text
          x={0}
          y={8}
          textAnchor="middle"
          fontSize={30}
          fontWeight={700}
          fill={edge}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          $
        </text>
      </g>
    </g>
  );
}
