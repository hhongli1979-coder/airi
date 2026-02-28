import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { ofetch } from 'ofetch'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export type WebSearchBackend = 'searxng' | 'brave' | 'duckduckgo'

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * Web search module – lets AIRI query the web for up-to-date information.
 *
 * Supported backends:
 *   • searxng   – Self-hosted SearXNG instance (free, privacy-friendly)
 *   • brave     – Brave Search API (requires API key, free tier available)
 *   • duckduckgo – DuckDuckGo Instant Answers (no API key, limited results)
 */
export const useWebSearchStore = defineStore('modules:web-search', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/web-search/enabled', false)
  const backend = useLocalStorageManualReset<WebSearchBackend>('settings/web-search/backend', 'duckduckgo')

  /** Base URL for SearXNG instance, e.g. "https://searx.example.com" */
  const searxngUrl = useLocalStorageManualReset<string>('settings/web-search/searxng-url', '')

  /** Brave Search API key */
  const braveApiKey = useLocalStorageManualReset<string>('settings/web-search/brave-api-key', '')

  /** Maximum number of results returned to the LLM per query */
  const maxResults = useLocalStorageManualReset<number>('settings/web-search/max-results', 5)

  const configured = computed(() => {
    if (!enabled.value)
      return false
    switch (backend.value) {
      case 'searxng': return !!searxngUrl.value.trim()
      case 'brave': return !!braveApiKey.value.trim()
      case 'duckduckgo': return true // no credentials needed
      default: return false
    }
  })

  /**
   * Perform a web search and return an array of results.
   * Called by the LLM tool executor.
   */
  async function search(query: string, count?: number): Promise<WebSearchResult[]> {
    const limit = Math.max(1, Math.min(count ?? maxResults.value, 10))

    switch (backend.value) {
      case 'searxng':
        return await searchSearxng(query, limit)
      case 'brave':
        return await searchBrave(query, limit)
      case 'duckduckgo':
      default:
        return await searchDuckDuckGo(query, limit)
    }
  }

  async function searchSearxng(query: string, limit: number): Promise<WebSearchResult[]> {
    const base = searxngUrl.value.replace(/\/$/, '')
    const data = await ofetch<{ results?: Array<{ title?: string, url?: string, content?: string }> }>(
      `${base}/search`,
      {
        query: { q: query, format: 'json', categories: 'general' },
        headers: { Accept: 'application/json' },
      },
    )
    return (data.results ?? []).slice(0, limit).map(r => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? '',
    }))
  }

  async function searchBrave(query: string, limit: number): Promise<WebSearchResult[]> {
    const data = await ofetch<{ web?: { results?: Array<{ title?: string, url?: string, description?: string }> } }>(
      'https://api.search.brave.com/res/v1/web/search',
      {
        query: { q: query, count: limit },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': braveApiKey.value,
        },
      },
    )
    return (data.web?.results ?? []).slice(0, limit).map(r => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? '',
    }))
  }

  async function searchDuckDuckGo(query: string, limit: number): Promise<WebSearchResult[]> {
    // DuckDuckGo Instant Answer API – returns related topics, not full web results.
    // Useful for quick factual answers when no API key is available.
    const data = await ofetch<{
      AbstractText?: string
      AbstractURL?: string
      AbstractSource?: string
      RelatedTopics?: Array<{ Text?: string, FirstURL?: string, Result?: string }>
    }>(
      'https://api.duckduckgo.com/',
      {
        query: { q: query, format: 'json', no_redirect: '1', no_html: '1', skip_disambig: '1' },
      },
    )

    const results: WebSearchResult[] = []

    // Include abstract if available
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.AbstractSource ?? 'DuckDuckGo',
        url: data.AbstractURL,
        snippet: data.AbstractText,
      })
    }

    // Include related topics
    for (const topic of data.RelatedTopics ?? []) {
      if (results.length >= limit)
        break
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.slice(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text,
        })
      }
    }

    return results.slice(0, limit)
  }

  function resetState() {
    enabled.reset()
    backend.reset()
    searxngUrl.reset()
    braveApiKey.reset()
    maxResults.reset()
  }

  return {
    enabled,
    backend,
    searxngUrl,
    braveApiKey,
    maxResults,
    configured,

    search,
    resetState,
  }
})
