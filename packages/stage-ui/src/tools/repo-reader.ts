import { tool } from '@xsai/tool'
import { ofetch } from 'ofetch'
import { z } from 'zod'

import { useRepoReaderStore } from '../stores/modules/repo-reader'

const GITHUB_API = 'https://api.github.com'

/**
 * Build common request headers for the GitHub API.
 * Adds Authorization when the user has configured a token.
 */
function githubHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token.trim())
    headers.Authorization = `Bearer ${token.trim()}`
  return headers
}

/**
 * Returns the Repo Reader tool array when the module is enabled, or an empty
 * array otherwise.
 *
 * Four tools are provided:
 *   • `repo_read_file`   — read a file's contents from a GitHub repository
 *   • `repo_list_files`  — list a directory tree (or root) of a repository
 *   • `repo_search_code` — full-text code search across GitHub
 *   • `repo_get_info`    — fetch repository metadata
 *
 * All tools use the public GitHub REST API over HTTPS and work on every
 * platform (web, Electron, mobile).
 */
export async function repoReader() {
  const store = useRepoReaderStore()
  if (!store.enabled)
    return []

  const token = store.githubToken

  return await Promise.all([
    // ── repo_read_file ────────────────────────────────────────────────────
    tool({
      name: 'repo_read_file',
      description: [
        'Read the raw content of a file in a GitHub repository.',
        'Pass owner and repo to identify the repository, path for the file location (e.g. "src/index.ts"),',
        'and an optional ref (branch, tag, or commit SHA; defaults to the repo default branch).',
        'Returns the decoded file content as plain text, truncated to 12 000 characters.',
        'For large files use the maxLength parameter to control the cutoff.',
      ].join(' '),
      execute: async ({ owner, repo, path, ref, maxLength }) => {
        try {
          const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`
          const params: Record<string, string> = {}
          if (ref)
            params.ref = ref

          const data = await ofetch<{
            type: string
            content?: string
            encoding?: string
            size?: number
            name?: string
            download_url?: string | null
          }>(url, {
            headers: githubHeaders(token.value),
            query: params,
          })

          if (data.type === 'dir') {
            return `"${path}" is a directory. Use repo_list_files to browse its contents.`
          }

          if (data.encoding === 'base64' && data.content) {
            const decoded = atob(data.content.replace(/\n/g, ''))
            const limit = Math.min(maxLength ?? 12000, 16000)
            if (decoded.length > limit) {
              return `${decoded.slice(0, limit)}\n\n[Truncated — ${decoded.length - limit} more characters. Use maxLength to increase the limit.]`
            }
            return decoded
          }

          // Fallback: fetch raw via download_url
          if (data.download_url) {
            const raw = await ofetch<string>(data.download_url, {
              parseResponse: txt => txt,
            })
            const limit = Math.min(maxLength ?? 12000, 16000)
            return raw.length > limit
              ? `${raw.slice(0, limit)}\n\n[Truncated — ${raw.length - limit} more characters.]`
              : raw
          }

          return 'Unable to read file content (unsupported encoding or missing download URL).'
        }
        catch (err: any) {
          if (err?.response?.status === 404)
            return `File not found: ${owner}/${repo}/${path}${ref ? ` (ref: ${ref})` : ''}`
          if (err?.response?.status === 403)
            return 'GitHub API rate limit exceeded or access denied. Configure a GitHub token in Repo Reader settings.'
          return `Failed to read file: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        owner: z.string().describe('Repository owner (username or organisation), e.g. "microsoft"'),
        repo: z.string().describe('Repository name, e.g. "vscode"'),
        path: z.string().describe('File path relative to the repo root, e.g. "src/vs/workbench/browser/workbench.ts"'),
        ref: z.string().optional().describe('Branch, tag, or commit SHA (defaults to the repo default branch)'),
        maxLength: z.number().int().min(500).max(16000).optional().describe('Maximum characters to return (default 12000)'),
      }),
    }),

    // ── repo_list_files ───────────────────────────────────────────────────
    tool({
      name: 'repo_list_files',
      description: [
        'List the files and subdirectories at a path in a GitHub repository.',
        'Pass owner, repo, and an optional path (defaults to the repository root).',
        'Returns a compact tree showing file names, types (file/dir), and sizes.',
        'Use recursive=true to list the entire repository tree (may be large for big repos).',
      ].join(' '),
      execute: async ({ owner, repo, path, ref, recursive }) => {
        try {
          if (recursive) {
            // Use the Git Trees API for full recursive listing
            // First get the default branch SHA or ref SHA
            const treeSha = ref ?? 'HEAD'

            const treeUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}`
            const treeData = await ofetch<{
              sha: string
              tree: Array<{ path: string, type: string, size?: number }>
              truncated: boolean
            }>(`${treeUrl}?recursive=1`, {
              headers: githubHeaders(token.value),
            })

            const entries = treeData.tree
              .slice(0, 500) // cap at 500 entries to avoid huge responses
              .map(e => `${e.type === 'tree' ? '📁' : '📄'} ${e.path}${e.size ? ` (${e.size} B)` : ''}`)
              .join('\n')

            const suffix = treeData.truncated || treeData.tree.length > 500
              ? '\n\n[List truncated — the repository has more files. Use path parameter to list a subdirectory.]'
              : ''

            return `Repository tree for ${owner}/${repo}:\n\n${entries}${suffix}`
          }

          // Single-level listing via Contents API
          const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path ?? ''}`
          const params: Record<string, string> = {}
          if (ref)
            params.ref = ref

          const items = await ofetch<Array<{
            name: string
            type: string
            size: number
            path: string
          }>>(url, {
            headers: githubHeaders(token.value),
            query: params,
          })

          if (!Array.isArray(items)) {
            return `"${path ?? '/'}" is a file, not a directory. Use repo_read_file to read its content.`
          }

          const dirs = items.filter(i => i.type === 'dir').sort((a, b) => a.name.localeCompare(b.name))
          const files = items.filter(i => i.type === 'file').sort((a, b) => a.name.localeCompare(b.name))
          const lines = [
            `Contents of ${owner}/${repo}/${path ?? ''} (${items.length} items):`,
            '',
            ...dirs.map(d => `📁 ${d.name}/`),
            ...files.map(f => `📄 ${f.name} (${f.size} B)`),
          ]
          return lines.join('\n')
        }
        catch (err: any) {
          if (err?.response?.status === 404)
            return `Path not found: ${owner}/${repo}/${path ?? ''}`
          if (err?.response?.status === 403)
            return 'GitHub API rate limit exceeded or access denied. Configure a GitHub token in Repo Reader settings.'
          return `Failed to list files: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        owner: z.string().describe('Repository owner (username or organisation)'),
        repo: z.string().describe('Repository name'),
        path: z.string().optional().describe('Directory path to list (defaults to repository root)'),
        ref: z.string().optional().describe('Branch, tag, or commit SHA'),
        recursive: z.boolean().optional().describe('When true, list the entire repository tree recursively (capped at 500 entries)'),
      }),
    }),

    // ── repo_search_code ─────────────────────────────────────────────────
    tool({
      name: 'repo_search_code',
      description: [
        'Search for code on GitHub using full-text search.',
        'Use the query parameter with GitHub code-search syntax.',
        'Optionally scope the search to a specific repository with owner+repo.',
        'Returns up to 10 results with file path, repository, and a snippet.',
        'Examples: query="useState hook" owner="facebook" repo="react"',
        '          query="createServer language:TypeScript"',
        '          query="TODO: fixme repo:owner/name"',
      ].join(' '),
      execute: async ({ query, owner, repo, perPage }) => {
        try {
          let q = query
          if (owner && repo)
            q = `${q} repo:${owner}/${repo}`
          else if (owner)
            q = `${q} user:${owner}`

          const data = await ofetch<{
            total_count: number
            incomplete_results: boolean
            items: Array<{
              name: string
              path: string
              repository: { full_name: string, html_url: string }
              html_url: string
              text_matches?: Array<{ fragment: string }>
            }>
          }>(`${GITHUB_API}/search/code`, {
            headers: {
              ...githubHeaders(token.value),
              // text-match media type needed for fragments
              Accept: 'application/vnd.github.text-match+json',
            },
            query: { q, per_page: Math.min(perPage ?? 10, 10) },
          })

          if (data.items.length === 0)
            return `No code results found for: ${q}`

          const results = data.items.map((item, i) => {
            const fragment = item.text_matches?.[0]?.fragment?.trim().slice(0, 200) ?? ''
            return [
              `[${i + 1}] ${item.repository.full_name} — ${item.path}`,
              `    URL: ${item.html_url}`,
              fragment ? `    Snippet: ${fragment.replace(/\n/g, ' ↵ ')}` : '',
            ].filter(Boolean).join('\n')
          }).join('\n\n')

          const note = data.incomplete_results ? '\n\n(Results may be incomplete — GitHub search is rate-limited)' : ''
          return `Found ${data.total_count} result(s) for "${q}":\n\n${results}${note}`
        }
        catch (err: any) {
          if (err?.response?.status === 403)
            return 'GitHub Search API rate limit exceeded. Configure a GitHub token in Repo Reader settings to increase the limit.'
          if (err?.response?.status === 422)
            return `Invalid search query: ${query}. Check GitHub code search syntax.`
          return `Code search failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        query: z.string().describe('GitHub code search query, e.g. "useEffect language:TypeScript" or "TODO: fixme"'),
        owner: z.string().optional().describe('Restrict search to this GitHub user or organisation'),
        repo: z.string().optional().describe('Restrict search to this repository (requires owner)'),
        perPage: z.number().int().min(1).max(10).optional().describe('Number of results to return (max 10, default 10)'),
      }),
    }),

    // ── repo_get_info ─────────────────────────────────────────────────────
    tool({
      name: 'repo_get_info',
      description: [
        'Get metadata about a GitHub repository.',
        'Returns description, primary language, star/fork/watcher counts, topics, license, default branch, last push date, and open issues count.',
        'Useful for understanding a codebase before reading its files.',
      ].join(' '),
      execute: async ({ owner, repo }) => {
        try {
          const data = await ofetch<{
            full_name: string
            description: string | null
            language: string | null
            stargazers_count: number
            forks_count: number
            watchers_count: number
            open_issues_count: number
            topics: string[]
            license: { name: string } | null
            default_branch: string
            pushed_at: string
            size: number
            html_url: string
            private: boolean
            visibility: string
          }>(`${GITHUB_API}/repos/${owner}/${repo}`, {
            headers: githubHeaders(token.value),
          })

          const lines = [
            `📦 ${data.full_name} (${data.visibility})`,
            data.description ? `   ${data.description}` : '',
            `   🔗 ${data.html_url}`,
            '',
            `   ⭐ ${data.stargazers_count.toLocaleString()} stars  🍴 ${data.forks_count.toLocaleString()} forks  👁 ${data.watchers_count.toLocaleString()} watchers`,
            `   🐛 ${data.open_issues_count} open issues`,
            `   📝 Primary language: ${data.language ?? 'unknown'}`,
            `   📏 Repo size: ${(data.size / 1024).toFixed(1)} MB`,
            `   🌿 Default branch: ${data.default_branch}`,
            `   🕐 Last pushed: ${new Date(data.pushed_at).toLocaleDateString()}`,
            data.license ? `   ⚖️  License: ${data.license.name}` : '',
            data.topics.length > 0 ? `   🏷  Topics: ${data.topics.join(', ')}` : '',
          ].filter(l => l !== '').join('\n')

          return lines
        }
        catch (err: any) {
          if (err?.response?.status === 404)
            return `Repository not found: ${owner}/${repo}`
          if (err?.response?.status === 403)
            return 'GitHub API rate limit exceeded or access denied. Configure a GitHub token in Repo Reader settings.'
          return `Failed to get repo info: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        owner: z.string().describe('Repository owner (username or organisation)'),
        repo: z.string().describe('Repository name'),
      }),
    }),
  ])
}
