import { useLocalStorage } from '@vueuse/core'
import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Supported built-in coding agents that acpx can drive via the Agent Client
 * Protocol (ACP).  Each entry maps a friendly name to the underlying CLI
 * command that acpx uses.
 *
 * Reference: https://github.com/openclaw/acpx#built-in-agents-and-custom-servers
 */
export const ACPX_AGENTS = [
  { id: 'codex', label: 'Codex (OpenAI)', command: 'npx @zed-industries/codex-acp' },
  { id: 'claude', label: 'Claude Code (Anthropic)', command: 'npx @zed-industries/claude-agent-acp' },
  { id: 'gemini', label: 'Gemini CLI (Google)', command: 'gemini' },
  { id: 'opencode', label: 'OpenCode / Crush', command: 'npx opencode-ai' },
  { id: 'pi', label: 'Pi Coding Agent', command: 'npx pi-acp' },
] as const

export type AcpxAgentId = typeof ACPX_AGENTS[number]['id']

export interface AcpxSession {
  id: string
  agent: AcpxAgentId
  cwd: string
  createdAt: number
  lastPromptAt?: number
  lastPromptPreview?: string
}

/**
 * Code Agent (acpx) module store.
 *
 * When enabled, AIRI gains tools to delegate coding tasks to an AI coding
 * agent running on your machine:
 *
 *   • `code_agent_exec`     — one-shot coding task (no persistent session)
 *   • `code_agent_prompt`   — multi-turn prompt in a persistent session
 *   • `code_agent_sessions` — list or create sessions
 *   • `code_agent_status`   — check what the agent is doing right now
 *   • `code_agent_cancel`   — cancel a running task
 *
 * Behind the scenes AIRI uses `acpx` (Agent Client Protocol client) to talk
 * to the coding agent over a structured JSON-RPC channel instead of scraping
 * terminal output.  This means AIRI can see tool calls, diffs, thinking steps,
 * and final answers — all as structured data.
 *
 * Prerequisites (install whichever agent you want to use):
 *   - Codex:     https://codex.openai.com  (npx @zed-industries/codex-acp)
 *   - Claude:    https://claude.ai/code    (npx @zed-industries/claude-agent-acp)
 *   - Gemini:    https://github.com/google/gemini-cli  (gemini)
 *   - OpenCode:  https://opencode.ai       (npx opencode-ai)
 *
 * NOTICE: Requires Node.js and a running Electron desktop app or server.
 * Does not work on web or mobile builds (gracefully returns "not supported").
 */
export const useAcpxStore = defineStore('modules:acpx', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/acpx/enabled', false)

  /** Which coding agent to use by default */
  const defaultAgent = useLocalStorageManualReset<AcpxAgentId>('settings/acpx/default-agent', 'opencode')

  /**
   * Default working directory for coding tasks.
   * Empty string means use the current process cwd at call time.
   */
  const defaultCwd = useLocalStorageManualReset<string>('settings/acpx/default-cwd', '')

  /**
   * Permission mode passed to acpx.
   * 'approve-reads' = auto-approve read ops, prompt for writes (default)
   * 'approve-all'   = auto-approve everything (fully autonomous)
   * 'deny-all'      = deny all tool calls (read-only mode)
   */
  const permissionMode = useLocalStorageManualReset<'approve-reads' | 'approve-all' | 'deny-all'>(
    'settings/acpx/permission-mode',
    'approve-reads',
  )

  /** Recent sessions managed by AIRI (lightweight cache, not acpx state) */
  const recentSessions = useLocalStorage<AcpxSession[]>('settings/acpx/recent-sessions', [])

  const configured = computed(() => enabled.value)

  function addSession(session: AcpxSession) {
    recentSessions.value = [session, ...recentSessions.value.slice(0, 9)]
  }

  function clearSessions() {
    recentSessions.value = []
  }

  function resetState() {
    enabled.reset()
    defaultAgent.reset()
    defaultCwd.reset()
    permissionMode.reset()
  }

  return {
    enabled,
    defaultAgent,
    defaultCwd,
    permissionMode,
    recentSessions,
    configured,

    addSession,
    clearSessions,
    resetState,
  }
})
