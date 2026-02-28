import type { ChatProvider } from '@xsai-ext/providers/utils'

import { generateText } from '@xsai/generate-text'

import { useChatSessionStore } from '../stores/chat/session-store'
import { useConsciousnessStore } from '../stores/modules/consciousness'
import { useLongTermMemoryStore } from '../stores/modules/memory-long-term'
import { useProvidersStore } from '../stores/providers'

/**
 * Session summarizer – inspired by SAFLA's `consolidate_memories` tool.
 *
 * When called, takes the current session's messages, asks the LLM to produce
 * a concise summary, and stores it as a long-term memory entry tagged with
 * `['episode', 'session-summary']`.  This lets AIRI remember what happened in
 * past conversations even after the chat history is cleared.
 *
 * Typical usage: call `summarizeCurrentSession()` when the user clears history
 * or when the conversation is long enough to be worth archiving.
 */
export function useSessionSummarizer() {
  const sessionStore = useChatSessionStore()
  const memoryStore = useLongTermMemoryStore()
  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()

  /**
   * Summarise the current session and save it to long-term memory.
   * @returns The saved memory entry, or null if summarization was skipped.
   */
  async function summarizeCurrentSession(): Promise<string | null> {
    if (!consciousnessStore.activeProvider || !consciousnessStore.activeModel)
      return null

    const messages = sessionStore.messages
    // Only summarise if there are enough user+assistant exchanges
    const exchanges = messages.filter(m => m.role === 'user' || m.role === 'assistant')
    if (exchanges.length < 4)
      return null

    // Build a lightweight conversation transcript for the LLM
    const transcript = exchanges
      .slice(-40) // last 40 messages max to avoid huge prompts
      .map((m) => {
        const content = typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content
                .filter((p): p is { type: 'text', text: string } => typeof p === 'object' && 'type' in p && p.type === 'text')
                .map(p => p.text)
                .join(' ')
            : ''
        return `${m.role === 'user' ? 'User' : 'AIRI'}: ${content.slice(0, 300)}`
      })
      .join('\n')

    const prompt = [
      'Summarise the following conversation in 2-4 sentences.',
      'Focus on: key topics discussed, decisions made, and anything AIRI should remember for the future.',
      'Be concise and factual. Return only the summary text, nothing else.',
      '',
      '--- CONVERSATION ---',
      transcript,
    ].join('\n')

    try {
      const chatProvider = await providersStore.getProviderInstance<ChatProvider>(consciousnessStore.activeProvider)
      const result = await generateText({
        ...chatProvider.chat(consciousnessStore.activeModel),
        messages: [{ role: 'user', content: prompt }],
      })

      const summary = (result.text ?? '').trim()
      if (!summary)
        return null

      const date = new Date().toLocaleDateString()
      memoryStore.addEntry(
        `[Session ${date}] ${summary}`,
        ['episode', 'session-summary'],
        'self-learning',
      )

      return summary
    }
    catch {
      return null
    }
  }

  return { summarizeCurrentSession }
}
