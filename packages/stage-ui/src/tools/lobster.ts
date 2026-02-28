import { tool } from '@xsai/tool'
import { z } from 'zod'

import { useLobsterStore } from '../stores/modules/lobster'

/**
 * Returns the Lobster workflow tools when the lobster module is enabled and
 * configured, or an empty array otherwise.
 *
 * Two tools are provided:
 *   • `lobster_run_workflow`    — start a new workflow run
 *   • `lobster_resume_workflow` — resume a halted workflow after approval
 *
 * Lobster uses `node:child_process` internally; on web/mobile the tools
 * are registered but return a descriptive "not supported" message.
 *
 * Called lazily from `streamFrom` so the store is only accessed inside a
 * Pinia action context, not at module load time.
 */
export async function lobster() {
  const store = useLobsterStore()
  if (!store.enabled)
    return []

  return await Promise.all([
    tool({
      name: 'lobster_run_workflow',
      description: [
        'Run a deterministic, typed Lobster workflow.',
        'Lobster workflows are YAML/JSON definitions with steps that execute shell commands, transform data, and optionally require human approval.',
        'Pass either a `workflowName` (matched from the saved workflow list) or a raw `workflowYaml` string.',
        'If the workflow reaches an approval gate it returns status "needs_approval" with a `resumeToken` — call `lobster_resume_workflow` to continue.',
        'Returns the workflow output as JSON or a plain text summary.',
      ].join(' '),
      execute: async ({ workflowName, workflowYaml, argsJson }) => {
        // Lobster uses Node.js APIs — gracefully degrade on browser/mobile.
        // NOTICE: The ESLint rule node/prefer-global/process fires here; we
        // use a try/catch dynamic import instead of the global to satisfy it.
        let nodeProcess: typeof import('node:process') | null = null
        try {
          nodeProcess = await import('node:process')
        }
        catch {
          // not in Node.js (browser / mobile)
        }
        if (!nodeProcess?.versions?.node) {
          return 'Lobster workflow execution is only supported on the Electron desktop app or a Node.js server. This environment does not provide Node.js process access.'
        }

        try {
          // Dynamically import lobster to avoid breaking browser builds.
          const lobsterPkg = await import('@clawdbot/lobster')
          const { Lobster, exec } = lobsterPkg as any

          // Resolve workflow definition string
          let definition = workflowYaml
          if (!definition && workflowName) {
            const saved = store.findByName(workflowName)
            if (!saved)
              return `Workflow "${workflowName}" not found. Available: ${store.workflows.map(w => w.name).join(', ') || 'none'}`
            definition = saved.definition
          }

          if (!definition)
            return 'No workflow provided. Specify workflowName or workflowYaml.'

          // Parse args if provided
          let args: Record<string, unknown> = {}
          if (argsJson) {
            try {
              args = JSON.parse(argsJson)
            }
            catch {
              return `argsJson is not valid JSON: ${argsJson.slice(0, 100)}`
            }
          }

          // Import yaml parser (bundled with lobster)
          let steps: Array<{ id: string, command: string, approval?: boolean | string }> = []
          try {
            // Try parsing as JSON first, then YAML
            const parsed = definition.trimStart().startsWith('{')
              ? JSON.parse(definition)
              : await parseYamlSafe(definition)

            if (!parsed?.steps || !Array.isArray(parsed.steps))
              return 'Workflow definition must contain a "steps" array.'

            steps = parsed.steps
          }
          catch (err) {
            return `Failed to parse workflow definition: ${err instanceof Error ? err.message : String(err)}`
          }

          // Build Lobster pipeline from steps
          const workflow = new Lobster()
          for (const step of steps) {
            if (!step.command)
              continue
            // NOTICE: Argument substitution uses shell-escaping via JSON.stringify
            // (which produces a double-quoted string safe for sh) to prevent
            // command injection when user-provided values contain shell metacharacters.
            const cmd = step.command.replace(
              /\$\{([\w-]+)\}/g,
              (_match: string, key: string) => {
                if (!(key in args))
                  return `\${${key}}`
                // Shell-safe quoting: produce 'value' with internal single quotes escaped
                const val = String(args[key]).replace(/'/g, `'\\''`)
                return `'${val}'`
              },
            )
            workflow.pipe(exec(cmd))
            if (step.approval === true || step.approval === 'required') {
              workflow.pipe(lobsterPkg.approve({ prompt: `Approve step "${step.id}"?` }))
            }
          }

          const result = await workflow.run()

          if (result.status === 'needs_approval') {
            return JSON.stringify({
              status: 'needs_approval',
              prompt: result.requiresApproval?.prompt,
              items: result.requiresApproval?.items,
              resumeToken: result.requiresApproval?.resumeToken,
              instruction: 'Call lobster_resume_workflow with approved=true or approved=false and the resumeToken to continue.',
            }, null, 2)
          }

          if (!result.ok) {
            return `Workflow failed: ${result.error?.message ?? 'Unknown error'}`
          }

          return result.output.length === 0
            ? 'Workflow completed with no output.'
            : JSON.stringify(result.output, null, 2)
        }
        catch (err) {
          return `Lobster workflow error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        workflowName: z
          .string()
          .optional()
          .describe('Name of a saved workflow from the Lobster settings page'),
        workflowYaml: z
          .string()
          .optional()
          .describe('Inline YAML or JSON workflow definition string (overrides workflowName)'),
        argsJson: z
          .string()
          .optional()
          .describe('JSON object string of arguments to substitute into the workflow, e.g. {"repo":"owner/name","pr":42}'),
      }),
    }),

    tool({
      name: 'lobster_resume_workflow',
      description: [
        'Resume a Lobster workflow that halted at an approval gate.',
        'Pass the resumeToken from a previous lobster_run_workflow call and whether the action is approved.',
        'Returns the continued workflow output.',
      ].join(' '),
      execute: async ({ resumeToken, approved }) => {
        let nodeProcess: typeof import('node:process') | null = null
        try {
          nodeProcess = await import('node:process')
        }
        catch {
          // not in Node.js
        }
        if (!nodeProcess?.versions?.node) {
          return 'Lobster is only supported in Electron desktop or Node.js environments.'
        }

        if (!store.enabled)
          return 'Lobster module is disabled.'

        try {
          const lobsterPkg = await import('@clawdbot/lobster')
          const { Lobster } = lobsterPkg as any

          // We need to reconstruct the workflow to resume it.
          // Since Lobster requires the original Lobster instance to resume,
          // and we cannot serialize/deserialize stage functions, we create a
          // minimal single-stage resume pipeline that honours the token.
          const workflow = new Lobster()
          const result = await workflow.resume(resumeToken, { approved })

          if (result.status === 'cancelled')
            return 'Workflow was cancelled (not approved).'

          if (result.status === 'needs_approval') {
            return JSON.stringify({
              status: 'needs_approval',
              prompt: result.requiresApproval?.prompt,
              items: result.requiresApproval?.items,
              resumeToken: result.requiresApproval?.resumeToken,
              instruction: 'Another approval gate reached. Call lobster_resume_workflow again.',
            }, null, 2)
          }

          if (!result.ok) {
            return `Workflow failed after resume: ${result.error?.message ?? 'Unknown error'}`
          }

          return result.output.length === 0
            ? 'Workflow completed with no output after resume.'
            : JSON.stringify(result.output, null, 2)
        }
        catch (err) {
          return `Lobster resume error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        resumeToken: z
          .string()
          .describe('The resumeToken returned by a previous lobster_run_workflow call with status "needs_approval"'),
        approved: z
          .boolean()
          .describe('true to approve and continue the workflow, false to cancel it'),
      }),
    }),
  ])
}

/**
 * Lightweight YAML parser shim: attempts to use the `yaml` package that
 * ships as a transitive dependency of `@clawdbot/lobster`.
 */
async function parseYamlSafe(text: string): Promise<unknown> {
  let yamlError: unknown
  try {
    const { parse } = await import('yaml')
    return parse(text)
  }
  catch (err) {
    yamlError = err
  }
  try {
    return JSON.parse(text)
  }
  catch (jsonErr) {
    throw new Error(
      `Failed to parse as YAML (${yamlError instanceof Error ? yamlError.message : String(yamlError)}) `
      + `or JSON (${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)})`,
    )
  }
}
