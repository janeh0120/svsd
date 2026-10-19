# svsd: motion, edited as a storyboard

Designathon prototype. Motion tools show a timeline, but people plan motion as a storyboard. Here the storyboard is the editor: frames are grouped by narrative act, motion lives in the cuts between frames, and you direct an AI agent by pointing at things.

```bash
npm install
npm run dev
```

## The flow
1. **Blank project.** Type a prompt in the Agent panel: your product URL and an outline of the reel.
2. **The agent drafts.** It reads the site, captures screens (shown in the chat), outlines the narrative arc, and fills in the storyboard on the canvas act by act, with copy and screenshots.
3. **Approve or request changes.** The agent asks "Does this storyboard look right?" Request changes, or comment on frames, cuts or acts, and it asks again.
4. **The agent animates.** Once you approve, it records the screen flows and animates the frames together. Then ▷ previews the reel.

Everything the agent does is **mocked** (`src/context.tsx`, `src/mock/`). Reload to start over. The draft depends on the prompt:
- **Default**: a launch reel for a fictional product, **Relay Playbooks** (`src/mock/agentChatDraft.ts`), 7 frames: "Introducing Relay Playbooks" → "Why are customers asking for a person?" types into Relay's chat → it analyzes 1,284 handoffs → finds 48% are customers locked out of their email → drafts a Login recovery playbook → Approve. Screens are drawn by `python3 scripts/make-agentchat-screens.py`; the prompt box and cursor are layers, so they move between frames.
- **Prompts mentioning "storyboard" or "motion editor"**: this product's own 60-second demo reel (`src/mock/productDemoDraft.ts`): Hook, Intro, Prompt the agent, Point and tweak, Fine-tune by hand, Outro. Its editor screens are drawn by `python3 scripts/make-demo-screens.py`. The product name is a placeholder (`PRODUCT`). When you approve the storyboard, its editor frames switch from those drawn screens to the real screen recordings in `public/recordings/` (`withRecordings`), and the preview plays them.
- **Prompts mentioning "figma"**: a reel modeled on Figma's [All the launches at Config 2025](https://www.youtube.com/watch?v=NHodnYFUT_I) (`src/mock/figmaConfigDraft.ts`), with recreated screens.

## The editor
- **Canvas**: acts side by side in one horizontal row (Intro, Figma Sites, Make, Draw, Buzz, Outro), each a group of frames. The gap between two frames is the cut.
- **Left**: the **Agent** chat: prompts, working steps, question cards, queued comments and replies.
- **Right**: the **Animate** panel: a live preview of the reel and the selection's properties.
  - A **cut** (or a frame's cut in): animation type (Smart animate, Dissolve, Instant), easing preset or a custom bezier you drag on the curve, duration, and a sliding-square preview of the easing.
  - A **frame**: hold time, plus **Camera** pan & zoom: drag the blue box to choose what the preview shows.
  - A **layer**: Transform (position, scale, rotation) and Appearance (opacity, corner radius).
- **Bottom**: the timeline: transport controls, a ruler, act blocks and frame thumbnails, all sized by duration, across the full width. Click an act or thumbnail to jump there; zoom with the slider. **Trim** like a video editor: drag a thumbnail's right edge to change how long the frame holds, its left edge to change the cut into it, or an act's right edge to stretch the whole act. Later clips ripple along.

## Brand and color
Colors are **roles**, not hex values: `canvas`, `surface`, `raised`, `control`, `ink`, `muted`, `subtle`, `line`, `accent` (lime), `on-accent` (lime ink), `accent-soft`, `accent-line`, `accent-text`, `secondary` (soft pink #F3C9D5), `on-secondary`, `secondary-container`, `on-secondary-container`, `inverse`. The product is **dark only**. They're defined once in `src/index.css` and used as Tailwind classes (`bg-surface`, `text-muted`, `bg-accent text-on-accent`…).
- **Dark is not inverted light**: rose-tinted near-black surfaces (never #000; Material 3 neutral tones at the secondary's hue) that get lighter as they rise, off-white text (never #fff), a softer lime, almost no shadows.
- **Lime is the one on/active signal**: at most one lime fill per region (the primary action, the act under the playhead, the active tool, the selected frame). Inactive controls are tonal grey.
- **Secondary pink** (`secondary` / `on-secondary`, and the tonal `secondary-container` / `on-secondary-container`) supports lime: use it for non-primary emphasis, never as a second competing active signal.
- Every text-on-fill pair is at least 4.5:1, and lime ink on lime is 10:1 or better.

## Commenting (inline prompting)
Turn on annotate mode with the **pointer button** next to the agent input (**⇧⌘S**), **C**, or by typing **@** in the agent input ("@ for context").

In comment mode, click:
- **an element in a frame** → layer comment (`bigger`, `move left`, `fade`, `"new text"`)
- **empty space in a frame** → frame comment (`push in closer`, `hold longer`)
- **the gap between frames** → cut comment (`make it bouncy`, `cinematic`)
- **the preview** → pauses and pins a comment to that moment, and to the layer you clicked
- **the timeline ruler or a thumbnail** → pins a comment to that moment (it applies to the cut or frame playing then)
- **an act title** → act comment (`this section feels slow`)

Each annotation attaches to the agent input as a chip with a snapshot. Type a note (optional) and send: the agent applies them all at once, and each one edits only its target (`src/mock/agent.ts`). Esc exits annotate mode.

## How it works
- A **frame** is 1440×900 with layers. Layers keep their id across frames, so playback moves each layer from its position in one frame to the next using the cut's feel (`src/components/Player.tsx`).
- One storyboard object (`src/types.ts`) drives the canvas, layers, properties, timeline and player.
- Comment targets are typed (`layer | frame | cut | act`), so the agent gets an exact reference instead of a timestamp.

## Screen recordings of the editor
Real recordings of the running app for the demo video, driven by Playwright with a visible cursor:

```bash
npx playwright install chromium   # once
npm run dev                       # in another terminal (port 5174)
npm run record                    # or: npm run record -- 03
```

Writes `public/recordings/01-prompt-and-draft.mp4`, `02-approve-and-animate.mp4`, `03-point-and-tweak.mp4` and `04-fine-tune.mp4` (1440×900, 30fps). The flows are in `scripts/record-demo.mjs`.

## Real screenshots
`public/shots/*.svg` are recreated screens for the demo reel. To capture a real site:

```bash
npx playwright install chromium
npm run capture -- https://your-site.com
```

Then point the image layers' `src` in `src/mock/draft.ts` at `/shots/shot-N.png`.

## Next
- Replace `mockDraft` and `agentRespond` with Claude calls that return the same shapes.
- Fake cursor + tap ripple, micro-motions, export.
