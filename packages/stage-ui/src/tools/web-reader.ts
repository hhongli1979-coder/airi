import { tool } from '@xsai/tool'
import { ofetch } from 'ofetch'
import { z } from 'zod'

/**
 * Web Reader tool – fetches a URL and returns clean readable text via the
 * Jina AI Reader API (https://r.jina.ai).
 *
 * Jina Reader is CORS-friendly, free for basic use, and returns well-formatted
 * Markdown from any public web page – making it ideal for AIRI to read and
 * learn from articles, docs, and news.
 *
 * Always available (no configuration needed).
 */
export async function webReader() {
  return await Promise.all([
    tool({
      name: 'web_read_page',
      description: [
        'Fetch and read the full content of a web page as clean Markdown text.',
        'Use this AFTER web_search to read the full article/documentation behind a search result URL.',
        'Also use this when the user asks you to read or summarize a specific URL.',
        'Returns up to 8000 characters of page content.',
      ].join(' '),
      execute: async ({ url, maxLength }) => {
        try {
          // Jina AI Reader: prepend https://r.jina.ai/ to get clean Markdown
          const jinaUrl = `https://r.jina.ai/${url}`
          const content = await ofetch<string>(jinaUrl, {
            headers: {
              'Accept': 'text/plain',
              'X-Return-Format': 'markdown',
            },
            timeout: 20_000,
            parseResponse: txt => txt,
          })
          const limit = Math.min(maxLength ?? 8000, 12000)
          return content.length > limit
            ? `${content.slice(0, limit)}\n\n[Content truncated – ${content.length - limit} more characters]`
            : content
        }
        catch (err) {
          return `Failed to read page: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        url: z.string().url().describe('The full URL of the web page to read'),
        maxLength: z.number().int().min(500).max(12000).optional().describe('Maximum characters to return (default 8000)'),
      }),
    }),
  ])
}
