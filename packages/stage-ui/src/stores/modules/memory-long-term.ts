import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export interface MemoryEntry {
  id: string
  content: string
  tags: string[]
  /** Source that created this entry: 'manual' | 'self-learning' */
  source: 'manual' | 'self-learning'
  /** 0–1: higher = more confident / frequently reinforced */
  confidence: number
  /** Number of times this entry was retrieved/used in a context */
  useCount: number
  createdAt: number
  updatedAt: number
}

/**
 * Long-term memory stores facts and key information AIRI should remember
 * across all sessions.
 *
 * Entries are persisted in localStorage and injected as a context message
 * before every LLM call so AIRI always has them in view.
 *
 * Each entry carries a confidence score (0–1) inspired by ruflo's EWC++
 * confidence lifecycle: entries used frequently gain confidence, stale ones
 * decay so the injected context stays relevant.
 */
export const useLongTermMemoryStore = defineStore('memory:long-term', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/memory/long-term/enabled', true)

  /**
   * Maximum number of memory entries to inject into each chat context.
   * Highest-confidence entries are preferred.
   * Set to 0 to inject all entries.
   */
  const maxInjectedEntries = useLocalStorageManualReset<number>('settings/memory/long-term/max-injected', 10)

  /** All persisted memory entries. */
  const entries = useLocalStorage<MemoryEntry[]>('settings/memory/long-term/entries', [])

  const configured = computed(() => enabled.value && entries.value.length > 0)

  /** Entries sorted by confidence desc, then updatedAt desc. */
  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) =>
      b.confidence !== a.confidence
        ? b.confidence - a.confidence
        : b.updatedAt - a.updatedAt,
    ),
  )

  function addEntry(
    content: string,
    tags: string[] = [],
    source: MemoryEntry['source'] = 'manual',
  ): MemoryEntry {
    const now = Date.now()
    const entry: MemoryEntry = {
      id: nanoid(),
      content: content.trim(),
      tags,
      source,
      confidence: source === 'self-learning' ? 0.6 : 0.8,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    entries.value = [...entries.value, entry]
    return entry
  }

  function updateEntry(id: string, content: string, tags?: string[]) {
    entries.value = entries.value.map(entry =>
      entry.id === id
        ? {
            ...entry,
            content: content.trim(),
            tags: tags ?? entry.tags,
            updatedAt: Date.now(),
          }
        : entry,
    )
  }

  function deleteEntry(id: string) {
    entries.value = entries.value.filter(entry => entry.id !== id)
  }

  function clearAllEntries() {
    entries.value = []
  }

  /**
   * Boost the confidence of an entry when it is actively used.
   * Mirrors ruflo's "boost confidence for useful patterns" behaviour.
   */
  function boostConfidence(id: string, delta = 0.05) {
    entries.value = entries.value.map(entry =>
      entry.id === id
        ? {
            ...entry,
            confidence: Math.min(1, entry.confidence + delta),
            useCount: entry.useCount + 1,
            updatedAt: Date.now(),
          }
        : entry,
    )
  }

  /**
   * Apply a gentle confidence decay to entries that have not been accessed
   * recently.  Intended to be called periodically (e.g. once per day).
   * Entries below 0.1 confidence are pruned if `pruneBelow` is enabled.
   */
  function decayConfidence(decayRate = 0.02, pruneBelow = 0.05) {
    const now = Date.now()
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    entries.value = entries.value
      .map((entry) => {
        const ageWeeks = (now - entry.updatedAt) / oneWeekMs
        const decayed = entry.confidence - decayRate * ageWeeks
        return { ...entry, confidence: Math.max(0, decayed) }
      })
      .filter(entry => entry.confidence >= pruneBelow)
  }

  /**
   * Returns the entries that should be injected into the current chat context,
   * respecting `maxInjectedEntries` and ranked by confidence.
   */
  function getEntriesForContext(): MemoryEntry[] {
    if (!enabled.value)
      return []
    const sorted = sortedEntries.value
    if (maxInjectedEntries.value > 0)
      return sorted.slice(0, maxInjectedEntries.value)
    return sorted
  }

  function resetState() {
    enabled.reset()
    maxInjectedEntries.reset()
    // Intentionally keep entries – the user must clear them explicitly.
  }

  return {
    enabled,
    maxInjectedEntries,
    entries,
    sortedEntries,
    configured,

    addEntry,
    updateEntry,
    deleteEntry,
    clearAllEntries,
    boostConfidence,
    decayConfidence,
    getEntriesForContext,
    resetState,
  }
})
