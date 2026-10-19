import type { Storyboard } from '../types'
import { figmaConfigDraft } from './figmaConfigDraft'
import { productDemoDraft } from './productDemoDraft'

// Stand-in for the AI's first draft. A prompt about Figma gets the Config 2025
// example reel; anything else gets this product's own demo reel.
// Swap for a Claude call that returns a Storyboard.
export function mockDraft(prompt = ''): Storyboard {
  return /figma/i.test(prompt) ? figmaConfigDraft() : productDemoDraft()
}
