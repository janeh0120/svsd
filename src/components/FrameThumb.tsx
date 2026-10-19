import { FRAME_H, FRAME_W } from '../board'
import type { Frame } from '../types'
import { LayerBody, layerStyle } from './Layer'

// A frame cropped to fill a width × height box: scaled to cover, centered.
export function FrameThumb({ frame, width, height }: { frame: Frame; width: number; height: number }) {
  const scale = Math.max(height / FRAME_H, width / FRAME_W)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2"
        style={{ width: FRAME_W, height: FRAME_H, background: frame.background, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {frame.layers.map((l) => (
          <div key={l.id} style={layerStyle(l)}>
            <LayerBody layer={l} />
          </div>
        ))}
      </div>
    </div>
  )
}
