<script setup lang="ts">
import { useGoalsStore } from '@proj-airi/stage-ui/stores/modules/goals'
import { Button, FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useGoalsStore()
const { enabled, goals } = storeToRefs(store)

const newGoalText = ref('')
const editingId = ref<string | null>(null)
const editText = ref('')

function add() {
  const text = newGoalText.value.trim()
  if (!text)
    return
  store.addGoal(text)
  newGoalText.value = ''
}

function startEdit(id: string, text: string) {
  editingId.value = id
  editText.value = text
}

function saveEdit() {
  if (editingId.value && editText.value.trim()) {
    store.updateGoal(editingId.value, editText.value)
  }
  editingId.value = null
}
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.goals.enable')"
      :description="t('settings.pages.modules.goals.enable-description')"
    />

    <p
      :class="[
        'rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700',
        'dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300',
      ]"
    >
      {{ t('settings.pages.modules.goals.hint') }}
    </p>

    <div flex="~ col gap-3">
      <h3 text-neutral-700 font-medium dark:text-neutral-300>
        {{ t('settings.pages.modules.goals.goals-title') }}
      </h3>

      <p v-if="goals.length === 0" text-sm text-neutral-400>
        {{ t('settings.pages.modules.goals.goals-empty') }}
      </p>

      <div v-else flex="~ col gap-2">
        <div
          v-for="goal in goals"
          :key="goal.id"
          :class="[
            'rounded-lg border p-3 flex gap-3 items-center',
            'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
            !goal.active && 'opacity-50',
          ]"
        >
          <button
            :class="[goal.active ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600']"
            @click="store.toggleGoal(goal.id)"
          >
            <div :class="[goal.active ? 'i-solar:check-square-bold-duotone' : 'i-solar:square-bold-duotone']" text-base />
          </button>

          <template v-if="editingId === goal.id">
            <FieldInput
              v-model="editText"
              :class="['flex-1 text-sm']"
              @keydown.enter="saveEdit"
              @keydown.escape="editingId = null"
            />
            <Button size="sm" @click="saveEdit">
              {{ t('settings.pages.modules.goals.save') }}
            </Button>
          </template>
          <template v-else>
            <span :class="['flex-1 text-sm text-neutral-800 dark:text-neutral-200']">{{ goal.text }}</span>
            <button
              :class="['p-1 rounded text-neutral-400 hover:text-primary-500 transition-colors']"
              @click="startEdit(goal.id, goal.text)"
            >
              <div i-solar:pen-bold-duotone text-sm />
            </button>
            <button
              :class="['p-1 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors']"
              @click="store.deleteGoal(goal.id)"
            >
              <div i-solar:trash-bin-minimalistic-bold-duotone text-sm />
            </button>
          </template>
        </div>
      </div>

      <!-- Add goal -->
      <div flex="~ row gap-2">
        <FieldInput
          v-model="newGoalText"
          :placeholder="t('settings.pages.modules.goals.add-placeholder')"
          :class="['flex-1']"
          @keydown.enter="add"
        />
        <Button :disabled="!newGoalText.trim()" @click="add">
          {{ t('settings.pages.modules.goals.add') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.goals.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
