import { tool } from '@xsai/tool'
import { z } from 'zod'

import { useWebSearchStore } from '../stores/modules/web-search'

/**
 * Returns the web_search tool array when the web-search module is enabled and
 * configured, or an empty array otherwise.
 *
 * Called lazily from `streamFrom` so the store is only accessed at invocation
 * time (inside a Pinia action context), not at module load time.
 */
export async function webSearch() {
  const store = useWebSearchStore()
  if (!store.enabled || !store.configured)
    return []

  return await Promise.all([
    tool({
      name: 'web_search',
      description: [
        'Search the web for up-to-date information, news, facts, prices, events, and more.',
        'Use this tool whenever the user asks about something that may have changed recently or that you are not confident about.',
        'Returns a list of relevant web results with title, URL, and a short snippet.',
      ].join(' '),
      execute: async ({ query, count }) => {
        try {
          const results = await store.search(query, count)
          if (results.length === 0)
            return 'No results found for the given query.'
          return results
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
            .join('\n\n')
        }
        catch (err) {
          return `Web search failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        query: z.string().describe('The search query to look up on the web'),
        count: z.number().int().min(1).max(10).optional().describe('Number of results to return (default: 5)'),
      }),
    }),
  ])
}
