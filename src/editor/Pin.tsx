import { useState, type CSSProperties } from 'react'
import { targetLabel } from '../board'
import { useApp } from '../context'
import type { Pin } from '../types'

// A comment pin with its popover: a composer while drafting, the thread after.
export function PinMarker({ pin, style, className = '' }: { pin: Pin; style?: CSSProperties; className?: string }) {
  const { state, dispatch } = useApp()
  const open = state.composing === pin.id
  const n = state.pins.filter((p) => p.status !== 'draft').indexOf(pin) + 1
  const [text, setText] = useState(pin.text)

  const save = () => {
    if (!text.trim()) return dispatch({ type: 'pinRemove', id: pin.id })
    dispatch({ type: 'pinUpdate', id: pin.id, patch: { text: text.trim(), status: 'pending' } })
    dispatch({ type: 'compose', id: null })
  }

  const color = pin.status === 'sent' ? 'bg-emerald-500' : 'bg-orange-500'

  return (
    <div
      className={`absolute ${open ? 'z-50' : 'z-20'} ${className}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => dispatch({ type: 'compose', id: open ? null : pin.id })}
        className={`flex size-5 items-center justify-center rounded-full rounded-bl-none text-[11px] font-semibold text-white shadow-md ring-2 ring-white ${color} ${
          pin.status === 'draft' ? 'animate-pulse' : ''
        }`}
      >
        {pin.status === 'sent' ? '✓' : pin.status === 'draft' ? '+' : n}
      </button>

      {open && (
        <div className="absolute top-0 left-7 w-64 cursor-auto rounded-lg border border-[#E6E6E6] bg-white p-2 text-left text-[12px] shadow-xl">
          <p className="mb-2 text-[11px] font-medium text-orange-600">{targetLabel(pin.target, state.board)}</p>

          {pin.status === 'draft' ? (
            <>
              <textarea
                autoFocus
                rows={3}
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
                className="w-full resize-none rounded-md border border-[#E6E6E6] p-2 outline-none focus:border-orange-400"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => dispatch({ type: 'pinRemove', id: pin.id })} className="h-7 rounded-md px-2 text-[#8C8C8C] hover:bg-[#F5F5F5]">
                  Cancel
                </button>
                <button onClick={save} className="h-7 rounded-md bg-[#1E1E1E] px-2 font-medium text-white">
                  Add comment
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="rounded-md bg-[#F5F5F5] px-2 py-1.5">{pin.text}</p>
              {pin.status === 'pending' && (
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#8C8C8C]">
                  Queued. Send it from the Agent panel.
                  <button onClick={() => dispatch({ type: 'pinRemove', id: pin.id })} className="text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              )}
              {pin.reply && (
                <p className="mt-2 rounded-md bg-[#E5F4FF] px-2 py-1.5">
                  <span className="mr-1 text-[11px] font-medium text-[#0D99FF]">Agent</span>
                  {pin.reply}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
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
    case 'act':
      return 'e.g. this section feels slow, make it snappy'
  }
}
