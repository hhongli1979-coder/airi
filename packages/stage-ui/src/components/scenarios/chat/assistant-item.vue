<script setup lang="ts">
import type { ChatAssistantMessage, ChatSlices, ChatSlicesText } from '../../../types/chat'

import { computed, ref } from 'vue'

import ChatResponsePart from './response-part.vue'
import ChatToolCallBlock from './tool-call-block.vue'

import { useLongTermMemoryStore } from '../../../stores/modules/memory-long-term'
import { MarkdownRenderer } from '../../markdown'

const props = withDefaults(defineProps<{
  message: ChatAssistantMessage
  label: string
  showPlaceholder?: boolean
  variant?: 'desktop' | 'mobile'
}>(), {
  showPlaceholder: false,
  variant: 'desktop',
})

// SAFLA delta evaluation: track feedback on individual responses
const memoryStore = useLongTermMemoryStore()
type Feedback = 'up' | 'down' | null
const feedback = ref<Feedback>(null)

function giveFeedback(value: 'up' | 'down') {
  if (feedback.value === value) {
    feedback.value = null
    return
  }
  feedback.value = value
  // Boost or decay confidence of recently used memory entries
  const recentEntries = memoryStore.sortedEntries.slice(0, 5)
  recentEntries.forEach(entry =>
    memoryStore.boostConfidence(entry.id, value === 'up' ? 0.05 : -0.05),
  )
}

const resolvedSlices = computed<ChatSlices[]>(() => {
  if (props.message.slices?.length) {
    return props.message.slices
  }

  if (typeof props.message.content === 'string' && props.message.content.trim()) {
    return [{ type: 'text', text: props.message.content } satisfies ChatSlicesText]
  }

  if (Array.isArray(props.message.content)) {
    const textPart = props.message.content.find(part => 'type' in part && part.type === 'text') as { text?: string } | undefined
    if (textPart?.text)
      return [{ type: 'text', text: textPart.text } satisfies ChatSlicesText]
  }

  return []
})

const showLoader = computed(() => props.showPlaceholder && resolvedSlices.value.length === 0)
const containerClass = computed(() => props.variant === 'mobile' ? 'mr-0' : 'mr-12')
const boxClasses = computed(() => [
  props.variant === 'mobile' ? 'px-2 py-2 text-sm bg-primary-50/90 dark:bg-primary-950/90' : 'px-3 py-3 bg-primary-50/80 dark:bg-primary-950/80',
])
</script>

<template>
  <div flex :class="containerClass" class="ph-no-capture group">
    <div
      flex="~ col" shadow="sm primary-200/50 dark:none"
      min-w-20 rounded-xl h="unset <sm:fit"
      :class="boxClasses"
    >
      <div>
        <span text-sm text="black/60 dark:white/65" font-normal class="inline <sm:hidden">{{ label }}</span>
      </div>
      <div v-if="resolvedSlices.length > 0" class="break-words" text="primary-700 dark:primary-100">
        <template v-for="(slice, sliceIndex) in resolvedSlices" :key="sliceIndex">
          <ChatToolCallBlock
            v-if="slice.type === 'tool-call'"
            :tool-name="slice.toolCall.toolName"
            :args="slice.toolCall.args"
            :result="(message.tool_results?.find(r => r.id === slice.toolCall.toolCallId)?.result as string | undefined)"
            :is-streaming="props.showPlaceholder"
            class="mb-2"
          />
          <template v-else-if="slice.type === 'tool-call-result'" />
          <template v-else-if="slice.type === 'text'">
            <MarkdownRenderer :content="slice.text" />
          </template>
        </template>
      </div>
      <div v-else-if="showLoader" i-eos-icons:three-dots-loading />

      <ChatResponsePart
        v-if="message.categorization"
        :message="message"
        :variant="variant"
      />

      <!-- SAFLA delta evaluation: response feedback buttons -->
      <div
        v-if="!showPlaceholder && resolvedSlices.length > 0"
        :class="['flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150']"
      >
        <button
          :class="[
            'rounded p-1 text-xs transition-colors',
            feedback === 'up'
              ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40'
              : 'text-neutral-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20',
          ]"
          title="Good response"
          @click="giveFeedback('up')"
        >
          <div i-solar:like-bold-duotone />
        </button>
        <button
          :class="[
            'rounded p-1 text-xs transition-colors',
            feedback === 'down'
              ? 'text-red-500 bg-red-100 dark:text-red-400 dark:bg-red-900/40'
              : 'text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
          ]"
          title="Poor response"
          @click="giveFeedback('down')"
        >
          <div i-solar:dislike-bold-duotone />
        </button>
      </div>
    </div>
  </div>
</template>
