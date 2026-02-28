import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export interface LobsterWorkflow {
  id: string
  /** Human-readable name for this workflow */
  name: string
  /** Optional description */
  description: string
  /**
   * YAML or JSON workflow definition as a string.
   * Each workflow has `steps`, each step has `id` and `command`.
   */
  definition: string
  createdAt: number
}

/**
 * Lobster module store.
 *
 * Lobster (https://github.com/openclaw/lobster) is a typed, deterministic
 * workflow engine for AI agents.  It supports pipelines of shell commands,
 * approval gates, and resumable state — making it ideal for multi-step
 * automation triggered from the AIRI chat.
 *
 * When enabled, AIRI gains two tools:
 *   • `lobster_run_workflow`    — start a workflow from its YAML/JSON definition
 *   • `lobster_resume_workflow` — resume a workflow that is waiting for approval
 *
 * NOTICE: Lobster executes shell commands via `node:child_process`.  It is
 * fully operational on the Electron desktop app and on any Node.js server.
 * On the web / mobile build the tools are still registered but will return an
 * informative "not supported" message instead of executing.
 */
export const useLobsterStore = defineStore('modules:lobster', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/lobster/enabled', false)

  /** Saved workflow definitions the user has created or imported. */
  const workflows = useLocalStorage<LobsterWorkflow[]>('settings/lobster/workflows', [])

  const configured = computed(() => enabled.value && workflows.value.length > 0)

  const activeWorkflows = computed(() => workflows.value)

  function addWorkflow(name: string, definition: string, description = ''): LobsterWorkflow {
    const wf: LobsterWorkflow = {
      id: nanoid(),
      name: name.trim(),
      description: description.trim(),
      definition: definition.trim(),
      createdAt: Date.now(),
    }
    workflows.value = [...workflows.value, wf]
    return wf
  }

  function updateWorkflow(id: string, patch: Partial<Pick<LobsterWorkflow, 'name' | 'description' | 'definition'>>) {
    workflows.value = workflows.value.map(wf =>
      wf.id === id
        ? {
            ...wf,
            name: patch.name !== undefined ? patch.name.trim() : wf.name,
            description: patch.description !== undefined ? patch.description.trim() : wf.description,
            definition: patch.definition !== undefined ? patch.definition.trim() : wf.definition,
          }
        : wf,
    )
  }

  function deleteWorkflow(id: string) {
    workflows.value = workflows.value.filter(wf => wf.id !== id)
  }

  function clearAllWorkflows() {
    workflows.value = []
  }

  /**
   * Look up a saved workflow by name (case-insensitive).
   * Used by the LLM tool to resolve a workflow name to its definition.
   */
  function findByName(name: string): LobsterWorkflow | undefined {
    const lower = name.trim().toLowerCase()
    return workflows.value.find(wf => wf.name.toLowerCase() === lower)
  }

  function resetState() {
    enabled.reset()
    // Intentionally keep workflows — the user must clear them explicitly.
  }

  return {
    enabled,
    workflows,
    activeWorkflows,
    configured,

    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    clearAllWorkflows,
    findByName,
    resetState,
  }
})
