import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  C,
  Caret,
  clamp,
  Cursor,
  cursorAt,
  Headline,
  pressAt,
  PRODUCT,
  Scene,
  typed,
  useIn,
} from "./ui";

const ARC = ["Introduction", "Demo", "Features", "Build", "Outro"];

// 1. Title: the pitch, and a storyboard strip whose gaps are the cuts.
export const Title: React.FC = () => {
  const words = ["Motion,", "edited", "as a", "storyboard."];
  return (
    <Scene bg={C.black}>
      <div
        style={{
          position: "absolute",
          top: 300,
          width: "100%",
          textAlign: "center",
          fontSize: 120,
          fontWeight: 600,
          letterSpacing: -4,
          color: "#fff",
        }}
      >
        {words.map((w, i) => {
          const p = useIn(4 + i * 5, 16);
          return (
            <span
              key={w}
              style={{
                display: "inline-block",
                margin: "0 16px",
                opacity: p,
                transform: `translateY(${(1 - p) * 50}px)`,
                color: i === 3 ? C.orange : "#fff",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 600, width: "100%", display: "flex", justifyContent: "center", gap: 40 }}>
        {ARC.map((name, i) => {
          const p = useIn(30 + i * 4, 15);
          return (
            <div key={name} style={{ opacity: p, transform: `translateX(${(1 - p) * 80}px)` }}>
              <div
                style={{
                  width: 240,
                  height: 150,
                  borderRadius: 14,
                  background: i === 1 ? "#26262B" : "#1A1A1E",
                  border: "1.5px solid #2E2E34",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", left: 20, top: 22, width: 90 + (i % 3) * 30, height: 14, borderRadius: 7, background: "#3A3A42" }} />
                <div style={{ position: "absolute", left: 20, top: 48, width: 60, height: 10, borderRadius: 5, background: "#2E2E34" }} />
                <div style={{ position: "absolute", right: 18, bottom: 18, width: 70, height: 50, borderRadius: 8, background: i === 2 ? C.orange : "#2E2E34" }} />
              </div>
              <div style={{ marginTop: 16, fontSize: 24, color: "#8A8A90", fontWeight: 500 }}>{name}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// 2. Prompt: type the outline into the agent input, then send.
const PROMPT = "figma.com/config — a 60s launch reel: Intro, Sites, Make, Draw, Buzz, Outro";

export const Prompt: React.FC = () => {
  const frame = useCurrentFrame();
  const box = useIn(4);
  const text = typed(PROMPT, frame, 18, 78);
  const sendAt = 98;
  const sent = useIn(sendAt + 4, 20);
  const cur = cursorAt(frame, [
    [0, 1500, 980],
    [80, 1500, 980],
    [95, 1428, 648],
  ]);
  return (
    <Scene>
      <Headline>Describe the reel.</Headline>
      <div
        style={{
          position: "absolute",
          left: 360,
          top: 400,
          width: 1200,
          height: 300,
          background: "#fff",
          borderRadius: 32,
          border: `2px solid ${C.line}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          opacity: box * (1 - sent),
          transform: `translateY(${(1 - box) * 40 - sent * 60}px) scale(${1 - sent * 0.06})`,
        }}
      >
        <div style={{ position: "absolute", left: 44, top: 40, right: 44, fontSize: 44, lineHeight: 1.3, letterSpacing: -0.6 }}>
          {text ? (
            <>
              {text}
              <Caret />
            </>
          ) : (
            <span style={{ color: C.faint }}>Plan, Build, / for skills, @ for context</span>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            left: 36,
            bottom: 32,
            width: 72,
            height: 72,
            borderRadius: 36,
            border: `2px solid ${C.line}`,
            display: "grid",
            placeItems: "center",
            fontSize: 44,
            color: C.muted,
            fontWeight: 300,
          }}
        >
          +
        </div>
        <div
          style={{
            position: "absolute",
            right: 36,
            bottom: 32,
            width: 80,
            height: 80,
            borderRadius: 40,
            background: C.ink,
            display: "grid",
            placeItems: "center",
            transform: `scale(${1 - pressAt(frame, sendAt) * 0.12})`,
          }}
        >
          <svg width={40} height={40} viewBox="0 0 24 24">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <Cursor x={cur.x} y={cur.y} press={pressAt(frame, sendAt)} opacity={interpolate(frame, [70, 80, 110, 118], [0, 1, 1, 0], clamp)} />
    </Scene>
  );
};

// 3. Agent: working steps check off, screens pop in, the arc is outlined.
const Step: React.FC<{ start: number; done: number; title: string; sub: React.ReactNode; children?: React.ReactNode }> = ({
  start,
  done,
  title,
  sub,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = useIn(start);
  const isDone = frame >= done;
  const check = useIn(done, 12);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 20}px)`, display: "flex", gap: 22, marginTop: 34 }}>
      <div style={{ width: 34, height: 34, marginTop: 4, flexShrink: 0, position: "relative" }}>
        {isDone ? (
          <div style={{ width: 34, height: 34, borderRadius: 17, background: C.ink, display: "grid", placeItems: "center", transform: `scale(${0.6 + check * 0.4})` }}>
            <svg width={20} height={20} viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <svg width={34} height={34} viewBox="0 0 34 34" style={{ transform: `rotate(${frame * 12}deg)` }}>
            <circle cx={17} cy={17} r={14} stroke={C.line} strokeWidth={3.5} fill="none" />
            <path d="M17 3a14 14 0 0 1 14 14" stroke={C.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 500, color: isDone ? C.ink : C.muted }}>{title}</div>
        <div style={{ fontSize: 26, color: C.faint, marginTop: 6 }}>{sub}</div>
        {children}
      </div>
    </div>
  );
};

const SHOTS = ["sites-hero", "make-gallery", "draw-poster", "buzz-grid", "sites-breakpoints"];

export const Agent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = useIn(2);
  return (
    <Scene>
      <Headline>It reads your site and drafts the story.</Headline>
      <div style={{ position: "absolute", left: 420, top: 270, width: 1080 }}>
        <div style={{ fontSize: 34, lineHeight: 1.4, opacity: intro, transform: `translateY(${(1 - intro) * 20}px)` }}>
          On it. I'll read your site, pull screens of the product, and draft a storyboard from your outline.
        </div>
        <Step start={10} done={34} title="Reading your site" sub="Pages, product copy and features" />
        <Step start={36} done={92} title="Capturing screens" sub="5 screens at 1440 × 900">
          <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
            {SHOTS.map((s, i) => {
              const p = spring({ frame: frame - (44 + i * 8), fps, config: { damping: 13 } });
              return (
                <Img
                  key={s}
                  src={staticFile(`shots/${s}.svg`)}
                  style={{
                    width: 176,
                    height: 110,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: `1.5px solid ${C.line}`,
                    opacity: Math.min(1, p * 1.5),
                    transform: `scale(${0.6 + p * 0.4})`,
                  }}
                />
              );
            })}
          </div>
        </Step>
        <Step
          start={96}
          done={140}
          title="Outlining the narrative arc"
          sub={ARC.map((a, i) => (
            <span key={a} style={{ opacity: interpolate(frame, [102 + i * 7, 108 + i * 7], [0, 1], clamp) }}>
              {i > 0 ? " → " : ""}
              {a}
            </span>
          ))}
        />
      </div>
    </Scene>
  );
};

// 4. Question card: approve the storyboard.
export const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useIn(2);
  const clickAt = 62;
  const hover = interpolate(frame, [36, 44], [0, 1], clamp);
  const chosen = frame >= clickAt + 2;
  const cur = cursorAt(frame, [
    [0, 1560, 1000],
    [10, 1560, 1000],
    [44, 1180, 538],
  ]);
  const rows: [React.ReactNode, string, string?][] = [
    ["1", "Yes, continue", "→"],
    ["2", "No, request changes"],
    ["✎", "Something else", "Skip"],
  ];
  return (
    <Scene>
      <Headline>You approve before it animates.</Headline>
      <div
        style={{
          position: "absolute",
          left: 510,
          top: 340,
          width: 900,
          background: "#fff",
          borderRadius: 28,
          border: `2px solid ${C.line}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          padding: "34px 26px 22px",
          opacity: card,
          transform: `translateY(${(1 - card) * 40}px)`,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 600, padding: "0 12px 22px" }}>Does this storyboard look right?</div>
        {rows.map(([key, label, right], i) => {
          const first = i === 0;
          const bg = first ? (chosen ? C.ink : `rgba(243,244,246,${hover})`) : "transparent";
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                height: 84,
                padding: "0 14px",
                borderRadius: 16,
                background: bg,
                color: first && chosen ? "#fff" : first ? C.ink : C.muted,
                fontSize: 32,
                borderTop: i === 2 ? `1.5px solid #F0F0F0` : undefined,
                transform: first ? `scale(${1 - pressAt(frame, clickAt) * 0.03})` : undefined,
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 24,
                  background: first && chosen ? "#3A3A3A" : first && hover > 0.5 ? "#E5E7EB" : C.ui,
                }}
              >
                {key}
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              {right === "Skip" ? (
                <span style={{ fontSize: 24, background: C.ui, padding: "8px 16px", borderRadius: 10 }}>Skip</span>
              ) : right ? (
                <span style={{ opacity: first ? Math.max(hover, 0.4) : 1 }}>{chosen ? "✓" : right}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <Cursor x={cur.x} y={cur.y} press={pressAt(frame, clickAt)} opacity={interpolate(frame, [8, 16], [0, 1], clamp)} />
    </Scene>
  );
};

// 5. Annotate: point at the phone, say what to change, and it changes.
const Phone: React.FC = () => (
  <div style={{ width: 300, height: 600, borderRadius: 40, background: "#2B2522", padding: "22px 22px", color: "#fff", position: "relative" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600 }}>
      <span>9:41</span>
      <span style={{ width: 40, height: 12, borderRadius: 4, background: "#fff", opacity: 0.8 }} />
    </div>
    <div style={{ marginTop: 74, fontSize: 26, fontWeight: 600 }}>Inbox</div>
    <div style={{ display: "flex", gap: 30, marginTop: 18 }}>
      {[C.orange, "#6E6660"].map((c) => (
        <div key={c}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
          <div style={{ width: 70, height: 6, borderRadius: 3, background: "#4A423E", marginTop: 8 }} />
        </div>
      ))}
    </div>
    <div style={{ marginTop: 40, fontSize: 11, letterSpacing: 2, color: "#8A807A" }}>FAVORITES</div>
    {[110, 90, 130, 100, 120].map((w, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: "#C9BFB8" }} />
        <div style={{ width: w, height: 8, borderRadius: 4, background: "#5A514C" }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 8, height: 8, borderTop: "2px solid #6E6660", borderRight: "2px solid #6E6660", transform: "rotate(45deg)" }} />
      </div>
    ))}
    <div
      style={{
        position: "absolute",
        right: 80,
        top: 56,
        width: 64,
        height: 64,
        borderRadius: 32,
        background: C.orange,
        display: "grid",
        placeItems: "center",
        fontSize: 40,
        fontWeight: 300,
        boxShadow: "0 0 0 3px #fff",
      }}
    >
      +
    </div>
  </div>
);

export const Annotate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const panel = useIn(0);
  const select = interpolate(frame, [18, 24], [0, 1], clamp);
  const pop = useIn(26, 16);
  const attachAt = 96;
  const applied = frame >= attachAt + 6;
  const popOut = interpolate(frame, [attachAt + 4, attachAt + 12], [0, 1], clamp);
  const grow = spring({ frame: frame - (attachAt + 10), fps, config: { damping: 9, stiffness: 120 } });
  const note = typed("make it bigger", frame, 44, 72);
  const cur = cursorAt(frame, [
    [0, 980, 980],
    [16, 640, 560],
    [80, 640, 560],
    [92, 1588, 717],
  ]);
  return (
    <Scene>
      <Headline>Point at anything. Say what to change.</Headline>
      <div
        style={{
          position: "absolute",
          left: 260,
          top: 270,
          width: 760,
          height: 720,
          borderRadius: 28,
          background: "#F7B9EE",
          opacity: panel,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", transform: `scale(${1 + grow * 0.14})` }}>
          <Phone />
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 46,
              border: `4px dashed ${C.orange}`,
              opacity: select * (applied ? 1 - interpolate(frame, [attachAt + 30, attachAt + 40], [0, 1], clamp) : 1),
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -8,
              top: -52,
              background: C.orange,
              color: "#fff",
              fontSize: 26,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: "10px 10px 10px 0",
              opacity: select * (applied ? 1 - interpolate(frame, [attachAt + 30, attachAt + 40], [0, 1], clamp) : 1),
            }}
          >
            Phone
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1080,
          top: 400,
          width: 620,
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 24px 70px rgba(0,0,0,0.16)",
          padding: 30,
          opacity: pop * (1 - popOut),
          transform: `translateY(${(1 - pop) * 30}px) scale(${0.96 + pop * 0.04})`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 600, color: C.orange }}>Frame 2 › Phone</div>
        <div
          style={{
            marginTop: 20,
            height: 150,
            borderRadius: 14,
            border: `2.5px solid ${C.orange}`,
            padding: "18px 20px",
            fontSize: 30,
            color: note ? C.ink : C.faint,
          }}
        >
          {note ? (
            <>
              {note}
              <Caret />
            </>
          ) : (
            'e.g. bigger, move left, fade, "new text"'
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 30, marginTop: 24, fontSize: 28 }}>
          <span style={{ color: C.muted }}>Cancel</span>
          <span
            style={{
              background: C.ink,
              color: "#fff",
              padding: "14px 26px",
              borderRadius: 14,
              fontWeight: 600,
              transform: `scale(${1 - pressAt(frame, attachAt) * 0.08})`,
            }}
          >
            Attach
          </span>
        </div>
      </div>
      <Cursor x={cur.x} y={cur.y} press={pressAt(frame, 20) + pressAt(frame, attachAt)} opacity={interpolate(frame, [4, 12], [0, 1], clamp)} />
    </Scene>
  );
};

// 6. Outro.
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const a = useIn(4);
  const b = useIn(14);
  const mark = useIn(46, 14);
  const lift = interpolate(frame, [40, 60], [0, -70], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <Scene bg={C.black}>
      <div style={{ position: "absolute", top: 380 + lift, width: "100%", textAlign: "center", fontSize: 96, fontWeight: 600, letterSpacing: -3 }}>
        <div style={{ color: "#fff", opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>From prompt to reel.</div>
        <div style={{ color: "#7A7A80", opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>Without a timeline.</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 760,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
          opacity: mark,
          transform: `scale(${0.9 + mark * 0.1})`,
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.orange }} />
        <div style={{ color: "#fff", fontSize: 52, fontWeight: 700, letterSpacing: -1.5 }}>{PRODUCT}</div>
      </div>
    </Scene>
  );
};
