import { motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { useApp } from '../context'
import { Icon } from './icons'

// Each property cycles through its options on click. They only shape the brief for now.
const ASPECTS = ['16:9', '9:16', '1:1', '4:5']
const RESOLUTIONS = ['720p', '1080p', '4K']
const LENGTHS = ['15s', '30s', '1m', '2m']
const AUDIO = ['Off', 'On']
const VARIATIONS = ['1', '2', '3', '4']

const next = (list: string[], v: string) => list[(list.indexOf(v) + 1) % list.length]

// The empty project: a full-screen start page (nav, headline, brief card) over the same
// grainy gradient the agent glows with while it thinks. Sending the brief goes straight
// into the scripted agent work. All sizes are whole pixels, laid out for a 1440 × 900 window.
export function StartScreen() {
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
  const [length, setLength] = useState('1m')
  const [audio, setAudio] = useState(AUDIO[0])
  const [variations, setVariations] = useState(VARIATIONS[0])
  const upload = useRef<HTMLInputElement>(null)
  const promptBox = useRef<HTMLTextAreaElement>(null)

  // Sending the brief plays this as the page leaves: the headline and card lift away, the glow
  // sinks, and the page fades out over the editor as it arrives underneath.
  const reduce = useReducedMotion()
  const out = (duration: number, delay = 0) => (reduce ? { duration: 0 } : { duration, delay, ease: [0.5, 0, 0, 1] as const })
  const exit = {
    page: { exit: { opacity: 0, transition: out(0.5, 0.3) } },
    nav: { exit: { opacity: 0, y: -12, transition: out(0.3) } },
    title: { exit: { opacity: 0, y: -24, transition: out(0.4) } },
    lead: { exit: { opacity: 0, y: -16, transition: out(0.4, 0.05) } },
    card: { exit: { opacity: 0, y: 28, scale: 0.98, transition: out(0.45) } },
    glow: { exit: { opacity: 0, y: 120, transition: out(0.7) } },
  }

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

  const tile =
    'flex h-[92px] w-[220px] flex-col items-center justify-center gap-2 whitespace-nowrap rounded-[15px] bg-control text-[14px] leading-[20px] text-muted hover:bg-control-hover hover:text-ink'
  const pill =
    'flex h-[41px] w-[128px] items-center justify-center gap-2 whitespace-nowrap rounded-[15px] bg-control text-[15px] font-medium hover:bg-control-hover'
  const navLink = 'text-[16px] font-medium text-ink'
  const heading = 'px-[3px] font-display text-[15px] font-medium leading-[22px] text-muted'

  return (
    <motion.div variants={exit.page} exit="exit" className="fixed inset-0 z-50 overflow-hidden bg-canvas text-ink">
      {/* The same grainy gradient the agent glows with while it works, here filling the bottom of the page. */}
      <motion.div variants={exit.glow} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[460px]">
        <div className="agent-glow start-glow absolute inset-x-0 bottom-0 h-full" />
      </motion.div>

      <div className="relative z-10 flex h-full flex-col items-center">
        {/* Nav. Everything but Start creating is a placeholder: no accounts or pages yet. */}
        <motion.nav variants={exit.nav} className="flex h-[90px] w-full shrink-0 items-center justify-between px-[38px]">
          <img src="/sequence-wordmark.svg" alt="Sequence" draggable={false} className="h-[32px] w-[142px] select-none" />
          <div className="flex items-center">
            <div className="mr-[58px] flex gap-[31px]">
              {['Support', 'Careers', 'Blog'].map((l) => (
                <button key={l} type="button" title="Coming soon" className={`${navLink} cursor-default`}>
                  {l}
                </button>
              ))}
            </div>
            <button type="button" title="Coming soon" className={`${navLink} mr-[12px] h-[38px] cursor-default rounded-[16px] border border-line px-[16px]`}>
              Log in
            </button>
            <button
              type="button"
              onClick={() => promptBox.current?.focus()}
              className="h-[38px] rounded-[16px] bg-accent px-[16px] text-[16px] font-medium text-on-accent"
            >
              Start creating
            </button>
          </div>
        </motion.nav>

        {/* Headline and card sit in the middle of the screen (the bottom padding mirrors the nav), above the gradient. */}
        <main className="flex w-full flex-1 flex-col items-center justify-center pb-[90px]">
          <motion.h1 variants={exit.title} className="text-[76px] font-normal leading-[110px] text-white">
            Make your next big reveal.
          </motion.h1>
          <motion.p variants={exit.lead} className="mt-[37px] text-[18px] leading-[24px] text-white">
            Create engaging product videos without the motion design learning curve.
          </motion.p>

          {/* The brief card */}
          <motion.section variants={exit.card} className="mt-[84px] flex w-[712px] flex-col rounded-[20px] border border-line bg-surface">
            <div className="flex flex-col gap-[25px] p-[15px] pb-[21px]">
              <div className="flex flex-col gap-[8px]">
                <h3 className={heading}>Inputs</h3>
                <div className="flex gap-[10px]">
                  <button onClick={() => upload.current?.click()} className={tile}>
                    <Icon.Upload size={20} />
                    Upload files
                  </button>
                  <button onClick={() => toggle('site')} className={`${tile} ${adding === 'site' ? 'text-ink' : ''}`}>
                    <Icon.Globe size={20} />
                    Websites
                  </button>
                  <button
                    onClick={() => toggle('app')}
                    title="Import boards and shots from Figma, Miro, Mural and more"
                    className={`${tile} ${adding === 'app' ? 'text-ink' : ''}`}
                  >
                    <Icon.Apps size={20} />
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
                    className="h-[41px] w-full rounded-[15px] bg-control px-[15px] text-[15px] outline-none placeholder:text-subtle focus:ring-1 focus:ring-line-strong"
                  />
                )}
                {(files.length > 0 || sites.length > 0 || boards.length > 0) && (
                  <div className="flex flex-wrap gap-[6px]">
                    {[
                      ...files.map((n) => ({
                        n,
                        Glyph: Icon.Upload,
                        remove: setFiles,
                      })),
                      ...sites.map((n) => ({
                        n,
                        Glyph: Icon.Globe,
                        remove: setSites,
                      })),
                      ...boards.map((n) => ({
                        n,
                        Glyph: Icon.Apps,
                        remove: setBoards,
                      })),
                    ].map(({ n, Glyph, remove }, i) => (
                      <span
                        key={`${n}${i}`}
                        className="flex h-[26px] max-w-full items-center gap-[6px] rounded-control border border-line bg-control px-[8px] text-[12px]"
                      >
                        <Glyph size={12} />
                        <span className="truncate">{n}</span>
                        <button onClick={() => remove((l) => l.filter((x) => x !== n))} className="shrink-0 text-subtle hover:text-ink" title="Remove">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-[8px]">
                <h3 className={heading}>Properties</h3>
                <div className="flex gap-[10px]">
                  <button onClick={() => setAspect(next(ASPECTS, aspect))} title="Aspect ratio" className={pill}>
                    <span className="block h-[11px] w-[20px] rounded-[3px] border border-current" />
                    {aspect}
                  </button>
                  <button onClick={() => setResolution(next(RESOLUTIONS, resolution))} title="Resolution" className={pill}>
                    <Icon.Resolution size={17} />
                    {resolution}
                  </button>
                  <button onClick={() => setLength(next(LENGTHS, length))} title="Video length" className={pill}>
                    <Icon.Clock size={17} />
                    {length}
                  </button>
                  <button onClick={() => setAudio(next(AUDIO, audio))} title="Audio" className={pill}>
                    {audio === 'On' ? <Icon.Volume size={17} /> : <Icon.VolumeOff size={17} />}
                    {audio}
                  </button>
                  <button onClick={() => setVariations(next(VARIATIONS, variations))} title="Variations" className={pill}>
                    <Icon.Layers size={17} />
                    {variations}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-[15px] pb-[15px]">
              <div className="flex h-[134px] flex-col gap-[10px] rounded-[15px] border border-line bg-surface p-[13px] focus-within:border-line-strong">
                <textarea
                  ref={promptBox}
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      generate()
                    }
                  }}
                  placeholder="Attach your product and tell us your video idea..."
                  className="min-h-0 w-full flex-1 resize-none text-[15px] outline-none placeholder:text-subtle"
                />
                <div className="flex items-center">
                  <button
                    onClick={() => upload.current?.click()}
                    title="Upload files"
                    className="flex size-[26px] items-center justify-center rounded-[8px] border border-line text-muted"
                  >
                    <Icon.Plus size={14} />
                  </button>
                  <button
                    onClick={generate}
                    disabled={!ready}
                    className="ml-auto flex size-[26px] items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-40"
                    title="Send"
                  >
                    <Icon.Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </motion.div>
  )
}
