import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export interface CustomCommand {
  id: string
  /** The slash-prefixed trigger, e.g. "/translate" */
  trigger: string
  /** The expanded text sent to the LLM. Use {{input}} as placeholder for user-provided argument. */
  expansion: string
  /** Human-readable description shown in autocomplete. */
  description: string
  createdAt: number
}

/**
 * Commands store lets users define custom slash-command shortcuts.
 *
 * When the user types a message that starts with a known trigger (e.g. `/translate hello`),
 * the message is expanded into the full prompt before being sent to the LLM.
 *
 * Placeholders in the expansion:
 *   {{input}}  – replaced with whatever the user typed after the trigger
 */
export const useCommandsStore = defineStore('modules:commands', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/commands/enabled', true)
  const commands = useLocalStorage<CustomCommand[]>('settings/commands/list', [])

  const configured = computed(() => enabled.value && commands.value.length > 0)

  function addCommand(trigger: string, expansion: string, description = ''): CustomCommand {
    const normalizedTrigger = trigger.startsWith('/') ? trigger : `/${trigger}`
    const cmd: CustomCommand = {
      id: nanoid(),
      trigger: normalizedTrigger.toLowerCase().trim(),
      expansion: expansion.trim(),
      description: description.trim(),
      createdAt: Date.now(),
    }
    commands.value = [...commands.value, cmd]
    return cmd
  }

  function updateCommand(id: string, patch: Partial<Pick<CustomCommand, 'trigger' | 'expansion' | 'description'>>) {
    commands.value = commands.value.map(cmd =>
      cmd.id === id
        ? {
            ...cmd,
            trigger: patch.trigger !== undefined
              ? (patch.trigger.startsWith('/') ? patch.trigger : `/${patch.trigger}`).toLowerCase().trim()
              : cmd.trigger,
            expansion: patch.expansion !== undefined ? patch.expansion.trim() : cmd.expansion,
            description: patch.description !== undefined ? patch.description.trim() : cmd.description,
          }
        : cmd,
    )
  }

  function deleteCommand(id: string) {
    commands.value = commands.value.filter(cmd => cmd.id !== id)
  }

  function clearAllCommands() {
    commands.value = []
  }

  /**
   * Expands a raw user input string if it starts with a known command trigger.
   *
   * Returns the expanded string, or the original string unchanged when no
   * command matches or the module is disabled.
   *
   * @param text Raw user input
   */
  function expandInput(text: string): string {
    if (!enabled.value || !text.startsWith('/'))
      return text

    const [rawTrigger, ...rest] = text.split(' ')
    const trigger = rawTrigger.toLowerCase()
    const userInput = rest.join(' ').trim()

    const match = commands.value.find(cmd => cmd.trigger === trigger)
    if (!match)
      return text

    return match.expansion.replace(/\{\{input\}\}/g, userInput)
  }

  /**
   * Returns commands whose trigger starts with the given prefix.
   * Useful for rendering an autocomplete dropdown in the chat input.
   */
  function getSuggestions(prefix: string): CustomCommand[] {
    if (!enabled.value || !prefix.startsWith('/'))
      return []
    const lower = prefix.toLowerCase()
    return commands.value.filter(cmd => cmd.trigger.startsWith(lower))
  }

  function resetState() {
    enabled.reset()
    // Intentionally keep commands – the user must clear them explicitly.
  }

  return {
    enabled,
    commands,
    configured,

    addCommand,
    updateCommand,
    deleteCommand,
    clearAllCommands,
    expandInput,
    getSuggestions,
    resetState,
  }
})
