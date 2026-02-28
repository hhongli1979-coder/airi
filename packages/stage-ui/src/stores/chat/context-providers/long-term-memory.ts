import type { ContextMessage } from '../../../types/chat'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { nanoid } from 'nanoid'

import { useLongTermMemoryStore } from '../../modules/memory-long-term'

const LONG_TERM_MEMORY_CONTEXT_ID = 'system:long-term-memory'

/**
 * Creates a context message containing all active long-term memory entries.
 * Returns `null` when the long-term memory module is disabled or has no entries.
 *
 * This context is injected before each chat message so AIRI always has access
 * to important facts about the user regardless of which session is active.
 */
export function createLongTermMemoryContext(): ContextMessage | null {
  const store = useLongTermMemoryStore()
  const entries = store.getEntriesForContext()

  if (entries.length === 0)
    return null

  const memoriesText = entries
    .map((entry, index) => {
      const tagsNote = entry.tags.length > 0 ? ` [${entry.tags.join(', ')}]` : ''
      return `${index + 1}. ${entry.content}${tagsNote}`
    })
    .join('\n')

  return {
    id: nanoid(),
    contextId: LONG_TERM_MEMORY_CONTEXT_ID,
    strategy: ContextUpdateStrategy.ReplaceSelf,
    text: `Long-term memories about the user (always keep these in mind):\n${memoriesText}`,
    createdAt: Date.now(),
  }
}
