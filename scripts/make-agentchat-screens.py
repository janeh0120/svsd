"""Draw the screens for the example reel (public/shots/ac-*.svg): a launch for a
fictional product, Relay Playbooks, a support agent that finds why customers
ask for a person and drafts a playbook to fix it.

Illustrations in the style of the reference storyboard, not screenshots.
The prompt box, cursor and title are separate layers in the draft so they can
move between frames; these are the panels behind them. The title and prompt frames use solid colors.
Run: python3 scripts/make-agentchat-screens.py
"""
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent.parent / "public" / "shots"
FONT = 'font-family="Inter, -apple-system, Helvetica, Arial, sans-serif"'
INK, MUTED, LINE = "#1E1E1E", "#8C8C8C", "#E6E6E6"


def t(x, y, s, size=14, fill=INK, weight=400, anchor="start", family=""):
    fam = f'font-family="{family}"' if family else ""
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}" {fam}>{escape(s)}</text>'


def svg(body, w=1440, h=900, bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" {FONT}>{rect}{body}</svg>'


def tag(x, y, label, color, bg):
    w = 10 + len(label) * 8.2
    return f'<rect x="{x}" y="{y - 17}" width="{w}" height="24" rx="6" fill="{bg}"/>' + t(x + 8, y, label, 14, color, 500)


# 3. Mouse cursor.
CURSOR = svg('<path d="M6 3l9 24 3.4-10 10-3.4z" fill="#111" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>', 36, 36)


# 4. Dark workspace collage: workflow graph, system tools, live transcript.
def node(x, y, w, title, rows):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{58 + 22 * len(rows)}" rx="10" fill="#1B1B1F" stroke="#2E2E35"/>' + t(x + 14, y + 26, "⚑ " + title, 14, "#E6E6EA", 500)
    for i, r in enumerate(rows):
        s += f'<rect x="{x + 14}" y="{y + 40 + 22 * i}" width="56" height="16" rx="4" fill="#2A2A31"/>' + t(x + 80, y + 53 + 22 * i, r, 12, "#8B8B95")
    return s


workspace = [
    '<rect width="1440" height="900" fill="#26252B"/>',
    '<rect x="40" y="40" width="760" height="400" rx="14" fill="#141417"/>',
    t(80, 70, "Relay · Support flows", 13, "#8B8B95", 500),
    node(80, 90, 240, "Identify customer", ["412 conversations"]),
    node(80, 250, 240, "Look up subscription", ["288 conversations"]),
    node(470, 150, 250, "Hand off to billing", ["96 conversations"]),
    '<path d="M320 120 C 400 120, 390 200, 470 200 M320 290 C 400 290, 390 210, 470 210" stroke="#4B4B55" stroke-width="2" fill="none"/>',
    '<rect x="380" y="185" width="70" height="22" rx="6" fill="#2A2A31"/>' + t(390, 201, "Fallback", 12, "#9A9AA4"),
    '<rect x="40" y="480" width="560" height="380" rx="14" fill="#141417"/>',
    t(70, 520, "Connected tools", 20, "#F2F2F5", 500), t(70, 554, "3 active", 13, "#8B8B95"),
]
for i, (label, on) in enumerate([("Stripe billing", True), ("Shopify orders", True), ("Twilio SMS", True), ("Zendesk handoff", False), ("Slack alerts", False)]):
    y = 590 + i * 50
    workspace.append(f'<rect x="70" y="{y - 14}" width="36" height="20" rx="10" fill="{"#E6E6EA" if on else "#3A3A42"}"/><circle cx="{94 if on else 80}" cy="{y - 4}" r="7" fill="{"#141417" if on else "#8B8B95"}"/>' + t(122, y + 1, label, 15, "#D6D6DC"))
workspace += [
    '<rect x="880" y="40" width="520" height="820" rx="14" fill="#141417"/>',
    t(910, 80, "Live conversation · #48211", 14, "#8B8B95"),
]
for i, (who, text, mine) in enumerate([
    ("Relay", "Hi Priya! I can update your plan. First, can you confirm the email on your account?", True),
    ("Priya", "It's under my old work email and I can't get into it anymore. Can I talk to someone?", False),
    ("Relay", "No problem. I'm connecting you with our billing team now.", True),
]):
    y = 130 + i * 220
    workspace.append(f'<circle cx="926" cy="{y}" r="16" fill="{"#7C6CF2" if mine else "#4B4B55"}"/>' + t(952, y + 5, who, 14, "#E6E6EA", 500))
    words, line, lines = text.split(), "", []
    for wd in words:
        if len(line) + len(wd) > 44:
            lines.append(line)
            line = ""
        line += wd + " "
    lines.append(line)
    workspace += [t(952, y + 36 + 22 * j, ln.strip(), 14, "#B9B9C2") for j, ln in enumerate(lines)]
WORKSPACE = svg("".join(workspace))

# 5. "Gathering data" checklist card (a separate layer that pops in).
GATHERING = svg(
    '<rect x="1" y="1" width="518" height="288" rx="16" fill="#fff" stroke="#E2E2E2"/>'
    + '<circle cx="36" cy="44" r="11" fill="none" stroke="#6B6B6B" stroke-width="2"/>' + t(58, 51, "Analyzing 1,284 handoffs", 22, INK, 500)
    + '<path d="M1 82 H519" stroke="#EDEDED"/>'
    + "".join(
        f'<circle cx="36" cy="{124 + i * 54}" r="11" fill="#9A9A9A"/><path d="M31 {124 + i * 54} l4 4 7 -8" stroke="#fff" stroke-width="2.2" fill="none"/>' + t(58, 131 + i * 54, label, 19, "#7A7A7A")
        for i, label in enumerate(["Reading this week's transcripts", "Clustering handoff reasons", "Checking billing policies"])
    ),
    520, 290,
)

# 6. The agent's finding and proposed fix, plus the user's reply.
THOUGHT = svg(
    '<rect width="1440" height="900" fill="#FBFAF8"/>'
    + '<rect x="0" y="0" width="300" height="900" fill="#F3F1EE"/>' + t(40, 70, "Playbooks", 16, "#6B6B6B", 500)
    + "".join(t(40, 120 + i * 44, s, 15, "#8C8C8C") for i, s in enumerate(["Plan changes", "Login recovery", "Refunds", "Billing handoffs"]))
    + '<circle cx="400" cy="150" r="10" fill="none" stroke="#9A9A9A" stroke-width="2"/>' + t(420, 156, "Thought for 12s", 16, "#9A9A9A")
    + t(392, 210, "48% of handoffs happen when customers can't get into", 26, INK) + t(392, 246, "the email on their account.", 26, INK)
    + '<rect x="392" y="296" width="640" height="120" rx="14" fill="#fff" stroke="#E6E6E6"/>'
    + t(420, 340, "Proposed playbook: Login recovery", 20, INK, 600) + t(420, 378, "Verify with phone number + last invoice amount instead", 18, "#6B6B6B")
    + '<rect x="760" y="500" width="560" height="190" rx="18" fill="#fff" stroke="#E6E6E6"/>'
    + t(790, 548, "Love it. Check the invoice in", 20, INK) + t(1072, 548, "@stripe", 20, "#3B82F6", 500)
    + t(790, 580, "and send the reset link by", 20, INK) + t(1040, 580, "@sms", 20, "#3B82F6", 500)
    + '<rect x="790" y="620" width="96" height="36" rx="8" fill="#F5F5F5"/>' + t(812, 644, "Stripe", 16, "#4B4B4B")
    + '<rect x="898" y="620" width="132" height="36" rx="8" fill="#F5F5F5"/>' + t(920, 644, "Twilio SMS", 16, "#4B4B4B")
)

# 7. The new procedure's steps, with Reject / Approve at the bottom right.
rows = [
    (1, "", [("Tell", "#0E9F6E", "#DEF7EC")], "the customer we can verify them without email"),
    (2, "", [("Ask", "#2563EB", "#E1EFFE")], "for the phone number and their last invoice amount"),
    (3, "", [("Tool", "#C2410C", "#FDEBDD"), ("stripe_find_customer", "#C2410C", "#FDEBDD")], "using the phone number"),
    (3.1, "  ", [("If", "#DB2777", "#FCE7F3"), ("Tool fails", "#C2410C", "#FDEBDD")], "ask for the card's last four digits and try once more"),
    (4, "", [("If", "#DB2777", "#FCE7F3")], "the invoice amount matches"),
    (4.1, "  ", [("Say", "#0E9F6E", "#DEF7EC")], "Thanks, you're verified. Sending a secure link now."),
    (4.2, "  ", [("Tool", "#C2410C", "#FDEBDD"), ("send_sms_reset_link", "#C2410C", "#FDEBDD")], ""),
    (5, "", [("Else If", "#DB2777", "#FCE7F3")], "verification still fails"),
    (5.1, "  ", [("Tool", "#C2410C", "#FDEBDD"), ("handoff_to_billing", "#C2410C", "#FDEBDD")], ""),
]
steps = ['<rect width="1440" height="900" fill="#FBFAF8"/>', '<rect x="0" y="0" width="300" height="900" fill="#F3F1EE"/>', t(40, 70, "Playbooks", 16, "#6B6B6B", 500)]
steps += [t(40, 120 + i * 44, s, 15, "#8C8C8C") for i, s in enumerate(["Plan changes", "Login recovery", "Refunds", "Billing handoffs"])]
steps += ['<rect x="340" y="40" width="1060" height="820" rx="18" fill="#fff" stroke="#E6E6E6"/>', t(380, 90, "Login recovery", 24, INK, 600) + '<rect x="568" y="70" width="92" height="26" rx="13" fill="#F1F7E4"/>' + t(614, 88, "New · Draft", 13, "#46690C", 500, "middle"), t(380, 130, "Steps · Suggested by Relay from 1,284 handoffs", 15, MUTED)]
for i, (n, indent, tags, text) in enumerate(rows):
    y = 180 + i * 58
    x = 380 + (40 if indent else 0)
    steps.append(t(x, y, f"{n}." if isinstance(n, int) else str(n), 15, MUTED))
    x += 36
    for label, color, bg in tags:
        steps.append(tag(x, y, label, color, bg))
        x += 18 + len(label) * 8.2
    steps.append(t(x + 4, y, text, 16, INK))
steps += [t(380, 720, "+ Add step", 15, MUTED)]
steps += [t(1186, 832, "Reject", 20, INK, 500, "middle"), '<rect x="1240" y="802" width="130" height="46" rx="12" fill="#111"/>', t(1305, 832, "Approve", 20, "#fff", 500, "middle")]
STEPS = svg("".join(steps))

if __name__ == "__main__":
    files = {
        "ac-cursor": CURSOR, "ac-workspace": WORKSPACE,
        "ac-gathering": GATHERING, "ac-thought": THOUGHT, "ac-steps": STEPS,
    }
    for name, body in files.items():
        (OUT / f"{name}.svg").write_text(body)
    print("wrote", len(files), "screens to", OUT)
