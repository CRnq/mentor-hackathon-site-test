import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  z: number;
  ink: boolean;
  edge: boolean;
  glyph: string;
};
const glyphs = [".", "~", ";", "+", "#", "$"];

/** Sample the original artwork; project its raised ink and square base as ASCII. */
export function AsciiLogo({
  active = true,
  compact = false,
}: {
  active?: boolean;
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const host = root.current;
    const surface = canvas.current;
    const logo = source.current;
    if (!host || !surface || !logo) return;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    const resolution = compact ? 40 : host.clientWidth < 420 ? 64 : 88;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let frame = 0;
    let points: Point[] = [];
    let width = 0;
    let height = 0;
    let started = 0;
    let angleX = -0.12;
    let angleY = -0.24;
    let targetX = angleX;
    let targetY = angleY;
    let previous = 0;

    const draw = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || !points.length) return;
      if (now - previous < 30) {
        frame = requestAnimationFrame(draw);
        return;
      }
      previous = now;
      const progress = !active
        ? 0
        : motion.matches || compact
          ? 1
          : Math.min((now - started) / 1400, 1);
      angleX += (targetX - angleX) * 0.16;
      angleY += (targetY - angleY) * 0.16;
      ctx.clearRect(0, 0, width, height);
      const unit = (Math.min(width, height) * 0.84) / resolution;
      const project = (point: Point, depth: number) => {
        const x = point.x * Math.cos(angleY) + depth * Math.sin(angleY);
        const z = -point.x * Math.sin(angleY) + depth * Math.cos(angleY);
        const y = point.y * Math.cos(angleX) - z * Math.sin(angleX);
        const perspective =
          240 / (240 - (point.y * Math.sin(angleX) + z * Math.cos(angleX)));
        return {
          x: width / 2 + x * unit * perspective,
          y: height / 2 + y * unit * perspective,
        };
      };
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.max(2, unit * 1.35)}px monospace`;
      // Only contour cells form the extrusion; the front remains legible.
      for (const depth of [-14, -10, -6]) {
        ctx.fillStyle = "#111318";
        ctx.globalAlpha = 0.25;
        for (const point of points) {
          if (!point.edge || (point.y + resolution / 2) / resolution > progress)
            continue;
          const p = project(point, depth);
          ctx.fillText(depth === -14 ? "." : "+", p.x, p.y);
        }
      }
      for (const point of points) {
        const row = (point.y + resolution / 2) / resolution;
        if (row > progress) continue;
        const p = project(point, point.z);
        const forming =
          !motion.matches && !compact && progress < 1 && row > progress - 0.1;
        ctx.globalAlpha = forming ? 0.55 : 1;
        ctx.fillStyle = point.ink ? "#111318" : "#4EC5E5";
        ctx.fillText(
          forming
            ? glyphs[
                ((Math.floor(now / 70 + point.x) % glyphs.length) +
                  glyphs.length) %
                  glyphs.length
              ]
            : point.glyph,
          p.x,
          p.y,
        );
      }
      ctx.globalAlpha = 1;
      if (
        active &&
        !motion.matches &&
        (progress < 1 ||
          Math.abs(targetX - angleX) + Math.abs(targetY - angleY) > 0.001)
      ) {
        frame = requestAnimationFrame(draw);
      }
    };
    const requestDraw = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      requestDraw();
    };
    const move = (event: PointerEvent) => {
      if (motion.matches || compact || event.pointerType === "touch") return;
      const bounds = host.getBoundingClientRect();
      targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.6;
      targetX = -((event.clientY - bounds.top) / bounds.height - 0.5) * 0.36;
      requestDraw();
    };
    const reset = () => {
      targetX = -0.12;
      targetY = -0.24;
      requestDraw();
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else requestDraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", reset);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", reset);

    void logo
      .decode()
      .then(() => {
        if (disposed) return;
        const sample = document.createElement("canvas");
        sample.width = sample.height = resolution;
        const sampling = sample.getContext("2d", { willReadFrequently: true });
        if (!sampling) return;
        sampling.drawImage(logo, 0, 0, resolution, resolution);
        const pixels = sampling.getImageData(0, 0, resolution, resolution).data;
        const solid = (x: number, y: number) =>
          x >= 0 &&
          y >= 0 &&
          x < resolution &&
          y < resolution &&
          pixels[(y * resolution + x) * 4 + 3] > 100;
        points = [];
        for (let y = 0; y < resolution; y++)
          for (let x = 0; x < resolution; x++) {
            if (!solid(x, y)) continue;
            const offset = (y * resolution + x) * 4;
            const brightness =
              (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
            const ink = brightness < 105;
            points.push({
              x: x - resolution / 2,
              y: y - resolution / 2,
              z: ink ? 5 : 0,
              ink,
              edge:
                !solid(x - 1, y) ||
                !solid(x + 1, y) ||
                !solid(x, y - 1) ||
                !solid(x, y + 1),
              glyph: ink
                ? (x + y) % 3 === 0
                  ? "$"
                  : "#"
                : [".", "~", ";", "+"][(x * 7 + y * 3) % 4],
            });
          }
        host.dataset.ready = "true";
        started = performance.now();
        resize();
      })
      .catch(() => {
        /* Keep the original SVG visible if sampling is unavailable. */
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", reset);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", reset);
    };
  }, [active, compact]);

  return (
    <div
      ref={root}
      className={`ascii-logo${compact ? " ascii-logo-compact" : ""}`}
    >
      <img
        ref={source}
        src="/logo_block_color.svg"
        alt="全国メンターハッカソン — ASCII立体ロゴ"
        className="ascii-logo-source"
      />
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
