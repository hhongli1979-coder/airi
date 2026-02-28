import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export type LearningSchedule = 'manual' | 'hourly' | 'daily' | 'weekly'

export interface LearningTopic {
  id: string
  name: string
  /** Optional extra hint for better searches, e.g. "focus on TypeScript 5.x features" */
  hint: string
  enabled: boolean
  createdAt: number
}

export interface LearningRun {
  id: string
  startedAt: number
  completedAt?: number
  status: 'running' | 'done' | 'error'
  topicsProcessed: string[]
  insightsSaved: number
  error?: string
}

/**
 * Self-learning store – inspired by ruflo's RETRIEVE→JUDGE→DISTILL→CONSOLIDATE loop.
 *
 * AIRI periodically (or on demand):
 *   1. RETRIEVE  – web-searches each configured topic
 *   2. JUDGE     – picks the most relevant result URLs
 *   3. DISTILL   – reads each page and extracts key insights via LLM
 *   4. CONSOLIDATE – deduplicates and saves insights to long-term memory
 *
 * This lets AIRI self-update its knowledge base about any topic the user cares about.
 */
export const useSelfLearningStore = defineStore('modules:self-learning', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/self-learning/enabled', false)

  /** How often the learning loop runs automatically. */
  const schedule = useLocalStorageManualReset<LearningSchedule>('settings/self-learning/schedule', 'manual')

  /** Topics AIRI should proactively learn about. */
  const topics = useLocalStorage<LearningTopic[]>('settings/self-learning/topics', [])

  /** History of recent learning runs (last 20 kept). */
  const runHistory = useLocalStorage<LearningRun[]>('settings/self-learning/run-history', [])

  /** Timestamp of last successful learning run. */
  const lastRunAt = useLocalStorageManualReset<number | null>('settings/self-learning/last-run-at', null)

  /** Maximum pages to read per topic per run (limits API calls). */
  const maxPagesPerTopic = useLocalStorageManualReset<number>('settings/self-learning/max-pages-per-topic', 2)

  /** Whether AIRI should explain what it learned after each run. */
  const verboseOutput = useLocalStorageManualReset<boolean>('settings/self-learning/verbose-output', true)

  const configured = computed(() => enabled.value && topics.value.some(t => t.enabled))

  const activeTopics = computed(() => topics.value.filter(t => t.enabled))

  const latestRun = computed(() => runHistory.value[0] ?? null)

  const isRunning = computed(() => latestRun.value?.status === 'running')

  // ── Topic management ─────────────────────────────────────────────────────

  function addTopic(name: string, hint = ''): LearningTopic {
    const topic: LearningTopic = {
      id: nanoid(),
      name: name.trim(),
      hint: hint.trim(),
      enabled: true,
      createdAt: Date.now(),
    }
    topics.value = [...topics.value, topic]
    return topic
  }

  function updateTopic(id: string, patch: Partial<Pick<LearningTopic, 'name' | 'hint' | 'enabled'>>) {
    topics.value = topics.value.map(t =>
      t.id === id ? { ...t, ...patch } : t,
    )
  }

  function deleteTopic(id: string) {
    topics.value = topics.value.filter(t => t.id !== id)
  }

  // ── Run management ────────────────────────────────────────────────────────

  function startRun(topicNames: string[]): LearningRun {
    const run: LearningRun = {
      id: nanoid(),
      startedAt: Date.now(),
      status: 'running',
      topicsProcessed: topicNames,
      insightsSaved: 0,
    }
    runHistory.value = [run, ...runHistory.value].slice(0, 20)
    return run
  }

  function completeRun(runId: string, insightsSaved: number) {
    const now = Date.now()
    runHistory.value = runHistory.value.map(r =>
      r.id === runId
        ? { ...r, status: 'done' as const, completedAt: now, insightsSaved }
        : r,
    )
    lastRunAt.value = now
  }

  function failRun(runId: string, error: string) {
    runHistory.value = runHistory.value.map(r =>
      r.id === runId
        ? { ...r, status: 'error' as const, completedAt: Date.now(), error }
        : r,
    )
  }

  /** Whether the schedule says it's time to run. */
  function isDue(): boolean {
    if (schedule.value === 'manual' || !lastRunAt.value)
      return schedule.value !== 'manual'
    const elapsed = Date.now() - lastRunAt.value
    const intervals: Record<LearningSchedule, number> = {
      manual: Infinity,
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
    }
    return elapsed >= intervals[schedule.value]
  }

  function resetState() {
    enabled.reset()
    schedule.reset()
    maxPagesPerTopic.reset()
    verboseOutput.reset()
    lastRunAt.reset()
    // Keep topics and history intentionally.
  }

  return {
    enabled,
    schedule,
    topics,
    activeTopics,
    runHistory,
    lastRunAt,
    maxPagesPerTopic,
    verboseOutput,
    configured,
    latestRun,
    isRunning,

    addTopic,
    updateTopic,
    deleteTopic,
    startRun,
    completeRun,
    failRun,
    isDue,
    resetState,
  }
})
