import type { Storyboard } from '../types'
import { agentChatDraft } from './agentChatDraft'
import { figmaConfigDraft } from './figmaConfigDraft'
import { productDemoDraft } from './productDemoDraft'

// Stand-in for the AI's first draft. The default is the Agent Chat example reel;
// a prompt about Figma gets the Config 2025 reel, and one about this storyboard
// editor gets its own demo reel (which switches to screen recordings on approval).
// Swap for a Claude call that returns a Storyboard.
export function mockDraft(prompt = ''): Storyboard {
  if (/figma/i.test(prompt)) return figmaConfigDraft()
  if (/storyboard|motion editor/i.test(prompt)) return productDemoDraft()
  return agentChatDraft()
}
