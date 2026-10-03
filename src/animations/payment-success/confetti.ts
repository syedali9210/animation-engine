import type { gsap as GsapInstance } from "gsap";

const COLORS = ["#e2694b", "#f5c542", "#4ecdc4", "#ff8fa3", "#fff3e0", "#7cd992"];

export type ConfettiOrigin = { x: number; y: number; dir: 1 | -1 };

export function burstConfetti(
  gsapInstance: typeof GsapInstance,
  container: SVGGElement,
  origins: ConfettiOrigin[],
  countPerOrigin = 14
) {
  origins.forEach(({ x, y, dir }) => {
    for (let i = 0; i < countPerOrigin; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const size = 4 + Math.random() * 5;
      el.setAttribute("width", String(size));
      el.setAttribute("height", String(size * 0.6));
      el.setAttribute("rx", "1");
      el.setAttribute("fill", COLORS[Math.floor(Math.random() * COLORS.length)]);
      container.appendChild(el);

      gsapInstance.set(el, {
        x,
        y,
        opacity: 1,
        rotation: Math.random() * 360,
        transformOrigin: "50% 50%",
      });

      const spreadX = dir * (60 + Math.random() * 150);
      const upY = -(90 + Math.random() * 100);
      const fallY = upY + (150 + Math.random() * 90);
      const spin1 = 160 + Math.random() * 200;
      const spin2 = 160 + Math.random() * 200;

      gsapInstance.to(el, {
        keyframes: [
          {
            x: x + spreadX * 0.55,
            y: y + upY,
            rotation: `+=${spin1}`,
            duration: 0.45 + Math.random() * 0.15,
            ease: "power2.out",
          },
          {
            x: x + spreadX,
            y: y + fallY,
            opacity: 0,
            rotation: `+=${spin2}`,
            duration: 0.65 + Math.random() * 0.2,
            ease: "power1.in",
          },
        ],
        delay: Math.random() * 0.18,
        onComplete: () => el.remove(),
      });
    }
  });
}
