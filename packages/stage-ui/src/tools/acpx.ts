import type { AcpxAgentId } from '../stores/modules/acpx'

import { tool } from '@xsai/tool'
import { nanoid } from 'nanoid'
import { z } from 'zod'

import { useAcpxStore } from '../stores/modules/acpx'

/** Max characters returned from a coding agent response */
const MAX_AGENT_OUTPUT = 16_000

/**
 * Run the acpx CLI as a child process, capturing stdout+stderr.
 * Returns `{ ok, stdout, stderr, exitCode }`.
 *
 * NOTE: We intentionally avoid importing the AcpClient class because it
 * requires a long-lived stdio process and session management that belongs in
 * a dedicated service.  The CLI wrapper is simpler and works well for the
 * tool-call pattern where each invocation is independent.
 */
async function runAcpx(args: string[], opts: { cwd?: string, timeoutMs?: number } = {}): Promise<{
  ok: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}> {
  const { spawn } = await import('node:child_process')
  const proc = spawn('npx', ['acpx@latest', ...args], {
    cwd: opts.cwd || process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })

  let stdout = ''
  let stderr = ''
  proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString('utf8') })
  proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString('utf8') })

  const exitCode = await new Promise<number | null>((resolve) => {
    const timeout = opts.timeoutMs
      ? setTimeout(() => {
          proc.kill()
          resolve(null)
        }, opts.timeoutMs)
      : undefined
    proc.on('close', (code) => {
      if (timeout)
        clearTimeout(timeout)
      resolve(code)
    })
    proc.on('error', () => {
      if (timeout)
        clearTimeout(timeout)
      resolve(null)
    })
  })

  return { ok: exitCode === 0, stdout, stderr, exitCode }
}

/**
 * Format acpx output for return to the LLM.
 * Trims whitespace and caps length.
 */
function formatOutput(stdout: string, stderr: string, exitCode: number | null): string {
  const body = stdout.trim() || stderr.trim()
  if (!body)
    return exitCode === 0 ? '(no output)' : `Process exited with code ${exitCode}`
  return body.slice(0, MAX_AGENT_OUTPUT)
}

/**
 * Returns the Code Agent tool array when the acpx module is enabled.
 *
 * Five tools are provided:
 *   • `code_agent_exec`     — one-shot task (no saved session, great for quick questions)
 *   • `code_agent_prompt`   — multi-turn prompt in a named persistent session
 *   • `code_agent_sessions` — list sessions for a given agent+directory
 *   • `code_agent_status`   — check whether the agent is currently running a task
 *   • `code_agent_cancel`   — cancel a running task
 *
 * All tools call the `acpx` CLI via `npx acpx@latest` (no global install needed).
 * They require Node.js and therefore only work on Electron desktop or a server.
 */
