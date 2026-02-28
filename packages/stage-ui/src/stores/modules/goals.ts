import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export interface Goal {
  id: string
  text: string
  /** Active goals are injected into every chat context */
  active: boolean
  createdAt: number
}

/**
 * Goals store – inspired by SAFLA's goal management engine.
 *
 * Users define objectives (e.g. "Help me learn Vue 3", "Assist with project X").
 * Active goals are injected into the system context before every LLM call so
 * AIRI always keeps them in focus throughout the conversation.
 */
export const useGoalsStore = defineStore('modules:goals', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/goals/enabled', true)
  const goals = useLocalStorage<Goal[]>('settings/goals/list', [])

  const configured = computed(() => enabled.value && goals.value.some(g => g.active))

  const activeGoals = computed(() => goals.value.filter(g => g.active))

  function addGoal(text: string): Goal {
    const goal: Goal = {
      id: nanoid(),
      text: text.trim(),
      active: true,
      createdAt: Date.now(),
    }
    goals.value = [...goals.value, goal]
    return goal
  }

  function toggleGoal(id: string) {
    goals.value = goals.value.map(g =>
      g.id === id ? { ...g, active: !g.active } : g,
    )
  }

  function updateGoal(id: string, text: string) {
    goals.value = goals.value.map(g =>
      g.id === id ? { ...g, text: text.trim() } : g,
    )
  }

  function deleteGoal(id: string) {
    goals.value = goals.value.filter(g => g.id !== id)
  }

  function resetState() {
    enabled.reset()
  }

  return {
    enabled,
    goals,
    activeGoals,
    configured,

    addGoal,
    toggleGoal,
    updateGoal,
    deleteGoal,
    resetState,
  }
})
