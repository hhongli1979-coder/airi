import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Short-term memory controls how many recent messages AIRI keeps in the active
 * context window.  Older messages beyond the limit are trimmed before each LLM
 * call so the prompt stays within a manageable size.
 *
 * The system message (index 0) is always preserved.
 */
export const useShortTermMemoryStore = defineStore('memory:short-term', () => {
  /** Whether the context-window trimming is active. */
  const enabled = useLocalStorageManualReset<boolean>('settings/memory/short-term/enabled', true)

  /**
   * Maximum number of *non-system* messages to keep in the context window.
   * Pairs of (user + assistant) count as 2.  Set to 0 to disable the limit.
   */
  const maxMessages = useLocalStorageManualReset<number>('settings/memory/short-term/max-messages', 20)

  /**
   * Approximate maximum token budget for context history.
   * Rough estimate: 1 token ≈ 4 characters of text.
   * Set to 0 to disable the limit.
   */
  const maxTokens = useLocalStorageManualReset<number>('settings/memory/short-term/max-tokens', 4000)

  /**
   * When true, a brief summary of trimmed messages is prepended so AIRI does
   * not completely lose track of earlier conversation topics.
   */
  const summarizeOnTrim = useLocalStorageManualReset<boolean>('settings/memory/short-term/summarize-on-trim', false)

  const configured = computed(() => enabled.value)

  function resetState() {
    enabled.reset()
    maxMessages.reset()
    maxTokens.reset()
    summarizeOnTrim.reset()
  }

  /**
   * Trim a messages array to respect the configured limits.
   * Always keeps index 0 (the system message).
   *
   * @param messages Full message list (including system message at [0]).
   * @returns A possibly-shorter copy that respects `maxMessages` and `maxTokens`.
   */
  function trimMessages<T extends { role: string, content: unknown }>(messages: T[]): T[] {
    if (!enabled.value)
      return messages

    const [system, ...rest] = messages

    let trimmed = rest

    // Apply message-count limit
    if (maxMessages.value > 0 && trimmed.length > maxMessages.value) {
      trimmed = trimmed.slice(trimmed.length - maxMessages.value)
    }

    // Apply approximate token limit (4 chars ≈ 1 token)
    if (maxTokens.value > 0) {
      let tokenEstimate = 0
      const budgeted: T[] = []
      for (let i = trimmed.length - 1; i >= 0; i--) {
        const content = trimmed[i].content
        const text = typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .map((p: unknown) => {
                  if (typeof p === 'string')
                    return p
                  if (p && typeof p === 'object' && 'text' in (p as object))
                    return String((p as { text: unknown }).text ?? '')
                  return ''
                })
                .join('')
            : JSON.stringify(content)
        tokenEstimate += Math.ceil(text.length / 4)
        if (tokenEstimate > maxTokens.value)
          break
        budgeted.unshift(trimmed[i])
      }
      trimmed = budgeted
    }

    return system ? [system, ...trimmed] : trimmed
  }

  return {
    enabled,
    maxMessages,
    maxTokens,
    summarizeOnTrim,
    configured,
    trimMessages,
    resetState,
  }
})
