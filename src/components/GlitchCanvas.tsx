import { useEffect, useRef } from "react";

type NoiseZone = {
  side: "left" | "right";
  y: number;
  w: number;
  h: number;
  strength: number;
};
// Fractions of the hero: asymmetric edge clusters leave the logo and dates clear.
const zones: NoiseZone[] = [
  { side: "left", y: 0.075, w: 0.12, h: 0.17, strength: 1 },
  { side: "left", y: 0.49, w: 0.055, h: 0.16, strength: 0.95 },
  { side: "left", y: 0.88, w: 0.13, h: 0.12, strength: 0.8 },
  { side: "right", y: 0.065, w: 0.09, h: 0.14, strength: 0.75 },
  { side: "right", y: 0.43, w: 0.045, h: 0.12, strength: 0.65 },
  { side: "right", y: 0.84, w: 0.16, h: 0.14, strength: 1 },
];
const palette = {
  ink: "#111318",
  cyan: "#4EC5E5",
  paper: "#F6F5EF",
  pale: "#D3EDF3",
};
const noise = {
  seed: 20261109,
  pixelSizeMultiplier: 1.5,
  blocks: { cell: 1, density: 0.97 },
  strips: { count: 14, minLength: 0.18, maxLength: 0.75, maxHeight: 10 },
  fragments: { count: 1800, maxSize: 2 },
  fine: { count: 3200, maxSize: 0.8 },
};

function makeRng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** Paint only once per resize. No React state or thousands of DOM nodes. */
export function GlitchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const { width, height } = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const rng = makeRng(noise.seed);
      const scale = Math.max(0.6, Math.min(width / 1200, 1.5));
      const hostBounds = host.getBoundingClientRect();
      const clearAreas = Array.from(
        host.querySelectorAll(".hero-note, .hero-dates, .hero-right"),
      ).map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left - hostBounds.left - 10,
          top: bounds.top - hostBounds.top - 24,
          right: bounds.right - hostBounds.left + 10,
          bottom: bounds.bottom - hostBounds.top + 10,
        };
      });
      let drawingSide: "left" | "right" = "left";
      let drawingTop = 0;
      const pixel = (
        x: number,
        y: number,
        size: number,
        color: string,
        alpha: number,
      ) => {
        const edge =
          (Math.max(1, Math.round(size * dpr)) / dpr) *
          noise.pixelSizeMultiplier;
        const globalX = drawingSide === "left" ? x : width - x - edge;
        const globalY = drawingTop + y;
        if (
          clearAreas.some(
            (area) =>
              globalX + edge > area.left &&
              globalX < area.right &&
              globalY + edge > area.top &&
              globalY < area.bottom,
          )
        )
          return;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(
          Math.round(x * dpr) / dpr,
          Math.round(y * dpr) / dpr,
          edge,
          edge,
        );
      };

      zones.forEach(({ side, y, w, h, strength }) => {
        const zw = width * w;
        const zh = height * h;
        const top = height * y;
        drawingSide = side;
        drawingTop = top;
        // Work inward from either edge. Clip every layer to its configured zone.
        ctx.save();
        ctx.translate(side === "left" ? 0 : width, top);
        ctx.scale(side === "left" ? 1 : -1, 1);
        ctx.beginPath();
        ctx.rect(0, 0, zw, zh);
        ctx.clip();
        const cell = noise.blocks.cell * scale;
        // Coarse seeded fields form torn islands; only square ink pixels are painted.
        const field = (x: number, y: number, salt: number) => {
          let value =
            Math.imul(x + 17, 374761393) ^
            Math.imul(y + salt, 668265263) ^
            noise.seed;
          value = Math.imul(value ^ (value >>> 13), 1274126177);
          return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
        };
        const reach = (row: number) => zw * (0.28 + field(0, row, 71) * 0.48);
        const pitch = 14 * scale;
        for (let py = 0; py < zh; py += cell) {
          const row = Math.floor(py / pitch);
          const boundary = reach(row);
          const vertical = Math.sin((Math.PI * py) / zh) ** 0.4;
          for (let px = 0; px < boundary; px += cell) {
            const block = field(Math.floor(px / pitch), row, 19);
            const edge = px / boundary;
            // Large empty breaks and dense cores prevent uniform television static.
            const coverage = block > 0.38 ? 0.96 : block > 0.23 ? 0.35 : 0.015;
            if (
              rng() >
              coverage * noise.blocks.density * vertical * (1 - edge ** 4 * 0.8)
            )
              continue;
            const color = block > 0.91 ? palette.cyan : palette.ink;
            pixel(px, py, cell, color, 0.85 + rng() * 0.15);
          }
        }

        // Horizontal glitches are broken rows of square pixels, never solid bars.
        for (let i = 0; i < noise.strips.count * strength; i++) {
          const py = Math.floor((rng() * zh) / cell) * cell;
          const px = Math.floor((rng() * zw * 0.25) / cell) * cell;
          const length =
            zw *
            (noise.strips.minLength +
              rng() * (noise.strips.maxLength - noise.strips.minLength));
          const stripCell = Math.max(1, 2 * scale);
          const rows = Math.max(
            1,
            Math.round((rng() * noise.strips.maxHeight * scale) / stripCell),
          );
          for (let row = 0; row < rows; row++) {
            const offset = Math.floor(rng() * 5) * cell;
            for (let dx = 0; dx < length; dx += stripCell) {
              if (rng() < 0.16 + (0.4 * dx) / length) continue;
              const color =
                rng() < 0.16
                  ? palette.paper
                  : i % 3 === 0
                    ? palette.cyan
                    : palette.ink;
              pixel(
                px + dx + offset,
                py + row * stripCell,
                stripCell,
                color,
                0.65 + rng() * 0.35,
              );
            }
          }
        }

        // Pixel Fragments: debris follows the block boundary instead of filling a box.
        for (let i = 0; i < noise.fragments.count * strength; i++) {
          const py = rng() * zh;
          const boundary = reach(Math.floor(py / pitch));
          const px = boundary + (rng() - 0.3) * zw * 0.48;
          const size = (0.6 + rng() ** 2 * noise.fragments.maxSize) * scale;
          pixel(
            px,
            py,
            size,
            rng() < 0.45 ? palette.cyan : palette.ink,
            0.35 + rng() * 0.6,
          );
        }

        // Fine Noise: crisp ink flecks and eroded highlights; no blur or gradient.
        for (let i = 0; i < noise.fine.count * strength; i++) {
          const px = rng() * zw;
          const py = rng() * zh;
          if (rng() < (px / zw) * 0.8) continue;
          const inside = px < reach(Math.floor(py / pitch));
          const size = (0.4 + rng() * noise.fine.maxSize) * scale;
          pixel(
            px,
            py,
            size,
            inside ? (rng() < 0.2 ? palette.pale : palette.paper) : palette.ink,
            inside ? 0.2 + rng() * 0.35 : 0.15 + rng() * 0.4,
          );
        }
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    };

    const observer = new ResizeObserver(render);
    observer.observe(host);
    render();
    return () => observer.disconnect();
  }, []);

  return (
    <canvas ref={canvasRef} className="glitch-canvas" aria-hidden="true" />
  );
}
