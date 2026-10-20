import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { targetFrame, targetLabel } from '../board'
import { FrameThumb } from '../components/FrameThumb'
import { useApp } from '../context'
import type { Pin } from '../types'
import { Icon } from './icons'

const POPOVER_W = 256
const POPOVER_H = 150

// Where a comment is being written: an invisible anchor plus the comment box,
// portaled to the page so scrolling panels can't clip it.
export function PinMarker({ pin, style, className = '' }: { pin: Pin; style?: CSSProperties; className?: string }) {
  const { state, dispatch, sendPin } = useApp()
  const open = state.composing === pin.id
  const [text, setText] = useState(pin.text)
  const [refs, setRefs] = useState<string[]>([]) // image or video references picked for this comment (names only, nothing is uploaded)
  const picker = useRef<HTMLInputElement>(null)
  const dot = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // Place the popover beside the pin, flipping left or up when it would run off-screen.
  useLayoutEffect(() => {
    if (!open || !dot.current) return setPos(null)
    const r = dot.current.getBoundingClientRect()
    const left = r.right + 8 + POPOVER_W > innerWidth ? r.left - 8 - POPOVER_W : r.right + 8
    const top = Math.min(r.top, innerHeight - POPOVER_H - 8)
    setPos({ left: Math.max(8, left), top: Math.max(8, top) })
  }, [open])

  // Sending from the pin goes straight to the agent, which applies the change.
  const save = () => {
    if (!text.trim()) return dispatch({ type: 'pinRemove', id: pin.id })
    sendPin(pin.id, text)
  }

  // Only the comment being written is shown; once sent, the change itself is the record.
  if (pin.status !== 'draft') return null

  return (
    <div className={`absolute z-20 ${className}`} style={style} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      {/* No visible marker: just an anchor where the comment box opens. */}
      <span ref={dot} className="block size-0" />

      {open &&
        pos &&
        createPortal(
          <div
            className="fixed z-50 cursor-auto rounded-lg border border-line bg-raised p-2 text-left text-[12px] text-ink shadow-xl focus-within:border-line-strong"
            style={{ ...pos, width: POPOVER_W }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Same shape as the agent input: what it's about as a chip, the
                text, + on the left and send on the right. Esc cancels. */}
              <div className="flex min-h-20 flex-col">
                <div className="mb-1.5">
                  <TargetChip pin={pin} />
                </div>
                <textarea
                  autoFocus
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      save()
                    }
                    if (e.key === 'Escape') dispatch({ type: 'pinRemove', id: pin.id })
                  }}
                  placeholder={placeholderFor(pin)}
                  className="min-h-0 w-full flex-1 resize-none outline-none placeholder:text-subtle"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    ref={picker}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      setRefs((r) => [...r, ...Array.from(e.target.files ?? []).map((f) => f.name)])
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => picker.current?.click()}
                    title="Add an image or video reference"
                    className="flex h-5 items-center gap-1 rounded-full border border-line pr-2 pl-1.5 text-[11px] text-muted hover:text-ink"
                  >
                    <Icon.Plus size={12} />
                    Reference
                  </button>
                  {refs.map((name, i) => (
                    <span key={i} className="max-w-24 truncate rounded-md bg-control px-1.5 py-0.5 text-[11px]">
                      {name}
                    </span>
                  ))}
                  <button
                    onClick={save}
                    disabled={!text.trim() || state.working}
                    title="Send to the agent"
                    className="ml-auto flex size-5 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-40"
                  >
                    <Icon.Send size={12} />
                  </button>
                </div>
              </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

// What the comment is about, styled like an attachment chip in the agent input.
function TargetChip({ pin }: { pin: Pin }) {
  const { state } = useApp()
  const frameId = targetFrame(pin.target, state.board)
  const frame = frameId ? state.board.frames[frameId] : undefined
  return (
    <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-line bg-control pr-1.5 pl-0.5">
      <span className="relative h-[18px] w-7 shrink-0 overflow-hidden rounded-[3px] bg-line">
        {frame && <FrameThumb frame={frame} width={28} height={18} />}
      </span>
      <span className="truncate text-[11px]">{targetLabel(pin.target, state.board)}</span>
    </span>
  )
}

function placeholderFor(pin: Pin) {
  switch (pin.target.kind) {
    case 'layer':
      return 'e.g. bigger, move left, fade, "new text"'
    case 'frame':
      return 'e.g. push in closer, hold longer'
    case 'cut':
      return 'e.g. card slides up, make it bouncy'
    case 'chapter':
      return 'e.g. this section feels slow, make it snappy'
    case 'time':
      return 'e.g. this moment drags, make it snappy'
  }
}
