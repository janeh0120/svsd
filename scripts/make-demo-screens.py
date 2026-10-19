"""Draw the editor-UI screens used by the product demo reel (public/shots/demo-*.svg).

These are illustrations of the editor, not screenshots: each screen is assembled
from shared pieces (agent chat, canvas, timeline, side panel) so they stay
consistent. Run: python3 scripts/make-demo-screens.py
"""
from pathlib import Path
from xml.sax.saxutils import escape

W, H = 1440, 900
LP, RP = 260, 260  # sidebar widths
CX0, CX1 = LP, W - RP  # canvas x range
TL = 640  # timeline top
FONT = 'font-family="Inter, -apple-system, Helvetica, Arial, sans-serif"'
INK, MUTED, LINE, FAINT = "#1E1E1E", "#8C8C8C", "#E6E6E6", "#F5F5F5"
BLUE, ORANGE = "#0D99FF", "#F97316"
OUT = Path(__file__).resolve().parent.parent / "public" / "shots"


def t(x, y, s, size=12, fill=INK, weight=400, anchor="start", extra=""):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}" {extra}>{escape(s)}</text>'


def svg(body, bg="#fff"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" {FONT}><rect width="{W}" height="{H}" fill="{bg}"/>{body}</svg>'


# ---------- left: agent chat ----------

def chat(items, typed=None, placeholder="Plan, Build, / for skills, @ for context", annotate=False):
    out = [f'<rect x="0" y="0" width="{LP}" height="{TL}" fill="#fff"/>', t(16, 30, "Agent", 13, weight=600), f'<path d="M0 48 H{LP}" stroke="{LINE}"/>']
    y = 68
    for it in items:
        kind = it[0]
        if kind == "you":
            lines = it[1]
            h = 14 + 16 * len(lines)
            out.append(f'<rect x="{LP - 16 - 190}" y="{y}" width="190" height="{h}" rx="8" fill="#F0F0F0"/>')
            out += [t(LP - 198, y + 19 + 16 * i, line) for i, line in enumerate(lines)]
            y += h + 10
        elif kind == "text":
            out += [t(16, y + 12 + 16 * i, line) for i, line in enumerate(it[1])]
            y += 16 * len(it[1]) + 10
        elif kind == "step":
            _, label, detail, done = it
            if done:
                out.append(f'<circle cx="22" cy="{y + 7}" r="6" fill="{INK}"/><path d="M19 {y + 7} l2 2 4 -4" stroke="#fff" stroke-width="1.5" fill="none"/>')
            else:
                out.append(f'<circle cx="22" cy="{y + 7}" r="5.5" fill="none" stroke="#D9D9D9" stroke-width="1.5"/><path d="M22 {y + 1.5} a5.5 5.5 0 0 1 5.5 5.5" stroke="{INK}" stroke-width="1.5" fill="none"/>')
            out.append(t(36, y + 11, label, fill=MUTED if done else INK))
            if detail:
                out.append(t(36, y + 27, detail, 11, MUTED))
            y += 40 if detail else 26
        elif kind == "thumbs":
            for i, c in enumerate(it[1]):
                x = 16 + (i % 3) * 78
                yy = y + (i // 3) * 50
                out.append(f'<rect x="{x}" y="{yy}" width="72" height="44" rx="3" fill="{c}" stroke="{LINE}"/>')
            y += 50 * ((len(it[1]) + 2) // 3) + 8
        elif kind == "card":
            _, q, opts, active = it
            h = 40 + 34 * (len(opts) + 1)
            out.append(f'<rect x="12" y="{y}" width="{LP - 24}" height="{h}" rx="12" fill="#fff" stroke="{LINE}"/>')
            out.append(t(26, y + 25, q, weight=600))
            for i, o in enumerate(opts):
                yy = y + 38 + 34 * i
                if i == active:
                    out.append(f'<rect x="18" y="{yy}" width="{LP - 36}" height="30" rx="8" fill="#F3F4F6"/>')
                    out.append(t(LP - 34, yy + 20, "→", fill=MUTED))
                out.append(f'<rect x="24" y="{yy + 4}" width="22" height="22" rx="5" fill="{"#E5E7EB" if i == active else FAINT}"/>')
                out.append(t(35, yy + 19, str(i + 1), 11, anchor="middle"))
                out.append(t(54, yy + 20, o, fill=INK if i == active else "#6B6B6B"))
            yy = y + 38 + 34 * len(opts)
            out.append(f'<rect x="24" y="{yy + 4}" width="22" height="22" rx="5" fill="{FAINT}"/>' + t(54, yy + 20, "Something else", fill=MUTED))
            out.append(f'<rect x="{LP - 64}" y="{yy + 5}" width="40" height="20" rx="5" fill="{FAINT}"/>' + t(LP - 44, yy + 19, "Skip", 11, "#6B6B6B", anchor="middle"))
            y += h + 10
    # input
    iy = 540
    out.append(f'<rect x="10" y="{iy}" width="{LP - 20}" height="88" rx="10" fill="#fff" stroke="{"#B3B3B3" if typed else LINE}"/>')
    if typed:
        out += [t(22, iy + 22 + 16 * i, line) for i, line in enumerate(typed)]
    else:
        out.append(t(22, iy + 22, placeholder, fill="#B3B3B3"))
    out.append(f'<circle cx="30" cy="{iy + 70}" r="9" fill="#fff" stroke="#D9D9D9"/><path d="M26 {iy + 70} h8 M30 {iy + 66} v8" stroke="{MUTED}" stroke-width="1.3"/>')
    out.append(f'<rect x="46" y="{iy + 61}" width="18" height="18" rx="4" fill="{ORANGE if annotate else "none"}"/>')
    out.append(f'<path d="M51 {iy + 64} l4 11 1.5 -4.5 4.5 -1.5 z" fill="none" stroke="{"#fff" if annotate else "#6B6B6B"}" stroke-width="1.3"/>')
    out.append(f'<circle cx="{LP - 30}" cy="{iy + 70}" r="10" fill="{INK}"/><path d="M{LP - 30} {iy + 75} v-10 M{LP - 34} {iy + 69} l4 -4 4 4" stroke="#fff" stroke-width="1.6" fill="none"/>')
    out.append(f'<path d="M{LP} 0 V{TL}" stroke="{LINE}"/>')
    return "".join(out)


# ---------- center: canvas ----------

def frame_box(x, y, w, h, fill, label=None, color="#fff", size=18, outline=None):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"/>'
    if label:
        s += t(x + w / 2, y + h / 2 + size / 3, label, size, color, 500, "middle")
    if outline:
        s += f'<rect x="{x - 2}" y="{y - 2}" width="{w + 4}" height="{h + 4}" fill="none" stroke="{outline}" stroke-width="2"/>'
    return s


def canvas(groups=(), annotate=False, x0=CX0 + 24, extra=""):
    out = [f'<rect x="{CX0}" y="0" width="{CX1 - CX0}" height="{TL}" fill="{FAINT}"/>', f'<clipPath id="cv"><rect x="{CX0}" y="0" width="{CX1 - CX0}" height="{TL}"/></clipPath><g clip-path="url(#cv)">']
    x = x0
    for name, frames, selected in groups:
        w = 16 + len(frames) * 180 + (len(frames) - 1) * 8
        out.append(f'<rect x="{x}" y="90" width="{w}" height="{24 + 112 + 8}" rx="12" fill="{"#BEE3F8" if selected else "none"}" stroke="{"#A6D5F3" if selected else "#D9D9D9"}"/>')
        out.append(t(x + 10, 107, name, 12, "#1A8CE0" if selected else "#5C5C5C"))
        for i, f in enumerate(frames):
            out.append(frame_box(x + 8 + i * 188, 114, 180, 112, *f))
        x += w + 48
    out.append(extra + "</g>")
    # toolbar
    tx = (CX0 + CX1) / 2 - 70
    out.append(f'<rect x="{tx}" y="590" width="140" height="32" rx="8" fill="#fff" stroke="{LINE}"/>')
    out.append(f'<rect x="{tx + 6}" y="595" width="22" height="22" rx="5" fill="{"none" if annotate else BLUE}"/>')
    for i in range(1, 5):
        out.append(f'<rect x="{tx + 12 + i * 24}" y="601" width="10" height="10" rx="2" fill="none" stroke="{INK}" stroke-width="1.3"/>')
    if annotate:
        out.append(f'<rect x="{CX0 + 1}" y="1" width="{CX1 - CX0 - 2}" height="{TL - 2}" fill="none" stroke="#FB923C" stroke-width="2"/>')
    return "".join(out)


# ---------- right: animate panel ----------

def panel(preview=("#2B2B2B", None, "#fff"), progress=0.0, section=""):
    x = CX1
    out = [f'<rect x="{x}" y="0" width="{RP}" height="{TL}" fill="#fff"/>', f'<path d="M{x} 0 V{TL}" stroke="{LINE}"/>']
    out.append(f'<circle cx="{x + 24}" cy="22" r="12" fill="#F24822"/>' + t(x + 24, 27, "J", 11, "#fff", 600, "middle"))
    out.append(f'<rect x="{x + 128}" y="9" width="56" height="26" rx="6" fill="#fff" stroke="{LINE}"/>' + t(x + 156, 26, "Share", 12, weight=500, anchor="middle"))
    out.append(f'<rect x="{x + 190}" y="9" width="58" height="26" rx="6" fill="{INK}"/>' + t(x + 219, 26, "Export", 12, "#fff", 500, "middle"))
    out.append(f'<rect x="{x + 8}" y="52" width="62" height="26" rx="6" fill="#F0F0F0"/>' + t(x + 39, 69, "Animate", 12, weight=500, anchor="middle") + t(x + 238, 69, "39%", 12, weight=500, anchor="end"))
    out.append(f'<path d="M{x} 88 H{W}" stroke="{LINE}"/>' + t(x + 12, 112, "Preview", 13, weight=600))
    out.append(f'<rect x="{x + 12}" y="124" width="{RP - 24}" height="150" rx="8" fill="#2B2B2B"/>')
    fill, label, color = preview
    out.append(frame_box(x + 24, 136, RP - 48, 126, fill, label, color, 22))
    out.append(f'<path d="M{x + 14} 286 l7 4 -7 4z" fill="{INK}"/><rect x="{x + 30}" y="289" width="170" height="3" rx="1.5" fill="{LINE}"/><rect x="{x + 30}" y="289" width="{170 * progress}" height="3" rx="1.5" fill="{INK}"/>' + t(x + 248, 293, "60.0s", 11, MUTED, anchor="end"))
    out.append(f'<path d="M{x} 310 H{W}" stroke="{LINE}"/>' + section)
    return "".join(out)


def motion_section(bezier=(0.58, 0.28, 0.15, 1)):
    x = CX1
    out = [t(x + 12, 336, "Cut 7 → 8", 13, weight=600)]
    rows = [("Animation", "Smart animate", False), ("Easing", "Custom bezier", True), ("Duration", "600 ms", False)]
    for i, (k, v, focus) in enumerate(rows):
        y = 350 + i * 34
        out.append(t(x + 12, y + 18, k, 12, MUTED))
        out.append(f'<rect x="{x + 84}" y="{y}" width="164" height="28" rx="6" fill="{FAINT if k == "Duration" else "#fff"}" stroke="{BLUE if focus else LINE}"/>' + t(x + 96, y + 18, v, 12, weight=500))
    gx, gy, gs = x + 12, 456, RP - 24
    x1, y1, x2, y2 = bezier
    px = lambda v: gx + 20 + v * (gs - 40)
    py = lambda v: gy + gs * 0.62 - v * gs * 0.34
    out.append(f'<rect x="{gx}" y="{gy}" width="{gs}" height="{gs * 0.75}" rx="8" fill="{FAINT}"/>')
    out.append(f'<path d="M{px(0)} {py(1)} H{px(1)} M{px(0)} {py(0)} H{px(1)}" stroke="#B3B3B3"/>')
    out.append(f'<path d="M{px(0)} {py(0)} L{px(x1)} {py(y1)} M{px(1)} {py(1)} L{px(x2)} {py(y2)}" stroke="{BLUE}" stroke-width="1.5"/>')
    out.append(f'<path d="M{px(0)} {py(0)} C{px(x1)} {py(y1)} {px(x2)} {py(y2)} {px(1)} {py(1)}" stroke="{INK}" stroke-width="2.5" fill="none"/>')
    out.append(f'<circle cx="{px(x1)}" cy="{py(y1)}" r="5" fill="#fff" stroke="{BLUE}" stroke-width="2"/><circle cx="{px(x2)}" cy="{py(y2)}" r="5" fill="#fff" stroke="{BLUE}" stroke-width="2"/>')
    return "".join(out)


def camera_section():
    x = CX1
    out = [t(x + 12, 336, "Frame 5", 13, weight=600), t(x + 12, 364, "Camera", 12, weight=600), t(x + 12, 382, "Pan & zoom", 11, MUTED)]
    bx, by, bw, bh = x + 12, 392, RP - 24, (RP - 24) / 1.6
    out.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="8" fill="#2E7D4F"/>')
    for i, c in enumerate(["#E9E4D8", "#E9E4D8", "#E9E4D8"]):
        out.append(f'<rect x="{bx + 10 + i * 76}" y="{by + 12}" width="{[110, 60, 30][i]}" height="{bh - 24}" fill="{c}"/>')
    out.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="8" fill="#000" opacity=".3"/>')
    cx, cw = bx + 120, 90
    out.append(f'<rect x="{cx}" y="{by + 10}" width="{cw}" height="{cw / 1.6}" fill="none" stroke="{BLUE}" stroke-width="2.5"/>')
    for ox, oy in [(0, 0), (cw, 0), (0, cw / 1.6), (cw, cw / 1.6)]:
        out.append(f'<circle cx="{cx + ox}" cy="{by + 10 + oy}" r="4" fill="{MUTED}" stroke="#fff"/>')
    out.append(f'<rect x="{bx}" y="{by + bh + 10}" width="{bw}" height="26" rx="6" fill="{FAINT}"/>' + t(bx + bw / 2, by + bh + 27, "Adjust the area to control zoom.", 11, "#6B6B6B", anchor="middle"))
    return "".join(out)


# ---------- bottom: timeline ----------

ACTS = [("Intro", 60), ("Sites", 300), ("Make", 210), ("Draw", 280), ("Buzz", 230), ("Outro", 120)]
THUMBS = ["#7A1E1E", "#7A1E1E", "#0B0B0B", "#F6F3EE", "#2E7D4F", "#2E7D4F", "#B9B0D4", "#0B0B0B", "#8E837B", "#0B0B0B", "#FAFAF8",
          "#0B0B0B", "#F1E3C6", "#F8C9B8", "#ECF7B5", "#F2EAD8", "#0B0B0B", "#C988D9", "#FFFFFF", "#ECECEC", "#F3D9E6", "#0B0B0B"]


def timeline(acts=True, active=1, playhead=0.3, time="0:00 / 1:17", select=None, readout=None, extra=""):
    out = [f'<rect x="0" y="{TL}" width="{W}" height="{H - TL}" fill="#fff"/>', f'<path d="M0 {TL} H{W}" stroke="{LINE}"/>']
    out.append(t(16, TL + 26, time, 11))
    out.append(f'<circle cx="720" cy="{TL + 21}" r="13" fill="{INK}"/><path d="M716 {TL + 15} l10 6 -10 6z" fill="#fff"/>')
    for dx in (-60, -36, 36, 60):
        out.append(f'<path d="M{720 + dx - 4} {TL + 16} v10" stroke="{MUTED}" stroke-width="1.5"/>')
    out.append(f'<path d="M1300 {TL + 21} h50" stroke="#D9D9D9" stroke-width="3"/><circle cx="1312" cy="{TL + 21}" r="6" fill="{INK}"/>')
    x0, span = 16, W - 32
    for s in range(0, 80, 10):
        xx = x0 + span * s / 77
        out.append(t(xx, TL + 62, f"00:{s:02d}" if s < 60 else f"01:{s - 60:02d}", 11, "#B3B3B3") + f'<path d="M{xx} {TL + 68} v8" stroke="#D9D9D9"/>')
    if acts:
        total = sum(w for _, w in ACTS)
        x = x0
        for i, (label, w) in enumerate(ACTS):
            ww = span * w / total
            on = i == active
            out.append(f'<rect x="{x}" y="{TL + 84}" width="{ww - 3}" height="34" rx="6" fill="{BLUE if on else "#fff"}" stroke="{BLUE if on else "#D9D9D9"}"/>' + t(x + ww / 2, TL + 106, label, 12, "#fff" if on else INK, anchor="middle"))
            x += ww
        tw = span / len(THUMBS)
        for i, c in enumerate(THUMBS):
            out.append(f'<rect x="{x0 + i * tw}" y="{TL + 126}" width="{tw - 3}" height="28" rx="3" fill="{c}" stroke="{LINE}"/>')
            if select == i:
                sx = x0 + i * tw
                out.append(f'<rect x="{sx}" y="{TL + 126}" width="{tw - 3}" height="28" rx="3" fill="none" stroke="{BLUE}" stroke-width="2.5"/>')
                out.append(f'<rect x="{sx}" y="{TL + 126}" width="7" height="28" rx="2" fill="{INK}" opacity=".75"/><rect x="{sx + tw - 10}" y="{TL + 126}" width="7" height="28" rx="2" fill="{INK}" opacity=".75"/>')
        px = x0 + span * playhead
        out.append(f'<path d="M{px - 4} {TL + 74} h8 l-4 5z" fill="{MUTED}"/><path d="M{px} {TL + 80} V{H - 60}" stroke="{BLUE}" stroke-width="1.5"/>')
    if readout:
        rx, text = readout
        out.append(f'<rect x="{rx - 50}" y="{TL + 100}" width="100" height="20" rx="4" fill="{INK}"/>' + t(rx, TL + 114, text, 11, "#fff", anchor="middle"))
    return "".join(out) + extra


# ---------- overlays ----------

def comment_box(x, y, chip, text, chip_fill="#0B0B0B"):
    out = [f'<rect x="{x}" y="{y}" width="270" height="110" rx="10" fill="#fff" stroke="#B3B3B3"/>']
    out.append(f'<rect x="{x + 10}" y="{y + 10}" width="150" height="24" rx="6" fill="{FAINT}" stroke="{LINE}"/><rect x="{x + 13}" y="{y + 13}" width="28" height="18" rx="3" fill="{chip_fill}"/>' + t(x + 48, y + 27, chip, 11))
    out.append(t(x + 12, y + 58, text, 13))
    out.append(f'<circle cx="{x + 20}" cy="{y + 92}" r="9" fill="#fff" stroke="#D9D9D9"/><path d="M{x + 16} {y + 92} h8 M{x + 20} {y + 88} v8" stroke="{MUTED}" stroke-width="1.3"/>')
    out.append(f'<circle cx="{x + 250}" cy="{y + 92}" r="10" fill="{INK}"/><path d="M{x + 250} {y + 97} v-10 M{x + 246} {y + 91} l4 -4 4 4" stroke="#fff" stroke-width="1.6" fill="none"/>')
    return "".join(out)


def tooltip(x, y):
    return (f'<rect x="{x}" y="{y}" width="250" height="78" rx="9" fill="{INK}"/>' + t(x + 12, y + 24, "Select an element or annotate", 12, "#fff", 500)
            + t(x + 238, y + 24, "⇧⌘S", 11, "#A3A3A3", anchor="end") + t(x + 12, y + 44, "Point at a layer, frame, cut or act, or at a", 11, "#A3A3A3")
            + t(x + 12, y + 60, "moment. The agent gets a snapshot of it.", 11, "#A3A3A3"))


# ---------- the screens ----------

INTRO = ("Intro", [("#7A1E1E", "Figma"), ("#7A1E1E", "Figma")], False)
SITES = ("Figma Sites", [("#0B0B0B", "Figma Sites"), ("#F6F3EE", "Browse everything.", INK, 14), ("#2E7D4F", "Sabi", "#E9E4D8", 26)], False)
MAKE = lambda big=False, sel=False: ("Figma Make", [("#0B0B0B", "Figma Make", "#FF5CD9", 26 if big else 18, BLUE if sel else None), ("#8E837B", "Prompt", "#fff", 14), ("#0B0B0B", "✳ Thinking…", "#fff", 16)], False)
DRAW = ("Figma Draw", [("#0B0B0B", "Figma Draw"), ("#F1E3C6", None)], False)

DRAFT_CHAT = [
    ("you", ["figma.com/config, 60s launch reel:", "intro, Sites, Make, Draw, Buzz,", "end on the logo."]),
    ("step", "Reading figma.com/config", "Pages, product copy and features", True),
    ("step", "Capturing screens", "12 screens at 1440 × 900", True),
    ("step", "Outlining the narrative arc", "Intro → Sites → Make → Draw → Buzz", True),
    ("step", "Drafting storyboard frames", "22 frames with copy and screenshots", True),
]
READY_CHAT = [
    ("step", "Drafting storyboard frames", "22 frames with copy and screenshots", True),
    ("text", ["✓ Approved, continuing"]),
    ("step", "Recording screen flows", "Sites, Make, Draw and Buzz", True),
    ("step", "Matching layers between frames", None, True),
    ("step", "Timing cuts to your outline", None, True),
    ("text", ["The animated reel is ready: 22 frames,", "about 77s. Press ▷ to preview it."]),
]

SCREENS = {
    "demo-empty": chat([], placeholder="Paste your product URL and an outline") + canvas() + panel() + timeline(acts=False, time="0:00 / 0:00"),
    "demo-prompt": chat([], typed=["figma.com/config, 60s launch reel:", "intro, Sites, Make, Draw, Buzz, end", "on the logo."]) + canvas() + panel() + timeline(acts=False, time="0:00 / 0:00"),
    "demo-agent": chat([
        ("you", ["figma.com/config, 60s launch reel:", "intro, Sites, Make, Draw, Buzz,", "end on the logo."]),
        ("text", ["On it. I'll read figma.com/config, pull", "screens and draft a storyboard."]),
        ("step", "Reading figma.com/config", "Pages, product copy and features", True),
        ("step", "Capturing screens", "12 screens at 1440 × 900", True),
        ("thumbs", ["#F6F3EE", "#2E7D4F", "#B9B0D4", "#8E837B", "#FAFAF8", "#F1E3C6"]),
        ("step", "Outlining the narrative arc", None, False),
    ]) + canvas([INTRO]) + panel() + timeline(acts=False, time="0:00 / 0:00"),
    "demo-drafted": chat(DRAFT_CHAT + [("card", "Does this storyboard look right?", ["Yes, continue", "No, request changes"], 0)]) + canvas([INTRO, SITES]) + panel(("#7A1E1E", "Figma", "#fff")) + timeline(active=0, playhead=0, time="0:00 / 1:17"),
    "demo-ready": chat(READY_CHAT) + canvas([INTRO, SITES]) + panel(("#0B0B0B", "Figma Make", "#FF5CD9"), 0.4) + timeline(active=2, playhead=0.36, time="0:28 / 1:17"),
    "demo-tooltip": chat(READY_CHAT, annotate=True) + canvas([MAKE(), DRAW], annotate=True) + panel(("#0B0B0B", "Figma Make", "#FF5CD9"), 0.4) + timeline(active=2, playhead=0.36, time="0:28 / 1:17") + tooltip(14, 450),
    "demo-comment": chat(READY_CHAT, annotate=True) + canvas([MAKE(sel=True), DRAW], annotate=True, extra=comment_box(400, 200, "Frame 8 › Title", "make it bigger")) + panel(("#0B0B0B", "Figma Make", "#FF5CD9"), 0.4) + timeline(active=2, playhead=0.36, time="0:28 / 1:17"),
    "demo-updated": chat(READY_CHAT[2:] + [("you", ["Frame 8 › Title: make it bigger"]), ("text", ["Made it bigger."])]) + canvas([MAKE(big=True), DRAW]) + panel(("#0B0B0B", "Figma Make", "#FF5CD9", ), 0.4) + timeline(active=2, playhead=0.36, time="0:28 / 1:17"),
    "demo-moment": chat(READY_CHAT, annotate=True) + canvas([MAKE(), DRAW], annotate=True) + panel(("#0B0B0B", "Figma Make", "#FF5CD9"), 0.4) + timeline(active=1, playhead=0.29, time="0:22 / 1:17", extra=comment_box(450, TL + 52 - 120, "0:22 · Frame 7", "this drags, make it snappy", "#B9B0D4")),
    "demo-motion": chat(READY_CHAT) + canvas([SITES, MAKE()], extra=f'<rect x="{CX0 + 24 + 16 + 3 * 180 + 2 * 8 + 48 - 4}" y="114" width="12" height="112" rx="3" fill="{BLUE}" opacity=".45"/>') + panel(("#B9B0D4", "Absence, Presence", "#fff"), 0.3, motion_section()) + timeline(active=1, playhead=0.28, time="0:21 / 1:17"),
    "demo-camera": chat(READY_CHAT) + canvas([("Figma Sites", [("#0B0B0B", "Figma Sites"), ("#F6F3EE", "Browse everything.", INK, 14), ("#2E7D4F", "Sabi", "#E9E4D8", 26, BLUE)], False)]) + panel(("#E9E4D8", "Sabi", INK), 0.2, camera_section()) + timeline(active=1, playhead=0.16, time="0:12 / 1:17"),
    "demo-trim": chat(READY_CHAT) + canvas([SITES]) + panel(("#F6F3EE", "Browse everything.", INK), 0.15) + timeline(active=1, playhead=0.13, time="0:10 / 1:17", select=3, readout=(16 + (W - 32) / 22 * 4 + 20, "Hold 2.40s")),
}

OLD_TIMELINE = svg(
    "".join(
        f'<rect x="0" y="{60 + i * 52}" width="{W}" height="51" fill="{"#1C1C20" if i % 2 else "#18181B"}"/>'
        + t(20, 92 + i * 52, name, 15, "#9CA3AF")
        + "".join(f'<path d="M{x} {78 + i * 52} l9 9 -9 9 -9 -9z" fill="{c}"/>' for x, c in zip(range(300 + (i * 37) % 90, 1420, 70 + (i * 13) % 50), ["#F59E0B", "#60A5FA", "#A78BFA", "#34D399"] * 20))
        for i, name in enumerate(["Position", "Scale", "Rotation", "Opacity", "Anchor point", "Mask path", "Blur", "Position", "Scale", "Opacity", "Color", "Stroke", "Trim paths", "Offset", "Skew", "Path"])
    )
    + f'<rect width="{W}" height="60" fill="#111114"/>' + t(20, 38, "0;00;03;14", 18, "#60A5FA", 600)
    + "".join(t(300 + s * 70, 38, f"{s // 2:02d}:{(s % 2) * 15:02d}f", 12, "#6B7280") for s in range(16))
    + '<path d="M612 60 V900" stroke="#EF4444" stroke-width="2"/>',
    "#141417",
)

SKETCH = svg(
    "".join(
        f'<rect x="{x}" y="{y}" width="300" height="190" fill="#fff" stroke="#2A2A2A" stroke-width="4" transform="rotate({r} {x + 150} {y + 95})"/>'
        + inner
        + t(x, y + 230, cap, 22, "#444", extra='font-style="italic"')
        for x, y, r, inner, cap in [
            (120, 160, -1.5, '<rect x="170" y="210" width="200" height="90" fill="none" stroke="#2A2A2A" stroke-width="3"/><path d="M190 240 h120 M190 265 h80" stroke="#2A2A2A" stroke-width="3"/>', "1. hero comes in"),
            (560, 140, 1, '<circle cx="710" cy="235" r="50" fill="none" stroke="#2A2A2A" stroke-width="3"/><path d="M640 190 l40 30" stroke="#E8592B" stroke-width="4"/>', "2. zoom on the chart"),
            (1000, 170, -1, '<path d="M1040 300 h220 M1040 270 h160 M1040 240 h190" stroke="#2A2A2A" stroke-width="3"/><path d="M1180 210 l30 -20" stroke="#E8592B" stroke-width="4"/>', "3. list slides up"),
            (560, 520, 0.5, '<path d="M640 600 h140 l-20 -16 M780 600 l-20 16" stroke="#2A2A2A" stroke-width="3" fill="none"/><circle cx="820" cy="600" r="20" fill="none" stroke="#2A2A2A" stroke-width="3"/>', "4. end on logo"),
        ]
    )
    + '<path d="M440 250 q50 -40 100 -10 l-12 -10 M540 240 l-14 4" stroke="#E8592B" stroke-width="5" fill="none"/>'
    + '<path d="M880 240 q60 -30 110 0 l-14 -8 M990 232 l-12 8" stroke="#E8592B" stroke-width="5" fill="none"/>'
    + '<path d="M1120 420 q-150 120 -260 140 l14 6 M860 560 l10 -12" stroke="#E8592B" stroke-width="5" fill="none"/>',
    "#F4EFE4",
)

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in SCREENS.items():
        (OUT / f"{name}.svg").write_text(svg(body))
    (OUT / "demo-old-timeline.svg").write_text(OLD_TIMELINE)
    (OUT / "demo-storyboard-sketch.svg").write_text(SKETCH)
    print("wrote", len(SCREENS) + 2, "screens to", OUT)
