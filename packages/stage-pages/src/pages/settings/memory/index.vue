<script setup lang="ts">
import { useLongTermMemoryStore } from '@proj-airi/stage-ui/stores/modules/memory-long-term'
import { useShortTermMemoryStore } from '@proj-airi/stage-ui/stores/modules/memory-short-term'
import { useSelfLearningStore } from '@proj-airi/stage-ui/stores/modules/self-learning'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const shortTermStore = useShortTermMemoryStore()
const longTermStore = useLongTermMemoryStore()
const selfLearningStore = useSelfLearningStore()

const { enabled: stEnabled, maxMessages } = storeToRefs(shortTermStore)
const { enabled: ltEnabled, entries } = storeToRefs(longTermStore)
const { enabled: slEnabled, activeTopics, lastRunAt } = storeToRefs(selfLearningStore)
</script>

<template>
  <div flex="~ col gap-4">
    <!-- Short-Term Memory Card -->
    <button
      :class="[
        'rounded-xl border p-4 text-left transition-all w-full',
        'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-primary-600',
      ]"
      @click="router.push('/settings/modules/memory-short-term')"
    >
      <div flex="~ row gap-3 items-start">
        <div
          :class="[
            'rounded-lg p-2 shrink-0',
            stEnabled ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700',
          ]"
        >
          <div i-solar:bookmark-bold-duotone text-xl />
        </div>
        <div flex="~ col gap-1" flex-1>
          <div flex="~ row items-center justify-between">
            <span text-neutral-800 font-medium dark:text-neutral-200>{{ t('settings.pages.modules.memory-short-term.title') }}</span>
            <div :class="['text-xs rounded-full px-2 py-0.5', stEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400']">
              {{ stEnabled ? 'On' : 'Off' }}
            </div>
          </div>
          <p text-sm text-neutral-500>
            {{ t('settings.pages.modules.memory-short-term.description') }}
          </p>
          <p v-if="stEnabled" text-xs text-neutral-400>
            Window: {{ maxMessages === 0 ? 'unlimited' : `${maxMessages} messages` }}
          </p>
        </div>
        <div i-solar:arrow-right-bold-duotone text-neutral-400 />
      </div>
    </button>

    <!-- Long-Term Memory Card -->
    <button
      :class="[
        'rounded-xl border p-4 text-left transition-all w-full',
        'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-primary-600',
      ]"
      @click="router.push('/settings/modules/memory-long-term')"
    >
      <div flex="~ row gap-3 items-start">
        <div
          :class="[
            'rounded-lg p-2 shrink-0',
            ltEnabled ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700',
          ]"
        >
          <div i-solar:book-bookmark-bold-duotone text-xl />
        </div>
        <div flex="~ col gap-1" flex-1>
          <div flex="~ row items-center justify-between">
            <span text-neutral-800 font-medium dark:text-neutral-200>{{ t('settings.pages.modules.memory-long-term.title') }}</span>
            <div :class="['text-xs rounded-full px-2 py-0.5', ltEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400']">
              {{ ltEnabled ? 'On' : 'Off' }}
            </div>
          </div>
          <p text-sm text-neutral-500>
            {{ t('settings.pages.modules.memory-long-term.description') }}
          </p>
          <p v-if="ltEnabled" text-xs text-neutral-400>
            {{ entries.length }} {{ entries.length === 1 ? 'memory' : 'memories' }} stored
          </p>
        </div>
        <div i-solar:arrow-right-bold-duotone text-neutral-400 />
      </div>
    </button>

    <!-- Self-Learning Card -->
    <button
      :class="[
        'rounded-xl border p-4 text-left transition-all w-full',
        'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-primary-600',
      ]"
      @click="router.push('/settings/modules/self-learning')"
    >
      <div flex="~ row gap-3 items-start">
        <div
          :class="[
            'rounded-lg p-2 shrink-0',
            slEnabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700',
          ]"
        >
          <div i-solar:atom-bold-duotone text-xl />
        </div>
        <div flex="~ col gap-1" flex-1>
          <div flex="~ row items-center justify-between">
            <span text-neutral-800 font-medium dark:text-neutral-200>{{ t('settings.pages.modules.self-learning.title') }}</span>
            <div :class="['text-xs rounded-full px-2 py-0.5', slEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400']">
              {{ slEnabled ? 'On' : 'Off' }}
            </div>
          </div>
          <p text-sm text-neutral-500>
            {{ t('settings.pages.modules.self-learning.description') }}
          </p>
          <p v-if="slEnabled" text-xs text-neutral-400>
            {{ activeTopics.length }} {{ activeTopics.length === 1 ? 'topic' : 'topics' }} active
            {{ lastRunAt ? `· Last run ${new Date(lastRunAt).toLocaleDateString()}` : '· Never run' }}
          </p>
        </div>
        <div i-solar:arrow-right-bold-duotone text-neutral-400 />
      </div>
    </button>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.memory.description
  icon: i-solar:leaf-bold-duotone
  settingsEntry: true
  order: 5
  stageTransition:
    name: slide
</route>
