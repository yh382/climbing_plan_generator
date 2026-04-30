// src/components/ui/ActivityRing.tsx
// Apple Fitness-style activity ring — single ring, reusable unit.
// Gradient is distributed across the TOTAL arc length (including overlap),
// so the HEAD is always darkest and the TAIL always brightest regardless
// of loop count. See DualActivityRing for usage composing two rings.

import React from "react";
import Svg, { Circle, Path, G } from "react-native-svg";

// ─── Color helpers ──────────────────────────────────────────────

function parseColor(input: string): [number, number, number] {
  const m = input.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (m) return [+m[1], +m[2], +m[3]];
  const c = input.replace("#", "");
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
}

function rgbStr(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

export function interpolateColor(c1: string, c2: string, t: number) {
  const [r1, g1, b1] = parseColor(c1);
  const [r2, g2, b2] = parseColor(c2);
  return rgbStr(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function darken(hex: string, amt: number) {
  const [r, g, b] = parseColor(hex);
  return rgbStr(Math.max(0, r - amt * 255), Math.max(0, g - amt * 255), Math.max(0, b - amt * 255));
}

export function lighten(hex: string, amt: number) {
  const [r, g, b] = parseColor(hex);
  return rgbStr(Math.min(255, r + amt * 255), Math.min(255, g + amt * 255), Math.min(255, b + amt * 255));
}

// ─── Geometry ───────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  const a = angle - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, sa: number, ea: number) {
  const s = polarToXY(cx, cy, r, sa);
  const e = polarToXY(cx, cy, r, ea);
  const large = ea - sa > Math.PI ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── Gradient arc (arc drawn in segments, each with its own gradient t) ─────

function GradientArc({
  cx, cy, r, thickness,
  startAngle, endAngle,
  tStart, tEnd,
  colorStart, colorEnd,
  segments,
}: {
  cx: number; cy: number; r: number; thickness: number;
  startAngle: number; endAngle: number;
  tStart: number; tEnd: number;
  colorStart: string; colorEnd: string;
  segments: number;
}) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return null;

  const segSweep = sweep / segments;
  const extra = segSweep * 0.15;

  const paths: React.ReactElement[] = [];
  for (let i = 0; i < segments; i++) {
    const localT = i / segments;
    const globalT = tStart + (tEnd - tStart) * localT;
    const sa = startAngle + i * segSweep;
    const ea = Math.min(sa + segSweep + extra, endAngle + extra * 0.5);
    paths.push(
      <Path
        key={i}
        d={arcPath(cx, cy, r, sa, ea)}
        stroke={interpolateColor(colorStart, colorEnd, globalT)}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }
  return <>{paths}</>;
}

const BASE_SEGMENTS = 80;
const MIN_SEGMENTS = 64;

/** Head (starting) darken amount — smaller value = lighter head, less contrast.
 *  Apple Fitness original used ~0.18; 0.08 keeps the depth cue but removes the
 *  muddy-dark look at the 12-o'clock start. */
const HEAD_DARKEN = 0.08;
/** Tail (tip) lighten amount — paired with HEAD_DARKEN for the gradient band. */
const TAIL_LIGHTEN = 0.12;
/** Below this progress, the arc is too short to benefit from a gradient —
 *  render as a solid `color` stroke instead. Only applies to single-loop
 *  case (progress < 1 and no overlap stacking). */
const GRADIENT_MIN_PROGRESS = 0.15;

// ─── Low-level ring geometry (useful when composing dual rings in one Svg) ──

export function ActivityRingPath({
  cx, cy, r, thickness, progress, color, bgTrackColor,
}: {
  cx: number; cy: number; r: number; thickness: number;
  progress: number; color: string; bgTrackColor: string;
}) {
  if (progress <= 0) {
    return <Circle cx={cx} cy={cy} r={r} stroke={bgTrackColor} strokeWidth={thickness} fill="none" />;
  }

  const hasOverlap = progress > 1;

  // Short single-loop arcs: skip gradient to avoid the awkward dark-to-light
  // compression in a tiny sweep. Solid color reads cleaner.
  if (!hasOverlap && progress < GRADIENT_MIN_PROGRESS) {
    const totalAngle = progress * 2 * Math.PI;
    return (
      <G>
        <Circle cx={cx} cy={cy} r={r} stroke={bgTrackColor} strokeWidth={thickness} fill="none" />
        <Path
          d={arcPath(cx, cy, r, 0, totalAngle)}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
        />
      </G>
    );
  }

  const colorStart = darken(color, HEAD_DARKEN);
  const colorEnd = lighten(color, TAIL_LIGHTEN);

  if (!hasOverlap) {
    const totalAngle = progress * 2 * Math.PI;
    const segs = Math.max(MIN_SEGMENTS, Math.ceil(BASE_SEGMENTS * progress));
    return (
      <G>
        <Circle cx={cx} cy={cy} r={r} stroke={bgTrackColor} strokeWidth={thickness} fill="none" />
        <GradientArc
          cx={cx} cy={cy} r={r} thickness={thickness}
          startAngle={0} endAngle={totalAngle}
          tStart={0} tEnd={1}
          colorStart={colorStart} colorEnd={colorEnd}
          segments={segs}
        />
      </G>
    );
  }

  const tFirstEnd = 1 / progress;
  const overlapAngle = (progress % 1 === 0 ? 2 * Math.PI : (progress % 1) * 2 * Math.PI);

  const firstSegs = Math.max(MIN_SEGMENTS, Math.ceil(BASE_SEGMENTS * tFirstEnd * progress));
  const overlapSegs = Math.max(24, Math.ceil(BASE_SEGMENTS * (1 - tFirstEnd) * progress));

  const tipPos = polarToXY(cx, cy, r, overlapAngle);
  const shadowDx = -Math.cos(overlapAngle) * (thickness * 0.32);
  const shadowDy = -Math.sin(overlapAngle) * (thickness * 0.32);

  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} stroke={bgTrackColor} strokeWidth={thickness} fill="none" />
      <GradientArc
        cx={cx} cy={cy} r={r} thickness={thickness}
        startAngle={0} endAngle={2 * Math.PI - 0.001}
        tStart={0} tEnd={tFirstEnd}
        colorStart={colorStart} colorEnd={colorEnd}
        segments={firstSegs}
      />
      <Circle
        cx={tipPos.x + shadowDx}
        cy={tipPos.y + shadowDy}
        r={thickness / 2}
        fill="rgba(0,0,0,0.32)"
      />
      <GradientArc
        cx={cx} cy={cy} r={r} thickness={thickness}
        startAngle={0} endAngle={overlapAngle}
        tStart={tFirstEnd} tEnd={1}
        colorStart={colorStart} colorEnd={colorEnd}
        segments={overlapSegs}
      />
    </G>
  );
}

// ─── Standalone single ring (self-contained Svg) ─────────────────

export type ActivityRingProps = {
  size?: number;
  thickness?: number;
  progress: number;     // 0..N (overshoot supported, Apple Fitness-style)
  color: string;        // ring color (head darkened, tail lightened)
  bgTrackColor?: string;
};

export default function ActivityRing({
  size = 100,
  thickness = 12,
  progress,
  color,
  bgTrackColor = "rgba(0,0,0,0.08)",
}: ActivityRingProps) {
  const center = size / 2;
  const radius = (size - thickness) / 2;
  return (
    <Svg width={size} height={size}>
      <ActivityRingPath
        cx={center}
        cy={center}
        r={radius}
        thickness={thickness}
        progress={Math.max(0, progress)}
        color={color}
        bgTrackColor={bgTrackColor}
      />
    </Svg>
  );
}
