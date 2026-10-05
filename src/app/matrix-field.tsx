"use client";

import { useEffect, useRef } from "react";

type Dot = {
  x: number;
  y: number;
  size: number;
  base: number;
  phase: number;
  edge: boolean;
};

type Circuit = {
  base: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  pulse: HTMLCanvasElement;
  pulseCtx: CanvasRenderingContext2D;
};

const LIT = "rgba(255, 255, 255,";
const OFF = "rgba(255, 255, 255, 0.04)";
const KEEP = 0.58;
const KEEP_EDGE = 0.9;
const DOT_TIME_SCALE = 0.1;
const CIRCUIT_BASE = 0.28;
const CIRCUIT_PULSE = 0.92;

function makeCircuit(image: HTMLImageElement): Circuit | null {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const source = document.createElement("canvas");
  const interior = document.createElement("canvas");
  const base = document.createElement("canvas");
  const mask = document.createElement("canvas");
  const pulse = document.createElement("canvas");
  for (const canvas of [source, interior, base, mask, pulse]) {
    canvas.width = width;
    canvas.height = height;
  }

  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  const interiorCtx = interior.getContext("2d", { willReadFrequently: true });
  const baseCtx = base.getContext("2d");
  const maskCtx = mask.getContext("2d");
  const pulseCtx = pulse.getContext("2d");
  if (!sourceCtx || !interiorCtx || !baseCtx || !maskCtx || !pulseCtx) return null;

  sourceCtx.drawImage(image, 0, 0);
  interiorCtx.scale(width / 592, height / 592);
  interiorCtx.beginPath();
  interiorCtx.moveTo(297, 52);
  interiorCtx.bezierCurveTo(363, 105, 447, 156, 520, 202);
  interiorCtx.bezierCurveTo(482, 340, 398, 475, 297, 536);
  interiorCtx.bezierCurveTo(196, 475, 112, 340, 74, 202);
  interiorCtx.bezierCurveTo(147, 156, 231, 105, 297, 52);
  interiorCtx.fill();

  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  const inside = interiorCtx.getImageData(0, 0, width, height).data;
  const basePixels = baseCtx.createImageData(width, height);
  const maskPixels = maskCtx.createImageData(width, height);

  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    const traceCoverage = Math.max(0, Math.min(1, (170 - brightness) / 135));
    const alpha = (pixels[i + 3] * inside[i + 3] * traceCoverage) / 255;
    if (alpha < 2) continue;

    basePixels.data[i] = 0;
    basePixels.data[i + 1] = 201;
    basePixels.data[i + 2] = 80;
    basePixels.data[i + 3] = alpha * CIRCUIT_BASE;
    maskPixels.data[i] = 255;
    maskPixels.data[i + 1] = 255;
    maskPixels.data[i + 2] = 255;
    maskPixels.data[i + 3] = alpha;
  }

  baseCtx.putImageData(basePixels, 0, 0);
  maskCtx.putImageData(maskPixels, 0, 0);
  return { base, mask, pulse, pulseCtx };
}

