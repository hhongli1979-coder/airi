import type { ContextMessage } from '../../../types/chat'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { nanoid } from 'nanoid'

import { useGoalsStore } from '../../modules/goals'

const GOALS_CONTEXT_ID = 'system:goals'

/**
 * Creates a context message containing the user's active goals.
 * Returns `null` when the goals module is disabled or there are no active goals.
 *
 * Inspired by SAFLA's goal management engine – active goals are always kept
 * in AIRI's context so she stays aligned with what the user cares about.
 */
export function createGoalsContext(): ContextMessage | null {
  const store = useGoalsStore()

  if (!store.enabled || store.activeGoals.length === 0)
    return null

  const goalsText = store.activeGoals
    .map((g, i) => `${i + 1}. ${g.text}`)
    .join('\n')

  return {
    id: nanoid(),
    contextId: GOALS_CONTEXT_ID,
    strategy: ContextUpdateStrategy.ReplaceSelf,
    text: `The user has set the following goals. Keep them in mind during this conversation:\n${goalsText}`,
    createdAt: Date.now(),
  }
}
