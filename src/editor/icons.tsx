import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  )
}

export const Icon = {
  Cursor: (p: P) => (
    <Svg {...p}>
      <path d="M5 3l6.5 17 2.4-7.1L21 10.5z" fill="currentColor" />
    </Svg>
  ),
  Frame: (p: P) => (
    <Svg {...p}>
      <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />
    </Svg>
  ),
  Square: (p: P) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
    </Svg>
  ),
  Pen: (p: P) => (
    <Svg {...p}>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.6 7.6" />
      <circle cx="11" cy="11" r="2" />
    </Svg>
  ),
  Text: (p: P) => (
    <Svg {...p}>
      <path d="M5 6V4h14v2M9 20h6M12 4v16" />
    </Svg>
  ),
  ChevronDown: (p: P) => (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  Move: (p: P) => (
    <Svg {...p}>
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </Svg>
  ),
  Combine: (p: P) => (
    <Svg {...p}>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </Svg>
  ),
  Copy: (p: P) => (
    <Svg {...p}>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </Svg>
  ),
  Expand: (p: P) => (
    <Svg {...p}>
      <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
    </Svg>
  ),
  Grid: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18M12 3v18" />
    </Svg>
  ),
  Plus: (p: P) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  Crosshair: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </Svg>
  ),
  Diamond: (p: P) => (
    <Svg {...p}>
      <path d="M12 4l8 8-8 8-8-8z" />
    </Svg>
  ),
  LinkOut: (p: P) => (
    <Svg {...p}>
      <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
      <path d="M14 4h6v6M20 4l-9 9" />
    </Svg>
  ),
  Eye: (p: P) => (
    <Svg {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  Droplet: (p: P) => (
    <Svg {...p}>
      <path d="M12 3l5.7 6.2a7.5 7.5 0 1 1-11.4 0z" />
    </Svg>
  ),
  Sliders: (p: P) => (
    <Svg {...p}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Svg>
  ),
  Angle: (p: P) => (
    <Svg {...p}>
      <path d="M4 19h16M4 19L17 6" />
      <path d="M10 19a6 6 0 0 0-1.8-4.3" />
    </Svg>
  ),
  ArrowsH: (p: P) => (
    <Svg {...p}>
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </Svg>
  ),
  ArrowsV: (p: P) => (
    <Svg {...p}>
      <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
    </Svg>
  ),
  Corners: (p: P) => (
    <Svg {...p}>
      <path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Svg>
  ),
  Play: (p: P) => (
    <Svg {...p}>
      <path d="M7 4l13 8-13 8z" />
    </Svg>
  ),
  Pause: (p: P) => (
    <Svg {...p}>
      <path d="M8 5v14M16 5v14" />
    </Svg>
  ),
  Loop: (p: P) => (
    <Svg {...p}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Svg>
  ),
  Filter: (p: P) => (
    <Svg {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Svg>
  ),
  Group: (p: P) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 12h16M12 4v16" />
    </Svg>
  ),
  Pencil: (p: P) => (
    <Svg {...p}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </Svg>
  ),
  ArrowRight: (p: P) => (
    <Svg {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  ),
  ChevronLeft: (p: P) => (
    <Svg {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  ),
  ChevronRight: (p: P) => (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  ),
  SkipBack: (p: P) => (
    <Svg {...p}>
      <path d="M6 5v14" />
      <path d="M19 6l-9 6 9 6z" />
    </Svg>
  ),
  SkipForward: (p: P) => (
    <Svg {...p}>
      <path d="M18 5v14" />
      <path d="M5 6l9 6-9 6z" />
    </Svg>
  ),
  Rewind: (p: P) => (
    <Svg {...p}>
      <path d="M11 6l-8 6 8 6zM21 6l-8 6 8 6z" fill="currentColor" />
    </Svg>
  ),
  FastForward: (p: P) => (
    <Svg {...p}>
      <path d="M13 6l8 6-8 6zM3 6l8 6-8 6z" fill="currentColor" />
    </Svg>
  ),
  Minus: (p: P) => (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  ),
  Monitor: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </Svg>
  ),
  Pointer: (p: P) => (
    <Svg {...p}>
      <path d="M5 3l6.5 17 2.4-7.1L21 10.5z" />
    </Svg>
  ),
  Send: (p: P) => (
    <Svg {...p} strokeWidth={2.2}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  ),
}