export default function MatrixField({ src = "/ccs-logo.png" }: { src?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let reduceMotion = motionQuery.matches;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let shieldSize = 0;
    let shieldLeft = 0;
    let shieldTop = 0;
    let circuit: Circuit | null = null;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const cell = Math.max(11, Math.min(17, Math.round(width / 105)));
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      const sampler = document.createElement("canvas");
      sampler.width = cols;
      sampler.height = rows;
      const sampleCtx = sampler.getContext("2d", { willReadFrequently: true });
      if (!sampleCtx) return false;

      // Sample the logo once onto the same grid as the dots. Its opaque shield
      // becomes empty space; every cell outside it belongs to one continuous field.
      if (image.naturalWidth) {
        shieldSize = Math.min(
          1080,
          width <= 640 ? width * 1.5 : width * 1.1,
          height * 0.96,
        );
        shieldLeft = (width - shieldSize) / 2;
        shieldTop = (height - shieldSize) / 2;
        circuit ??= makeCircuit(image);
        sampleCtx.drawImage(
          image,
          shieldLeft / cell,
          shieldTop / cell,
          shieldSize / cell,
          shieldSize / cell,
        );
      }
      const { data } = sampleCtx.getImageData(0, 0, cols, rows);
      const alpha = (x: number, y: number) =>
        x < 0 || y < 0 || x >= cols || y >= rows
          ? 0
          : data[(y * cols + x) * 4 + 3];
      dots = [];

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (alpha(x, y) > 40) continue;

          let edge = false;
          for (let dy = -1; dy <= 1 && !edge; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (alpha(x + dx, y + dy) > 40) {
                edge = true;
                break;
              }
            }
          }
          if (Math.random() > (edge ? KEEP_EDGE : KEEP)) continue;

          dots.push({
            x: x * cell + cell * 0.34,
            y: y * cell + cell * 0.34,
            size: cell * 0.32,
            base: 0.12 + Math.pow(Math.random(), 1.7) * 0.88,
            phase: Math.random() * Math.PI * 2,
            edge,
          });
        }
      }
      return true;
    };

    const draw = (time: number) => {
      if (disposed) return;
      ctx.clearRect(0, 0, width, height);
      const dotTime = time * DOT_TIME_SCALE;

      for (const dot of dots) {
        const wave =
          Math.sin(dotTime * 0.0016 + dot.phase) * 0.5 +
          Math.sin(dotTime * 0.0007 + dot.phase * 2.3) * 0.5;
        const blink =
          Math.sin(dotTime * 0.011 + dot.phase * 5.7) > 0.94
            ? 0.25
            : Math.sin(dotTime * 0.0034 + dot.phase * 2.1) > 0.86
              ? 0.55
              : 1;
        const level =
          (reduceMotion ? dot.base * 0.7 : dot.base * (0.62 + wave * 0.38) * blink) *
          (dot.edge ? 1.2 : 1);

        ctx.fillStyle =
          level < 0.12 ? OFF : `${LIT}${(0.1 + Math.min(1, level) * 0.59).toFixed(3)})`;
        ctx.fillRect(dot.x, dot.y, dot.size, dot.size);
      }

      if (circuit) {
        ctx.drawImage(circuit.base, shieldLeft, shieldTop, shieldSize, shieldSize);
        if (!reduceMotion) {
          const { pulse, pulseCtx, mask } = circuit;
          const sweep = ((time * 0.14) % (pulse.height + 240)) - 120;
          pulseCtx.clearRect(0, 0, pulse.width, pulse.height);
          const light = pulseCtx.createLinearGradient(0, sweep - 120, 0, sweep + 120);
          light.addColorStop(0, "rgba(0, 201, 80, 0)");
          light.addColorStop(0.5, `rgba(0, 201, 80, ${CIRCUIT_PULSE})`);
          light.addColorStop(1, "rgba(0, 201, 80, 0)");
          pulseCtx.fillStyle = light;
          pulseCtx.fillRect(0, 0, pulse.width, pulse.height);
          pulseCtx.globalCompositeOperation = "destination-in";
          pulseCtx.drawImage(mask, 0, 0);
          pulseCtx.globalCompositeOperation = "source-over";
          ctx.drawImage(pulse, shieldLeft, shieldTop, shieldSize, shieldSize);
        }
      }

      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    const render = () => {
      if (disposed) return;
      window.cancelAnimationFrame(frame);
      if (!build()) return;
      if (reduceMotion) draw(0);
      else frame = window.requestAnimationFrame(draw);
    };

    const onMotionChange = () => {
      reduceMotion = motionQuery.matches;
      render();
    };
    const onResize = () => {
      if (image.complete) render();
    };

    image.onload = render;
    image.onerror = render;
    image.src = src;
    if (image.complete) render();
    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      image.onload = null;
      image.onerror = null;
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, [src]);

  return <canvas ref={canvasRef} className="matrix-field" aria-hidden="true" />;
}
