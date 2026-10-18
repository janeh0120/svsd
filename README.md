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
4. **The agent animates.** Once you approve, it records the screen flows and animates the frames together. The timeline tracks fill in and ▷ previews the reel.

Everything the agent does is **mocked** (`src/context.tsx`, `src/mock/`). Reload to start over.

## The editor
- **Canvas**: acts side by side in one horizontal row (Introduction, Demo, Features, Build, Outro), each a group of frames. The gap between two frames is the cut.
- **Left**: **Agent** chat (queued comments and replies) or **Layers** (acts › frames › layers).
- **Right**: properties for the selection (Animations, Transform, Layout, Appearance, Fill). ▷ at the top opens a preview.
- **Bottom**: timeline with act tabs (click to jump the canvas), a ruler, a playhead, and a track per layer with keyframes.

## Commenting (inline prompting)
Enter comment mode with **C**, or by typing **@** in the agent input ("@ for context").

In comment mode, click:
- **an element in a frame** → layer comment (`bigger`, `move left`, `fade`, `"new text"`)
- **empty space in a frame** → frame comment (`push in closer`, `hold longer`)
- **the gap between frames** → cut comment (`make it bouncy`, `cinematic`)
- **an act title** → act comment (`this section feels slow`)
- **a row in the Layers panel** → same as clicking that layer

Comments queue in the Agent panel. **Send to agent** applies them all at once, and each one edits only its target (`src/mock/agent.ts`). Esc exits comment mode.

## How it works
- A **frame** is 1440×900 with layers. Layers keep their id across frames, so playback moves each layer from its position in one frame to the next using the cut's feel (`src/components/Player.tsx`).- One storyboard object (`src/types.ts`) drives the canvas, layers, properties, timeline and player.
- Comment targets are typed (`layer | frame | cut | act`), so the agent gets an exact reference instead of a timestamp.

## Real screenshots
`public/shots/*.svg` are placeholder screens for a fake product ("Lumen"). To capture a real site:

```bash
npx playwright install chromium
npm run capture -- https://your-site.com
```

Then point the image layers' `src` in `src/mock/draft.ts` at `/shots/shot-N.png`.

## Next
- Replace `mockDraft` and `agentRespond` with Claude calls that return the same shapes.
- Fake cursor + tap ripple, micro-motions, export.
