# Sequence: storyboard editor (hackathon prototype)

Turns a product into a launch video, edited as a **storyboard of frames** with an
agent beside it. Everything the "AI" does is mocked and scripted. It gets
screen-recorded for the submission, so polish beats real back-end functionality.

This folder is its own git repo (`svsd`). The older Present-mode prototype in the
parent folder is a separate app and is not described here.

## Commands

- `npm run dev`: Vite dev server (launch.json uses port 5174)
- `npm run build`: typecheck (`tsc --noEmit`) + build
- `npm run capture` / `npm run record`: Playwright scripts that make screenshots and recordings for the demo

## Stack

Vite + React 19 + TypeScript · Tailwind v4 (`src/index.css` `@theme` tokens) ·
`motion/react` (never `framer-motion`) · `@dnd-kit` for frame reordering. State is
`useReducer` in `src/context.tsx` + `src/store.ts` (no Zustand). No backend, in memory only.

## The flow (`State.phase`)

`empty → drafting → review ⇄ comments → animating → ready`

1. **empty**: `editor/StartForm.tsx`. Prompt, inputs and properties (aspect, resolution,
   length, audio, variations). Only the prompt and site URLs reach `chat()`; the
   properties are UI only. Length presets are `15s / 1m / 2m` (default 1m).
2. **drafting**: `startProject` in `context.tsx` plays a timed script: reads the URL
   (regex), "captures" screens, outlines the arc, then reveals the storyboard act by act.
3. **review**: agent asks "Does this storyboard look right?" (`QuestionCard`). Yes →
   animating. No / comments → `mock/agent.ts` `agentRespond`, then asks again.
4. **animating**: timed fake steps; `withRecordings` swaps screenshots for screen recordings.
5. **ready**: preview with ▷ (`components/Player.tsx`), keep commenting.

## What is mocked

- `mock/draft.ts` `mockDraft(prompt)` picks one of three hardcoded storyboards:
  `figma` → `figmaConfigDraft`, `storyboard|motion editor` → `productDemoDraft`,
  else `agentChatDraft`. The prompt and URL do not change the content.
- `mock/agent.ts` `agentRespond` is keyword/regex rules ("faster", "bounce", "bigger")
  that edit only the pinned target and return `Action[]`.
- Both are meant to be swapped for a real Claude call returning the same shapes
  (`Storyboard`, `Action[]`).

## Data model (`src/types.ts`, helpers in `src/board.ts`)

- `Storyboard = { acts, frames, cuts }`. Frame order is `acts.flatMap(a => a.frameIds)`.
- **Frame**: `hold`, `background`, `layers`, optional `camera` (focus box, 0–1 units).
- **Layer**: lives in a 1440×900 frame. **Same layer id across neighbouring frames →
  it morphs** (smart animate); only in the first → exit; only in the second → enter.
  Per-layer `enter`, `exit`, `delay`, `exitDelay`.
- **Cut** (between two frames, keyed `${from}->${to}`): `feel` (snappy / smooth / bouncy /
  cinematic), `animation` (smart / dissolve / instant), optional `bezier` / `duration`.
  Feels live in `board.ts` `FEELS`.
- **Target / Pin**: anything selectable or commentable (layer, frame, cut, act, time).

## Editor decisions

- Camera pan & zoom is **frame** data, edited in the frame's Animate panel next to Hold
  and Entrance. Cuts own the *how* of a change (feel, duration, animation), not framing.
- Panel sizes and the Animate panel open state persist per viewer in `localStorage`.

## Rules

- Animate transforms (`x`, `y`, `scale`, `opacity`), not `top`/`left`/`width`.
- Colors, radii and spacing come from the theme tokens in `src/index.css`, not literals.
- Respect `useReducedMotion()` in editor UI, not in the rendered video.
- Out of scope (show as disabled UI only): music, voiceover, real URL capture, real
  MP4/GIF export, real LLM, accounts, server saving, collaboration.
