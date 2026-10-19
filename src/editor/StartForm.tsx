import { useRef, useState } from 'react'
import { useApp } from '../context'
import { Icon } from './icons'

// Each property cycles through its options on click. They only shape the brief for now.
const ASPECTS = ['16:9', '9:16', '1:1', '4:5']
const RESOLUTIONS = ['720p', '1080p', '4K']
const LENGTHS = ['15s', '1m', '2m']
const AUDIO = ['Off', 'On']
const VARIATIONS = ['1', '2', '3', '4']

const next = (list: string[], v: string) => list[(list.indexOf(v) + 1) % list.length]

// The empty project's agent panel: one form for the brief (prompt, inputs, properties) and Generate.
export function StartForm() {
  const { chat } = useApp()
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [boards, setBoards] = useState<string[]>([])
  // Which link the shared input is collecting: a website, or a board from a connected app.
  const [adding, setAdding] = useState<'site' | 'app' | null>(null)
  const [link, setLink] = useState('')
  const [aspect, setAspect] = useState(ASPECTS[0])
  const [resolution, setResolution] = useState(RESOLUTIONS[0])
  const [length, setLength] = useState(LENGTHS[1])
  const [audio, setAudio] = useState(AUDIO[0])
  const [variations, setVariations] = useState(VARIATIONS[0])
  const upload = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => list && setFiles((f) => [...f, ...Array.from(list).map((x) => x.name)])
  const addLink = () => {
    const v = link.trim()
    if (v) (adding === 'app' ? setBoards : setSites)((s) => [...s, v])
    setLink('')
    setAdding(null)
  }
  const toggle = (mode: 'site' | 'app') => setAdding((a) => (a === mode ? null : mode))
  const generate = () => {
    const brief = [prompt.trim(), ...sites, ...boards].filter(Boolean).join('\n')
    if (brief) chat(brief)
  }
  const ready = prompt.trim().length > 0 || sites.length > 0 || boards.length > 0

  const tile = 'flex flex-col items-center justify-center gap-1.5 rounded-lg bg-control px-2 py-4 text-center text-[11px] leading-tight text-muted hover:bg-control-hover hover:text-ink'
  const pill = 'flex h-8 items-center justify-center gap-1.5 rounded-lg bg-control text-[12px] hover:bg-control-hover'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
        <div className="rounded-lg bg-control p-3 focus-within:ring-1 focus-within:ring-line-strong">
          <p className="font-display text-[12px] font-medium text-muted">Prompt</p>
          <textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
            }}
            placeholder="Attach your product and tell us your video idea..."
            className="mt-1.5 w-full resize-none bg-transparent outline-none placeholder:text-subtle"
          />
        </div>

        <section>
          <h3 className="mb-1.5 px-0.5 font-display text-[12px] font-medium text-muted">Inputs</h3>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => upload.current?.click()} className={tile}>
              <Icon.Upload size={16} />
              Upload files
            </button>
            <button onClick={() => toggle('site')} className={`${tile} ${adding === 'site' ? 'text-ink' : ''}`}>
              <Icon.Globe size={16} />
              Websites
            </button>
            <button
              onClick={() => toggle('app')}
              title="Import boards and frames from Figma, Miro, Mural and more"
              className={`${tile} ${adding === 'app' ? 'text-ink' : ''}`}
            >
              <Icon.Apps size={16} />
              Connect apps
            </button>
          </div>
          <input ref={upload} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          {adding && (
            <input
              key={adding}
              autoFocus
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addLink()
                if (e.key === 'Escape') setAdding(null)
              }}
              onBlur={addLink}
              placeholder={adding === 'app' ? 'Paste a Figma, Miro or Mural link' : 'Paste a website URL and press Enter'}
              className="mt-1.5 h-8 w-full rounded-lg bg-control px-3 outline-none placeholder:text-subtle focus:ring-1 focus:ring-line-strong"
            />
          )}
          {(files.length > 0 || sites.length > 0 || boards.length > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {[
                ...files.map((n) => ({ n, Glyph: Icon.Upload, remove: setFiles })),
                ...sites.map((n) => ({ n, Glyph: Icon.Globe, remove: setSites })),
                ...boards.map((n) => ({ n, Glyph: Icon.Apps, remove: setBoards })),
              ].map(({ n, Glyph, remove }, i) => (
                <span key={`${n}${i}`} className="flex h-6 max-w-full items-center gap-1.5 rounded-md border border-line bg-control px-1.5 text-[11px]">
                  <Glyph size={11} />
                  <span className="truncate">{n}</span>
                  <button
                    onClick={() => remove((l) => l.filter((x) => x !== n))}
                    className="shrink-0 text-subtle hover:text-ink"
                    title="Remove"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 px-0.5 font-display text-[12px] font-medium text-muted">Properties</h3>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => setAspect(next(ASPECTS, aspect))} title="Aspect ratio" className={pill}>
              <span className="block h-[9px] w-4 rounded-[2px] border border-current" />
              {aspect}
            </button>
            <button onClick={() => setResolution(next(RESOLUTIONS, resolution))} title="Resolution" className={pill}>
              <Icon.Resolution size={13} />
              {resolution}
            </button>
            <button onClick={() => setLength(next(LENGTHS, length))} title="Video length" className={pill}>
              <Icon.Clock size={13} />
              {length}
            </button>
            <button onClick={() => setAudio(next(AUDIO, audio))} title="Audio" className={pill}>
              {audio === 'On' ? <Icon.Volume size={13} /> : <Icon.VolumeOff size={13} />}
              {audio}
            </button>
            <button onClick={() => setVariations(next(VARIATIONS, variations))} title="Variations" className={pill}>
              <Icon.Layers size={13} />
              {variations}
            </button>
          </div>
        </section>
      </div>

      <div className="p-2">
        <button
          onClick={generate}
          disabled={!ready}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-accent font-medium text-on-accent hover:brightness-95 disabled:opacity-40"
        >
          Generate
          <Icon.Send size={13} />
        </button>
      </div>
    </div>
  )
}
