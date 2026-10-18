import type { CSSProperties } from 'react'
import type { Layer } from '../types'

// What a layer draws, independent of where it sits.
export function LayerBody({ layer }: { layer: Layer }) {
  if (layer.kind === 'image') {
    return (
      <img
        src={layer.src}
        draggable={false}
        className="block h-full w-full select-none"
        style={{ borderRadius: layer.radius, boxShadow: layer.shadow ? '0 30px 80px rgba(0,0,0,0.28)' : undefined }}
      />
    )
  }
  if (layer.kind === 'rect') {
    return <div className="h-full w-full" style={{ background: layer.fill, borderRadius: layer.radius }} />
  }
  const left = layer.align === 'left'
  return (
    <div
      className="flex h-full w-full items-center whitespace-nowrap select-none"
      style={{
        justifyContent: left ? 'flex-start' : 'center',
        fontWeight: layer.fontWeight ?? 700,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        background: layer.fill,
        borderRadius: layer.fill ? 999 : undefined,
        padding: layer.fill ? '0 0.7em' : undefined,
      }}
    >
      {layer.text}
    </div>
  )
}

// Animatable box values (used by the player).
export const layerBox = (l: Layer) => ({
  left: l.x,
  top: l.y,
  width: l.w,
  height: l.h,
  rotate: l.rotation,
  scaleX: l.scaleX ?? 1,
  scaleY: l.scaleY ?? 1,
  opacity: l.opacity,
  ...(l.kind === 'text' ? { fontSize: l.fontSize, color: l.color } : {}),
})

// Static CSS for the same box (used on the canvas).
export const layerStyle = (l: Layer): CSSProperties => ({
  position: 'absolute',
  left: l.x,
  top: l.y,
  width: l.w,
  height: l.h,
  opacity: l.opacity,
  transform: `rotate(${l.rotation}deg) scale(${l.scaleX ?? 1}, ${l.scaleY ?? 1})`,
  ...(l.kind === 'text' ? { fontSize: l.fontSize, color: l.color } : {}),
})
