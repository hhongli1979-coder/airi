<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * CommandAutocomplete – shows a floating list of /command suggestions
 * as the user types a slash prefix in the chat input.
 *
 * Usage:
 *   <CommandAutocomplete :input="messageText" @select="onSelect" />
 *
 * Emits `select` with the full expansion string for the chosen command.
 */
import { useCommandsStore } from '../../../stores/modules/commands'

const props = defineProps<{
  input: string
}>()

const emit = defineEmits<{
  select: [trigger: string, expansion: string]
}>()

const store = useCommandsStore()
const selectedIndex = ref(0)

const suggestions = computed(() => store.getSuggestions(props.input))

function select(index: number) {
  const cmd = suggestions.value[index]
  if (cmd)
    emit('select', cmd.trigger, cmd.expansion)
}

function handleKeydown(e: KeyboardEvent) {
  if (!suggestions.value.length)
    return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  }
  else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    select(selectedIndex.value)
  }
}

defineExpose({ handleKeydown })
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
  >
    <div
      v-if="suggestions.length > 0"
      :class="[
        'absolute bottom-full left-0 mb-1 z-50',
        'rounded-xl border shadow-lg overflow-hidden',
        'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        'min-w-60 max-w-80',
      ]"
    >
      <button
        v-for="(cmd, i) in suggestions"
        :key="cmd.id"
        :class="[
          'w-full px-3 py-2 text-left flex flex-col gap-0.5 transition-colors',
          i === selectedIndex
            ? 'bg-primary-50 dark:bg-primary-950/50'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
        ]"
        @mouseenter="selectedIndex = i"
        @click="select(i)"
      >
        <div flex="~ row items-center gap-2">
          <div i-solar:slash-circle-bold-duotone text-xs text-primary-500 />
          <code :class="['text-sm font-mono text-primary-600 dark:text-primary-400']">{{ cmd.trigger }}</code>
          <span v-if="cmd.description" :class="['text-xs text-neutral-400 truncate']">
            {{ cmd.description }}
          </span>
        </div>
        <p :class="['text-xs text-neutral-400 dark:text-neutral-500 pl-5 truncate']">
          {{ cmd.expansion }}
        </p>
      </button>
    </div>
  </Transition>
</template>
