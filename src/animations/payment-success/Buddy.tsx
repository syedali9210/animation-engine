import { useEffect, useRef } from "react";

export type BuddyParts = {
  root: SVGGElement;
  earL: SVGRectElement;
  earR: SVGRectElement;
  body: SVGRectElement;
  eyeL: SVGRectElement;
  eyeR: SVGRectElement;
  armL: SVGGElement;
  armR: SVGGElement;
  legL: SVGGElement;
  legR: SVGGElement;
  trumpet: SVGGElement;
  trumpetBell: SVGPathElement;
};

const VISOR_COLOR = "#241a16";
const EYE_COLOR = "#ffd9b8";
const TRUMPET_COLOR = "#f5c542";
const TRUMPET_SHADE = "#d9a520";

export default function Buddy({
  onReady,
  id,
  body: BODY_COLOR = "#e2694b",
  shade: BODY_SHADE = "#c94f34",
}: {
  onReady: (parts: BuddyParts) => void;
  id: string;
  body?: string;
  shade?: string;
}) {
  const partsRef = useRef<Partial<BuddyParts>>({});
  const readyCalled = useRef(false);

  useEffect(() => {
    if (readyCalled.current) return;
    const p = partsRef.current;
    if (
      p.root &&
      p.earL &&
      p.earR &&
      p.body &&
      p.eyeL &&
      p.eyeR &&
      p.armL &&
      p.armR &&
      p.legL &&
      p.legR &&
      p.trumpet &&
      p.trumpetBell
    ) {
      readyCalled.current = true;
      onReady(p as BuddyParts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof BuddyParts>(key: K) => (el: BuddyParts[K] | null) => {
    if (el) partsRef.current[key] = el;
  };

  return (
    <g ref={set("root")} id={`buddy-${id}`}>
      {/* legs (drawn first so body overlaps their tops) */}
      <g ref={set("legL")} transform="translate(37, 62)">
        <rect x={-7} y={0} width={14} height={20} rx={6} fill={BODY_SHADE} />
      </g>
      <g ref={set("legR")} transform="translate(63, 62)">
        <rect x={-7} y={0} width={14} height={20} rx={6} fill={BODY_SHADE} />
      </g>

      {/* arms */}
      <g ref={set("armL")} transform="translate(14, 42)">
        <rect x={-11} y={-6} width={13} height={12} rx={6} fill={BODY_COLOR} />
      </g>
      <g ref={set("armR")} transform="translate(86, 42)">
        <rect x={-2} y={-6} width={13} height={12} rx={6} fill={BODY_COLOR} />
        {/* trumpet, hidden until celebration phase */}
        <g ref={set("trumpet")} transform="translate(6, -2) rotate(-15)" opacity={0}>
          <rect x={0} y={-3} width={22} height={7} rx={3} fill={TRUMPET_SHADE} />
          <path
            ref={set("trumpetBell")}
            d="M 20 -7 L 34 -13 L 34 9 L 20 3 Z"
            fill={TRUMPET_COLOR}
          />
          <circle cx={8} cy={-6.5} r={1.6} fill={TRUMPET_SHADE} />
          <circle cx={12} cy={-6.5} r={1.6} fill={TRUMPET_SHADE} />
          <circle cx={16} cy={-6.5} r={1.6} fill={TRUMPET_SHADE} />
        </g>
      </g>

      {/* ears */}
      <rect ref={set("earL")} x={19} y={2} width={15} height={15} rx={6} fill={BODY_COLOR} />
      <rect ref={set("earR")} x={66} y={2} width={15} height={15} rx={6} fill={BODY_COLOR} />

      {/* body */}
      <rect ref={set("body")} x={13} y={14} width={74} height={56} rx={22} fill={BODY_COLOR} />

      {/* visor + eyes */}
      <rect x={25} y={37} width={50} height={17} rx={8.5} fill={VISOR_COLOR} />
      <rect ref={set("eyeL")} x={33} y={41.5} width={9} height={9} rx={2.5} fill={EYE_COLOR} />
      <rect ref={set("eyeR")} x={58} y={41.5} width={9} height={9} rx={2.5} fill={EYE_COLOR} />
    </g>
  );
}
