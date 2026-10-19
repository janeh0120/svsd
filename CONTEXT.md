# svsd: session context (hand-off doc)

Attach this file to a new chat to pick up where the last session left off. Last updated 2026-10-19 (second session). See "State of the repo" for what is committed.

## What this is
A storyboard-based motion editor (React 19 + Vite + TypeScript + Tailwind 4 + `motion`). Frames (1440×900, layers) are grouped into **acts** (the "story chapters"); the gap between frames is a **cut** (the motion). An AI agent is fully mocked (`src/context.tsx`, `src/mock/`). Dark UI only. See `README.md` for the product flow and `../svsd-notes.md` for an older repo map.

- Run: `cd SVSD/svsd && npm run dev` (preview config in `.claude/launch.json`, port **5174**). There is no `lint` script; typecheck with `npx tsc -b`.
- Reload resets all state (in-memory only).
- The parent folder's `SVSD/CLAUDE.md` describes the older "Sequence" prototype (different codebase, folder-ownership rules, `Video.tsx`). It does not describe this repo. Ignore its folder rules here.

## Second session: ElevenAgents-style launch reel (TenAgents Builder)
The sample board is no longer Relay Playbooks. `mock/agentChatDraft.ts` now builds a **31-shot, 67.2 s reel in 5 acts** (Intro 1–4, Demo 5–12, Features 13–20, Build-up 21–29, Outro 30–31), taken from the stills in `public/shots/elevenagents/*.jpg` (1600×900 covers of the 1920×1080 PNGs; titles, order and timings come from the user's `shots.md` and design canvas).
- **Shots 5–7 are built from layers** (ids `c2`, `c3`, `c4`): prompt close-up, prompt send with the cursor, analysis (flow graph, transcript, system tools, "Gathering data" card). The prompt box, chip and cursor keep their layer ids so they morph across cuts. These three keep their own cuts (`s04->c2` dissolve 700 ms, `c2->c3` 1000 ms, `c3->c4` 500 ms with a staggered pop-in, `c4->s08` dissolve 600 ms).
- **Every other cut defaults to Smart animate, 300 ms Snappy.** Each such cut takes 0.3 s out of the next shot's hold so the reel stays 1:07.
- **Branding:** shot 1 is the play-triangle logo (`public/shots/logo-play.svg`); shots 4 and 31 cover the printed wordmark with a patch and set "TenAgents Builder" as layers (staggered in/out). The app logo (`public/sequence-logo.svg`) replaces the placeholder in the left panel header.
- Frame ids: shots 5–7 are `c2`–`c4`; the stills are `sNN` (e.g. `s04`, `s08`).

### Engine additions (`src/types.ts`, `components/Layer.tsx`, `Player.tsx`, `Canvas.tsx` CutIn)
- `Layer.enter` (`EnterPreset`, Jitter-style names: fade, slide-up/down/left/right, grow, shrink, spin, twist, blur, blur-scale, blur-slide; empty = default rise), `Layer.delay` (stagger the arrival), `Layer.exit` and `Layer.exitDelay` (how a layer leaves when the next cut drops it; **preview player only**, not the in-card playback). `arrival()` and `departure()` live in `Layer.tsx`.
- `store.ts`: selecting a frame or layer moves the playhead to that frame's start.

### Right panel (`editor/PropertiesPanel.tsx`, `MotionControls.tsx`)
- Header has **Preview** (opens the full preview) and Export; the tab row ends with a **zoom %** menu. The canvas publishes its zoom through `editor/canvasZoom.ts` (module store) and accepts requests from the menu.
- Cuts between chapters (acts) label their first control **Transition**; others say Animation. Both Transition and Easing are floating picker panels (`PickerField`). Easing presets: Linear, Ease in/out/in-out, and the three "back" curves, plus Custom bezier.
- The Animate preview is a mini A→B cut that follows the chosen transition, easing and duration.
- **Entrance** section (bottom, only for a selected layer): empty by default, "+" adds a preset, "−" clears it. The cut owns timing and easing; the preset only overrides this layer's arrival style.
- `DesignPanel.tsx`: gradient fills show a swatch and "Gradient" instead of raw CSS.
- `Pin.tsx`: the comment box's `+` is now "+ Reference" (image/video picker; names only, nothing is sent).
- Canvas: more space under act headers; frame titles truncate before the time text; connector arrow tips stop at the shot edge.

### Brand colors
Text stays the M3 off-white (`--ink: #ECDFE1`). Pink `#F3C9D5` (`--secondary`) is a supporting accent only (play button, frame-number badge, checklist ticks, one stop in the gradients); lime is the main accent.

### Jitter MCP
`https://mcp.jitter.video` is connected in the user's Claude (not in this repo). Its preset names informed the entrance presets; it was not used to read the user's files.

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
(Older note from session one, now committed in `19cc4b4`.) Uncommitted at that time: `package.json`/`package-lock.json` (agentation), `index.html`, `src/App.tsx`, `src/index.css`, `src/editor/{Canvas,DesignPanel,LeftPanel,PropertiesPanel,QuestionCard,Timeline,icons}.tsx`, `src/mock/agentChatDraft.ts`, new `src/editor/StartForm.tsx`, `.mcp.json`, `CONTEXT.md`. `README.md` also shows as modified but wasn't edited in this session. `tsconfig.tsbuildinfo` is a build artifact (consider gitignoring). Typecheck (`npx tsc -b`) passes.

## How the user works
- They give feedback by clicking elements with Agentation; each message includes the component, source line and a note. Reference screenshots are often attached; match their look using the established tokens rather than copying colours.
- They prefer short summaries and decisions flagged when a request was ambiguous (say which reading you took and how to flip it).

## State of the repo (end of second session)
Branch `storyboard-polish`, pushed to `origin` (`janeh0120/svsd`). Session two's work is one commit on top of `19cc4b4`. `.DS_Store` and `tsconfig.tsbuildinfo` are not committed (the latter is gitignored). `public/cursors/*.svg` and the `cursor-ai` class on the timeline ruler are the user's own in-progress custom-cursor work, committed as found. Typecheck (`npx tsc -b`) passes.

## Known gaps / next ideas (second session)
- Jitter's move-then-scale and mask-reveal presets are not implemented; exits only play in the full preview.
- Shot 7's card does not blur out and the two purple placeholder squares are missing (a dissolve stands in).
- The wordmark patch hides the thin tile lines behind the text; shots 4 and 31 still use the printed still underneath.
- Pin "Reference" files are listed in the box only; nothing is stored or sent.
