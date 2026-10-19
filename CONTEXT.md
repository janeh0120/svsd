# svsd: session context (hand-off doc)

Attach this file to a new chat to pick up where the last session left off. Last updated 2026-10-19. Nothing below is committed yet (see "State of the repo").

## What this is
A storyboard-based motion editor (React 19 + Vite + TypeScript + Tailwind 4 + `motion`). Frames (1440×900, layers) are grouped into **acts** (the "story chapters"); the gap between frames is a **cut** (the motion). An AI agent is fully mocked (`src/context.tsx`, `src/mock/`). Dark UI only. See `README.md` for the product flow and `../svsd-notes.md` for an older repo map.

- Run: `cd SVSD/svsd && npm run dev` (preview config in `.claude/launch.json`, port **5174**). There is no `lint` script; typecheck with `npx tsc -b`.
- Reload resets all state (in-memory only).
- The parent folder's `SVSD/CLAUDE.md` describes the older "Sequence" prototype (different codebase, folder-ownership rules, `Video.tsx`). It does not describe this repo. Ignore its folder rules here.

## Design rules we've been following
- Colours, radii and sizes come from the tokens in `src/index.css` (`--canvas`, `--surface`, `--raised`, `--control`, `--ink`, `--muted`, `--subtle`, `--line`, `--line-strong`, `--accent` lime, `--secondary` pink). Never `#000` or `#fff`; use `--ink` for "white".
- Lime = the one "active/selected" signal. Pink is supporting emphasis.
- Headings use **Shippori Mincho**: `h1`/`h2` get it from a base rule in `src/index.css`, and anything heading-like uses the `font-display` Tailwind utility (token `--font-heading`). The font is loaded from Google Fonts in `index.html` (400/500/600).
- Out of scope (show as disabled/"coming soon" at most): beat sync, real URL capture, real encoding, real LLM, accounts.

## Tooling set up this session
- **agentation** (dev dependency): `<Agentation endpoint="http://localhost:4747" />` is mounted in `src/App.tsx`, dev-only (`import.meta.env.DEV`). It's the feedback toolbar the user clicks elements with; its output is what arrives as "Page Feedback" messages.
- **MCP**: `.mcp.json` registers `npx -y agentation-mcp server` (HTTP on :4747). A new session must approve the project MCP server to read annotations. Start the server by hand with `npx -y agentation-mcp server` if it isn't running.
- Quick way to get a populated board for testing (the app starts blank): in the browser pane, set the Prompt textarea value with the native setter, dispatch an `input` event, then click the **Generate** button. Wait ~9s for the draft.

## What's been built this session (all in `src/`)
Canvas (`editor/Canvas.tsx`)
- Storyboard is always centered (both axes) and scrolls when it outgrows the view.
- **Pinch / Ctrl+scroll zoom** 30–200% around the middle of the view (`ZoomContext` undoes the scale for drags and click positions).
- **Connectors**: 1px in the act-border colour (`--line`) until selected; selected = 3px gradient off-white → pink → lime → off-white, lime arrowhead. Every connector ends in a chevron arrow; tips land on the box edges (`inset` = 8px between frames, 0 between acts). Wire starts at the middle of its small nub. Whole wire is clickable.
- Act boxes: extra top padding; **selected act has a gradient border** off-white → lime → pink → off-white over an accent-soft fill.
- Frame time labels read `5.0 – 12.8s   ·   7.8s`.
- **Shots play inside their cards** while the timeline plays through them (`CutIn`): layers move in from the previous frame over the cut, typed text types, recordings play.
- **Toolbar**: pointer button with a chevron menu: **Cursor / Hand / AI**. Hand pans by dragging. AI = the old annotate mode (`state.mode === 'comment'`, also `C`, `@`) with a crosshair and a **lasso**: press-drag to select; several frames of one act → act comment, otherwise the frame covered most. Plain click still comments on what's under it.
- Layout constants: `LINK_W = 64` (gap between cards), `CARD_INSET = 8`.

Timeline (`editor/Timeline.tsx`)
- Act boxes outlined in `--subtle` (ruler-label grey); the active act keeps a dark outline on lime.
- **Playhead**: lime pill with the time (`0.54` seconds, 2 decimals) on the ruler, line running down through the clips.
- Total reel is **1:07** (`0:00 / 1:07`); ruler and clips scale to fit.

Right panel (`editor/PropertiesPanel.tsx`)
- Selecting a frame or layer switches to the **Design** tab; selecting a cut switches to **Animate**; acts leave the tab alone.
- The Preview card (Animate tab) and the header Preview button were removed. Full preview still opens from the timeline monitor button and each frame's small play button. Export button remains ("coming soon").

Left panel (`editor/LeftPanel.tsx`, new `editor/StartForm.tsx`)
- While the project is blank, the agent panel is a **brief form**: Prompt, Inputs (Upload files / Websites / Image refs), Properties (16:9, 720p, 30s, audio, variations; each cycles on click, visual only), and a lime **Generate** button. Websites are appended to the prompt. Files are listed only, not read. Tiles have `px-2`, 11px text.
- After Generate, the normal chat appears; its composer has 16:9 and 30s chips (now redundant with the form; not yet removed). The old annotate button and the BPM button were removed.
- Placeholder in the chat form: "Attach your product and tell us your video idea...".

Sample data (`mock/agentChatDraft.ts`)
- Acts are now **Intro, Demo, Features, Build-up, Outro** (frames c1 | c2,c3 | c4,c5 | c6 | c7). Frame holds were lengthened (5, 6, 8, 10, 11, 10, 9.2 s) so the reel is exactly 67s with the cut durations unchanged (7.8s of cuts).

Misc
- `editor/icons.tsx` gained: Clock, Hand, Sparkle, Upload, Globe, Image, Resolution, Volume, VolumeOff, Layers (Metronome was added then removed).
- `editor/DesignPanel.tsx`, `editor/QuestionCard.tsx`: `font-display` on headings.

## Known gaps / ideas not done
- The 16:9 / 30s properties don't affect anything (frames are square in the model). Chips in the chat composer duplicate the start form's.
- Act names can't be edited by hand; no UI to create, rename or reorder acts.
- No on-screen zoom control or reset (zoom is gesture-only). The old ring node's hover effect is gone from connectors (arrow has no hover state).
- In annotate mode, hovering a *selected* act doesn't show the hover outline (the gradient border replaces it).
- Lasso across frames of different acts picks the frame with the most overlap (no multi-act target).
- Real trackpad pinch and real mouse lasso/pan haven't been tried by hand; they were tested with simulated events.
- Time-label and pill colours/format were verified in the pane but not tuned against the user's references pixel-for-pixel.

## State of the repo
Branch `main`, base commit `c18e482`. Uncommitted: `package.json`/`package-lock.json` (agentation), `index.html`, `src/App.tsx`, `src/index.css`, `src/editor/{Canvas,DesignPanel,LeftPanel,PropertiesPanel,QuestionCard,Timeline,icons}.tsx`, `src/mock/agentChatDraft.ts`, new `src/editor/StartForm.tsx`, `.mcp.json`, `CONTEXT.md`. `README.md` also shows as modified but wasn't edited in this session. `tsconfig.tsbuildinfo` is a build artifact (consider gitignoring). Typecheck (`npx tsc -b`) passes.

## How the user works
- They give feedback by clicking elements with Agentation; each message includes the component, source line and a note. Reference screenshots are often attached; match their look using the established tokens rather than copying colours.
- They prefer short summaries and decisions flagged when a request was ambiguous (say which reading you took and how to flip it).
