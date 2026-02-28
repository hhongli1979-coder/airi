import type { ChatProvider } from '@xsai-ext/providers/utils'

import type { MemoryEntry } from '../stores/modules/memory-long-term'

import { generateText } from '@xsai/generate-text'
import { ofetch } from 'ofetch'

import { useConsciousnessStore } from '../stores/modules/consciousness'
import { useLongTermMemoryStore } from '../stores/modules/memory-long-term'
import { useSelfLearningStore } from '../stores/modules/self-learning'
import { useWebSearchStore } from '../stores/modules/web-search'
import { useProvidersStore } from '../stores/providers'

interface PageContent {
  url: string
  title: string
  content: string
}

/**
 * Self-learning composable – implements ruflo's intelligence loop adapted
 * for AIRI's browser-based architecture.
 *
 * Loop per topic:
 *   1. RETRIEVE  – web_search(topic) → candidate URLs
 *   2. JUDGE     – pick top N by relevance (filter already-known URLs)
 *   3. DISTILL   – read each page via Jina AI; call LLM to extract insights
 *   4. CONSOLIDATE – save novel insights to long-term memory with source tag
 */
export function useSelfLearning() {
  const selfLearningStore = useSelfLearningStore()
  const memoryStore = useLongTermMemoryStore()
  const webSearchStore = useWebSearchStore()
  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()

  // ── Internals ─────────────────────────────────────────────────────────────

  async function readPage(url: string): Promise<string> {
    try {
      // Jina AI Reader returns plain text/markdown for any URL
      const content = await ofetch<string>(`https://r.jina.ai/${url}`, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
        timeout: 20_000,
        parseResponse: txt => txt,
      })
      return content.slice(0, 6000)
    }
    catch {
      return ''
    }
  }

  async function distillInsights(
    chatProvider: ChatProvider,
    topic: string,
    pages: PageContent[],
  ): Promise<string[]> {
    if (pages.length === 0)
      return []

    const combinedContent = pages
      .map(p => `### ${p.title || p.url}\n${p.content}`)
      .join('\n\n---\n\n')
      .slice(0, 10000)

    // DISTILL step: use LLM to extract concise, memorable facts
    const prompt = [
      `You are AIRI's knowledge extractor. The user wants you to learn about: "${topic}".`,
      'Below is content from recent web pages on this topic.',
      'Extract 3–8 concise, factual insights that are worth remembering long-term.',
      'Each insight should be a single sentence (max 120 characters).',
      'Return ONLY a JSON array of strings, nothing else. Example:',
      '["Insight 1", "Insight 2", "Insight 3"]',
      '',
      '--- CONTENT ---',
      combinedContent,
    ].join('\n')

    try {
      const result = await generateText({
        ...chatProvider.chat(consciousnessStore.activeModel),
        messages: [{ role: 'user', content: prompt }],
      })
      const text = (result.text ?? '').trim()
      if (!text)
        return []
      // Parse JSON array from response
      const match = text.match(/\[[\s\S]*\]/)
      if (!match)
        return []
      const insights = JSON.parse(match[0]) as unknown[]
      return insights
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map(s => s.trim())
        .slice(0, 8)
    }
    catch {
      return []
    }
  }

  /**
   * CONSOLIDATE step: deduplicate new insights against existing memory entries
   * to avoid storing the same fact twice.
   */
  function deduplicateInsights(insights: string[]): string[] {
    const existing = memoryStore.entries.map((e: MemoryEntry) => e.content.toLowerCase())
    return insights.filter((insight) => {
      const lower = insight.toLowerCase()
      const words = lower.split(/\s+/)
      return !existing.some((e: string) => {
        const matches = words.filter((w: string) => w.length > 4 && e.includes(w))
        return matches.length / words.length >= 0.6
      })
    })
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Run the full self-learning loop for all enabled topics.
   * Can be called manually or by the schedule trigger.
   *
   * @returns Number of insights saved.
   */
  async function runLearningLoop(): Promise<number> {
    if (!selfLearningStore.enabled || selfLearningStore.isRunning)
      return 0

    if (!consciousnessStore.activeProvider || !consciousnessStore.activeModel)
      throw new Error('No active LLM provider configured')

    if (!webSearchStore.configured)
      throw new Error('Web search is not configured – enable it in Modules → Web Search')

    const topicsToLearn = selfLearningStore.activeTopics
    if (topicsToLearn.length === 0)
      throw new Error('No learning topics configured')

    const run = selfLearningStore.startRun(topicsToLearn.map(t => t.name))
    let totalInsights = 0

    try {
      const chatProvider = await providersStore.getProviderInstance<ChatProvider>(consciousnessStore.activeProvider)

      for (const topic of topicsToLearn) {
        // 1. RETRIEVE
        const query = topic.hint ? `${topic.name} ${topic.hint}` : topic.name
        const results = await webSearchStore.search(query, 4)

        if (results.length === 0)
          continue

        // 2. JUDGE – take top N URLs
        const topUrls = results
          .slice(0, selfLearningStore.maxPagesPerTopic)
          .map(r => r.url)
          .filter(Boolean)

        // 3. DISTILL – read pages and extract insights
        const pages: PageContent[] = []
        for (const url of topUrls) {
          const content = await readPage(url)
          if (content.trim().length > 200) {
            const titleMatch = content.match(/^#\s+(.+)/m)
            pages.push({ url, title: titleMatch?.[1] ?? url, content })
          }
        }

        const rawInsights = await distillInsights(chatProvider, topic.name, pages) // 4. CONSOLIDATE – deduplicate and save
        const novelInsights = deduplicateInsights(rawInsights)
        for (const insight of novelInsights) {
          memoryStore.addEntry(insight, [topic.name, 'self-learning'], 'self-learning')
          totalInsights++
        }
      }

      selfLearningStore.completeRun(run.id, totalInsights)
      return totalInsights
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      selfLearningStore.failRun(run.id, message)
      throw err
    }
  }

  /**
   * Check if the schedule says we should run now, and trigger the loop if so.
   * Call this once when the app initialises (e.g. in App.vue onMounted).
   */
  async function checkAndRunIfDue(): Promise<void> {
    if (selfLearningStore.isDue() && selfLearningStore.configured) {
      await runLearningLoop().catch(console.warn)
    }
  }

  return {
    runLearningLoop,
    checkAndRunIfDue,
  }
}
