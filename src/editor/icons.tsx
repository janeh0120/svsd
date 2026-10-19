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
  Clock: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  ),
  Hand: (p: P) => (
    <Svg {...p}>
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v2" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  ),
  Sparkle: (p: P) => (
    <Svg {...p}>
      <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" />
      <path d="M19 15v5M16.5 17.5h5" />
    </Svg>
  ),
  Upload: (p: P) => (
    <Svg {...p}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </Svg>
  ),
  Globe: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </Svg>
  ),
  Apps: (p: P) => (
    <Svg {...p}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <path d="M16.75 13.5v6.5M13.5 16.75H20" />
    </Svg>
  ),
  Image: (p: P) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="M20 16l-4.5-4.5L7 20" />
    </Svg>
  ),
  Resolution: (p: P) => (
    <Svg {...p}>
      <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
    </Svg>
  ),
  Volume: (p: P) => (
    <Svg {...p}>
      <path d="M4 10v4h4l5 4V6l-5 4z" />
      <path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10" />
    </Svg>
  ),
  VolumeOff: (p: P) => (
    <Svg {...p}>
      <path d="M4 10v4h4l5 4V6l-5 4z" />
      <path d="M17 10l4 4M21 10l-4 4" />
    </Svg>
  ),
  Layers: (p: P) => (
    <Svg {...p}>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
    </Svg>
  ),
  Pointer: (p: P) => (
    <Svg {...p}>
      <path d="M5 3l6.5 17 2.4-7.1L21 10.5z" />
    </Svg>
  ),
  PanelRight: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </Svg>
  ),
  Link: (p: P) => (
    <Svg {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Svg>
  ),
  Component: (p: P) => (
    <Svg {...p}>
      <path d="M12 3l3 3-3 3-3-3zM12 15l3 3-3 3-3-3zM6 9l3 3-3 3-3-3zM18 9l3 3-3 3-3-3z" />
    </Svg>
  ),
  More: (p: P) => (
    <Svg {...p}>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" />
    </Svg>
  ),
  Styles: (p: P) => (
    <Svg {...p}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <circle cx="8" cy="16" r="3" />
      <circle cx="16" cy="16" r="3" />
    </Svg>
  ),
  AlignLeft: (p: P) => (
    <Svg {...p}>
      <path d="M4 4v16M8 9h10M8 15h6" />
    </Svg>
  ),
  AlignCenterH: (p: P) => (
    <Svg {...p}>
      <path d="M12 4v16M6 9h12M8 15h8" />
    </Svg>
  ),
  AlignRight: (p: P) => (
    <Svg {...p}>
      <path d="M20 4v16M6 9h10M10 15h6" />
    </Svg>
  ),
  AlignTop: (p: P) => (
    <Svg {...p}>
      <path d="M4 4h16M9 8v10M15 8v6" />
    </Svg>
  ),
  AlignMiddleV: (p: P) => (
    <Svg {...p}>
      <path d="M4 12h16M9 6v12M15 8v8" />
    </Svg>
  ),
  AlignBottom: (p: P) => (
    <Svg {...p}>
      <path d="M4 20h16M9 6v10M15 10v6" />
    </Svg>
  ),
  Rotate: (p: P) => (
    <Svg {...p}>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4v4h4" />
    </Svg>
  ),
  FlipH: (p: P) => (
    <Svg {...p}>
      <path d="M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z" />
    </Svg>
  ),
  FlipV: (p: P) => (
    <Svg {...p}>
      <path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z" />
    </Svg>
  ),
  HugWidth: (p: P) => (
    <Svg {...p}>
      <path d="M4 6v12M8 12h11M15 8l4 4-4 4" />
    </Svg>
  ),
  HugHeight: (p: P) => (
    <Svg {...p}>
      <path d="M6 5v14M18 5v14M10 9h4M10 15h4M12 9v6" />
    </Svg>
  ),
  FixedSize: (p: P) => (
    <Svg {...p}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 10h8M8 14h5" />
    </Svg>
  ),
  TextLeft: (p: P) => (
    <Svg {...p}>
      <path d="M4 6h16M4 12h10M4 18h14" />
    </Svg>
  ),
  TextCenter: (p: P) => (
    <Svg {...p}>
      <path d="M4 6h16M7 12h10M5 18h14" />
    </Svg>
  ),
  TextRight: (p: P) => (
    <Svg {...p}>
      <path d="M4 6h16M10 12h10M6 18h14" />
    </Svg>
  ),
  Target: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </Svg>
  ),
  Send: (p: P) => (
    <Svg {...p} strokeWidth={2.2}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  ),
}