export async function codeAgent() {
  const store = useAcpxStore()
  if (!store.enabled)
    return []

  const agent = store.defaultAgent || 'opencode'
  const cwd = store.defaultCwd || undefined
  const permFlag = `--${store.permissionMode || 'approve-reads'}`

  return await Promise.all([

    // ── code_agent_exec ─────────────────────────────────────────────────
    tool({
      name: 'code_agent_exec',
      description: [
        'Run a one-shot coding task using an AI coding agent (OpenCode, Codex, Claude Code, or Gemini).',
        'The agent receives the task, uses file-read/write and shell tools to complete it, then exits.',
        'No persistent session is created — use code_agent_prompt for multi-turn work.',
        'Returns the agent\'s full response including thinking, tool calls, diffs, and final answer.',
        'Examples: "fix the failing tests", "add TypeScript types to utils.js", "explain how auth works".',
      ].join(' '),
      execute: async ({ task, agentId, workDir, timeoutSeconds }) => {
        // Graceful degradation on non-Node platforms
        let nodeProcess: typeof import('node:process') | null = null
        try { nodeProcess = await import('node:process') }
        catch { /* browser / mobile */ }
        if (!nodeProcess?.versions?.node)
          return 'Code Agent requires the Electron desktop app or a Node.js server.'

        const chosenAgent = agentId || agent
        const chosenCwd = workDir || cwd
        const timeoutMs = (timeoutSeconds || 120) * 1000

        try {
          const args = [
            permFlag,
            ...(chosenCwd ? ['--cwd', chosenCwd] : []),
            '--format', 'text',
            `--timeout`, String(timeoutSeconds || 120),
            chosenAgent, 'exec',
            task,
          ]
          const result = await runAcpx(args, { cwd: chosenCwd, timeoutMs: timeoutMs + 5000 })
          if (!result.ok && !result.stdout.trim()) {
            return `Code agent failed (exit ${result.exitCode}):\n${result.stderr.slice(0, 2000)}`
          }
          return formatOutput(result.stdout, result.stderr, result.exitCode)
        }
        catch (err) {
          return `Code agent error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        task: z.string().describe(
          'The coding task to perform, e.g. "fix the failing tests in src/auth.test.ts" or "add error handling to the fetch calls"',
        ),
        agentId: z.enum(['codex', 'claude', 'gemini', 'opencode', 'pi']).optional().describe(
          'Which coding agent to use (default: the one configured in settings)',
        ),
        workDir: z.string().optional().describe(
          'Absolute path to the project directory. Defaults to the configured working directory.',
        ),
        timeoutSeconds: z.number().int().min(10).max(600).optional().describe(
          'Maximum seconds to wait for the agent to finish (default 120)',
        ),
      }),
    }),

    // ── code_agent_prompt ────────────────────────────────────────────────
    tool({
      name: 'code_agent_prompt',
      description: [
        'Send a prompt to an AI coding agent in a persistent session.',
        'Unlike code_agent_exec, sessions remember context between prompts — ideal for multi-turn coding work.',
        'Use sessionName to run parallel workstreams (e.g. "backend", "tests", "docs").',
        'If no session exists yet, use code_agent_sessions first to create one.',
        'Returns the agent\'s response including thinking steps, tool usage, and final answer.',
      ].join(' '),
      execute: async ({ prompt, sessionName, agentId, workDir, timeoutSeconds }) => {
        let nodeProcess: typeof import('node:process') | null = null
        try { nodeProcess = await import('node:process') }
        catch { /* browser / mobile */ }
        if (!nodeProcess?.versions?.node)
          return 'Code Agent requires the Electron desktop app or a Node.js server.'

        const chosenAgent = agentId || agent
        const chosenCwd = workDir || cwd
        const timeoutMs = (timeoutSeconds || 180) * 1000

        try {
          const args = [
            permFlag,
            ...(chosenCwd ? ['--cwd', chosenCwd] : []),
            '--format', 'text',
            '--timeout', String(timeoutSeconds || 180),
            chosenAgent, 'prompt',
            ...(sessionName ? ['-s', sessionName] : []),
            prompt,
          ]
          const result = await runAcpx(args, { cwd: chosenCwd, timeoutMs: timeoutMs + 5000 })

          // Track session in store
          store.addSession({
            id: nanoid(),
            agent: chosenAgent as AcpxAgentId,
            cwd: chosenCwd || process.cwd(),
            createdAt: Date.now(),
            lastPromptAt: Date.now(),
            lastPromptPreview: prompt.slice(0, 80),
          })

          if (!result.ok && !result.stdout.trim())
            return `Agent prompt failed (exit ${result.exitCode}):\n${result.stderr.slice(0, 2000)}`

          return formatOutput(result.stdout, result.stderr, result.exitCode)
        }
        catch (err) {
          return `Code agent prompt error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        prompt: z.string().describe('What you want the coding agent to do in this turn'),
        sessionName: z.string().optional().describe(
          'Named session for parallel workstreams, e.g. "backend" or "tests". Omit for the default session.',
        ),
        agentId: z.enum(['codex', 'claude', 'gemini', 'opencode', 'pi']).optional().describe(
          'Which coding agent to use',
        ),
        workDir: z.string().optional().describe('Project directory path'),
        timeoutSeconds: z.number().int().min(10).max(600).optional().describe(
          'Maximum seconds to wait (default 180)',
        ),
      }),
    }),

    // ── code_agent_sessions ──────────────────────────────────────────────
    tool({
      name: 'code_agent_sessions',
      description: [
        'Manage coding agent sessions.',
        'Actions: "list" — show existing sessions; "new" — create a new session; "ensure" — get or create.',
        'Use sessions to maintain context across multiple prompts in the same project.',
      ].join(' '),
      execute: async ({ action, sessionName, agentId, workDir }) => {
        let nodeProcess: typeof import('node:process') | null = null
        try { nodeProcess = await import('node:process') }
        catch { /* browser / mobile */ }
        if (!nodeProcess?.versions?.node)
          return 'Code Agent requires the Electron desktop app or a Node.js server.'

        const chosenAgent = agentId || agent
        const chosenCwd = workDir || cwd
        try {
          const args = [
            ...(chosenCwd ? ['--cwd', chosenCwd] : []),
            chosenAgent, 'sessions', action,
            ...(sessionName ? ['--name', sessionName] : []),
          ]
          const result = await runAcpx(args, { cwd: chosenCwd, timeoutMs: 30_000 })
          return formatOutput(result.stdout, result.stderr, result.exitCode)
        }
        catch (err) {
          return `Sessions error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        action: z.enum(['list', 'new', 'ensure', 'show', 'close']).describe(
          '"list" shows all sessions; "new" creates a fresh one; "ensure" gets or creates; "show" inspects; "close" soft-closes',
        ),
        sessionName: z.string().optional().describe('Name for the session (for parallel workstreams)'),
        agentId: z.enum(['codex', 'claude', 'gemini', 'opencode', 'pi']).optional(),
        workDir: z.string().optional().describe('Project directory'),
      }),
    }),

    // ── code_agent_status ────────────────────────────────────────────────
    tool({
      name: 'code_agent_status',
      description: [
        'Check whether the coding agent is currently running, idle, or not started.',
        'Returns the agent process PID, uptime, session ID, and last prompt summary.',
      ].join(' '),
      execute: async ({ sessionName, agentId, workDir }) => {
        let nodeProcess: typeof import('node:process') | null = null
        try { nodeProcess = await import('node:process') }
        catch { /* browser / mobile */ }
        if (!nodeProcess?.versions?.node)
          return 'Code Agent requires the Electron desktop app or a Node.js server.'

        const chosenAgent = agentId || agent
        const chosenCwd = workDir || cwd
        try {
          const args = [
            ...(chosenCwd ? ['--cwd', chosenCwd] : []),
            chosenAgent, 'status',
            ...(sessionName ? ['-s', sessionName] : []),
          ]
          const result = await runAcpx(args, { cwd: chosenCwd, timeoutMs: 15_000 })
          return formatOutput(result.stdout, result.stderr, result.exitCode)
        }
        catch (err) {
          return `Status error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        sessionName: z.string().optional(),
        agentId: z.enum(['codex', 'claude', 'gemini', 'opencode', 'pi']).optional(),
        workDir: z.string().optional(),
      }),
    }),

    // ── code_agent_cancel ────────────────────────────────────────────────
    tool({
      name: 'code_agent_cancel',
      description: 'Cancel a coding agent task that is currently running. Sends a cooperative ACP session/cancel before force-killing.',
      execute: async ({ sessionName, agentId, workDir }) => {
        let nodeProcess: typeof import('node:process') | null = null
        try { nodeProcess = await import('node:process') }
        catch { /* browser / mobile */ }
        if (!nodeProcess?.versions?.node)
          return 'Code Agent requires the Electron desktop app or a Node.js server.'

        const chosenAgent = agentId || agent
        const chosenCwd = workDir || cwd
        try {
          const args = [
            ...(chosenCwd ? ['--cwd', chosenCwd] : []),
            chosenAgent, 'cancel',
            ...(sessionName ? ['-s', sessionName] : []),
          ]
          const result = await runAcpx(args, { cwd: chosenCwd, timeoutMs: 15_000 })
          return formatOutput(result.stdout, result.stderr, result.exitCode)
        }
        catch (err) {
          return `Cancel error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        sessionName: z.string().optional().describe('Session to cancel (omit for default)'),
        agentId: z.enum(['codex', 'claude', 'gemini', 'opencode', 'pi']).optional(),
        workDir: z.string().optional(),
      }),
    }),
  ])
}
