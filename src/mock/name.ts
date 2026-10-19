// Stand-in for the agent's guess at a file name from the first prompt: the brand
// (from a URL or a capitalised product name) plus the kind of video, e.g.
// "Linear Launch Video". Swap for a Claude call that returns a short title.

const KINDS: [RegExp, string][] = [
  [/\blaunch/i, 'Launch Video'],
  [/\bdemo\b/i, 'Product Demo'],
  [/\bexplain/i, 'Explainer'],
  [/\bteaser/i, 'Teaser'],
  [/\bpromo/i, 'Promo'],
  [/\bwalk-?through/i, 'Walkthrough'],
  [/\btutorial|how[- ]to/i, 'Tutorial'],
  [/\bonboarding/i, 'Onboarding Video'],
  [/\bannounce/i, 'Announcement'],
  [/\bsizzle|recap/i, 'Recap Reel'],
  [/\bads?\b|commercial/i, 'Ad'],
]

const STOP = new Set(
  'a an and the for of to in on with my our your this that me us it is are be make create want need video reel please can you i we about from using show'.split(' '),
)

const title = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

function brandOf(prompt: string) {
  const host = prompt.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(?:app|com|io|dev|co|ai|so|design|net|org)\b/i)?.[1]
  if (host) return title(host)
  // A capitalised word that doesn't start a sentence is probably a product name.
  const named = prompt.match(/[^.!?\s]\s+([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+)?)/)?.[1]
  return named && !STOP.has(named.toLowerCase()) ? named : null
}

export function guessName(prompt: string) {
  const brand = brandOf(prompt)
  const kind = KINDS.find(([re]) => re.test(prompt))?.[1]
  if (brand) return `${brand} ${kind ?? 'Video'}`
  const words = prompt
    .replace(/https?:\/\/\S+/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((w) => !STOP.has(w) && !KINDS.some(([re]) => re.test(w)))
    .slice(0, 3)
  if (!words?.length) return kind ?? 'Untitled Video'
  return [...words.map(title), kind].filter(Boolean).join(' ')
}
