import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const C = {
  ink: "#1E1E1E",
  muted: "#6B6B6B",
  faint: "#9A9A9A",
  line: "#E6E6E6",
  ui: "#F5F5F5",
  black: "#0B0B0B",
  orange: "#F97316",
};

export const PRODUCT = "Storyboard";

// Spring from 0 to 1 starting at `delay` frames.
export const useIn = (delay = 0, damping = 18, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping }, durationInFrames });
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Characters of `text` revealed between frames `from` and `to`.
export const typed = (text: string, frame: number, from: number, to: number) =>
  text.slice(0, Math.round(interpolate(frame, [from, to], [0, text.length], clamp)));

export const Caret: React.FC<{ color?: string }> = ({ color = C.ink }) => {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        display: "inline-block",
        width: 3,
        height: "1em",
        marginLeft: 2,
        verticalAlign: "-0.12em",
        background: color,
        opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0,
      }}
    />
  );
};

// Big headline above the UI in each scene.
export const Headline: React.FC<{ children: React.ReactNode; dark?: boolean; delay?: number }> = ({
  children,
  dark,
  delay = 0,
}) => {
  const p = useIn(delay);
  return (
    <div
      style={{
        position: "absolute",
        top: 110,
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 64,
        fontWeight: 600,
        letterSpacing: -1.8,
        color: dark ? "#fff" : C.ink,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Scene: React.FC<{ bg?: string; children: React.ReactNode }> = ({ bg = C.ui, children }) => (
  <AbsoluteFill style={{ background: bg, fontFamily, color: C.ink }}>{children}</AbsoluteFill>
);

// macOS-like arrow pointer. `press` (0..1) shrinks it for a click.
export const Cursor: React.FC<{ x: number; y: number; press?: number; opacity?: number }> = ({
  x,
  y,
  press = 0,
  opacity = 1,
}) => (
  <svg
    width={44}
    height={44}
    viewBox="0 0 24 24"
    style={{
      position: "absolute",
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - press * 0.18})`,
      transformOrigin: "4px 3px",
      filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))",
      zIndex: 10,
    }}
  >
    <path d="M4 3l14.5 8.2-6.3 1.5-3 5.8z" fill="#000" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

// Cursor path: list of [frame, x, y] keyframes, eased between.
export const cursorAt = (frame: number, keys: [number, number, number][]) => {
  const t = keys.map((k) => k[0]);
  const opts = { ...clamp, easing: (v: number) => 1 - Math.pow(1 - v, 3) };
  return {
    x: interpolate(frame, t, keys.map((k) => k[1]), opts),
    y: interpolate(frame, t, keys.map((k) => k[2]), opts),
  };
};

// Click pulse: 0 → 1 → 0 around frame `at`.
export const pressAt = (frame: number, at: number) =>
  interpolate(frame, [at - 3, at, at + 5], [0, 1, 0], clamp);

// A window onto one of the 1440×900 screen recordings, zoomed `zoom`× around (cx, cy)
// and pushing in slowly to `zoomTo`.
export const ScreenClip: React.FC<{
  src: string;
  start: number;
  cx: number;
  cy: number;
  zoom: number;
  zoomTo?: number;
  to?: [number, number];
  caption: string;
}> = ({ src, start, cx, cy, zoom, zoomTo = zoom * 1.06, to, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const W = 1600;
  const H = 1000;
  const k = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const z = interpolate(k, [0, 1], [zoom, zoomTo]);
  const x = to ? interpolate(k, [0, 1], [cx, to[0]]) : cx;
  const y = to ? interpolate(k, [0, 1], [cy, to[1]]) : cy;
  const s = (W / 1440) * z;
  const tx = Math.min(0, Math.max(W - 1440 * s, W / 2 - x * s));
  const ty = Math.min(0, Math.max(H - 900 * s, H / 2 - y * s));
  const cap = useIn(10);
  return (
    <Scene>
      <div
        style={{
          position: "absolute",
          left: (1920 - W) / 2,
          top: 1080 - H - 20,
          width: W,
          height: H,
          borderRadius: 24,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1440,
            height: 900,
            transformOrigin: "0 0",
            transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          }}
        >
          <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(start * fps)} muted style={{ width: 1440, height: 900 }} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: cap,
          transform: `translateY(${(1 - cap) * 20}px)`,
        }}
      >
        <div
          style={{
            background: C.ink,
            color: "#fff",
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: -0.8,
            padding: "22px 40px",
            borderRadius: 999,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          }}
        >
          {caption}
        </div>
      </div>
    </Scene>
  );
};
