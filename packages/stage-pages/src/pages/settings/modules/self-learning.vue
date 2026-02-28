<script setup lang="ts">
import { useSelfLearning } from '@proj-airi/stage-ui/composables/use-self-learning'
import { useSelfLearningStore } from '@proj-airi/stage-ui/stores/modules/self-learning'
import { Button, FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useSelfLearningStore()
const { enabled, schedule, topics, maxPagesPerTopic, verboseOutput, runHistory, lastRunAt, isRunning } = storeToRefs(store)

const { runLearningLoop } = useSelfLearning()

const newTopicName = ref('')
const newTopicHint = ref('')
const learningError = ref('')
const learningSuccess = ref('')

const scheduleOptions = [
  { value: 'manual', labelKey: 'settings.pages.modules.self-learning.schedule-manual' },
  { value: 'hourly', labelKey: 'settings.pages.modules.self-learning.schedule-hourly' },
  { value: 'daily', labelKey: 'settings.pages.modules.self-learning.schedule-daily' },
  { value: 'weekly', labelKey: 'settings.pages.modules.self-learning.schedule-weekly' },
] as const

function addTopic() {
  const name = newTopicName.value.trim()
  if (!name)
    return
  store.addTopic(name, newTopicHint.value.trim())
  newTopicName.value = ''
  newTopicHint.value = ''
}

async function learn() {
  learningError.value = ''
  learningSuccess.value = ''
  try {
    const saved = await runLearningLoop()
    learningSuccess.value = t('settings.pages.modules.self-learning.insights-saved', { count: saved })
  }
  catch (err) {
    learningError.value = err instanceof Error ? err.message : String(err)
  }
}

function formatRuntime(run: { startedAt: number, completedAt?: number }) {
  const start = new Date(run.startedAt)
  return start.toLocaleString()
}
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.self-learning.enable')"
      :description="t('settings.pages.modules.self-learning.enable-description')"
    />

    <template v-if="enabled">
      <!-- Schedule -->
      <div flex="~ col gap-2">
        <label text-sm text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.self-learning.schedule') }}
        </label>
        <div flex="~ row gap-2 flex-wrap">
          <button
            v-for="opt in scheduleOptions"
            :key="opt.value"
            :class="[
              'rounded-lg border px-3 py-1.5 text-sm transition-all',
              schedule === opt.value
                ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/40 dark:text-primary-300'
                : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400',
            ]"
            @click="schedule = opt.value"
          >
            {{ t(opt.labelKey) }}
          </button>
        </div>
      </div>

      <!-- Max pages -->
      <div flex="~ col gap-2">
        <label text-sm text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.self-learning.max-pages') }}
        </label>
        <p text-xs text-neutral-400>
          {{ t('settings.pages.modules.self-learning.max-pages-description') }}
        </p>
        <div flex="~ row gap-2">
          <button
            v-for="n in [1, 2, 3, 5]"
            :key="n"
            :class="[
              'rounded-lg border px-3 py-1.5 text-sm transition-all min-w-10',
              maxPagesPerTopic === n
                ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/40 dark:text-primary-300'
                : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400',
            ]"
            @click="maxPagesPerTopic = n"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <FieldCheckbox
        v-model="verboseOutput"
        :label="t('settings.pages.modules.self-learning.verbose')"
      />

      <!-- Topics -->
      <div flex="~ col gap-3">
        <h3 text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.self-learning.topics-title') }}
        </h3>

        <p v-if="topics.length === 0" text-sm text-neutral-400>
          {{ t('settings.pages.modules.self-learning.topics-empty') }}
        </p>

        <div v-else flex="~ col gap-2">
          <div
            v-for="topic in topics"
            :key="topic.id"
            :class="[
              'rounded-lg border p-3 flex gap-3 items-start',
              'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
            ]"
          >
            <div flex="~ col gap-0.5" min-w-0 flex-1>
              <div flex="~ row items-center gap-2">
                <button
                  :class="['shrink-0', topic.enabled ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600']"
                  @click="store.updateTopic(topic.id, { enabled: !topic.enabled })"
                >
                  <div :class="[topic.enabled ? 'i-solar:check-square-bold-duotone' : 'i-solar:square-bold-duotone']" text-base />
                </button>
                <span :class="['text-sm font-medium', topic.enabled ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400']">
                  {{ topic.name }}
                </span>
              </div>
              <p v-if="topic.hint" pl-6 text-xs text-neutral-400>
                {{ topic.hint }}
              </p>
            </div>
            <button
              :class="['shrink-0 p-1 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors']"
              @click="store.deleteTopic(topic.id)"
            >
              <div i-solar:trash-bin-minimalistic-bold-duotone text-sm />
            </button>
          </div>
        </div>

        <!-- Add topic -->
        <div flex="~ col gap-2">
          <FieldInput
            v-model="newTopicName"
            :placeholder="t('settings.pages.modules.self-learning.topic-name-placeholder')"
            :label="t('settings.pages.modules.self-learning.topic-name')"
            @keydown.enter="addTopic"
          />
          <div flex="~ row gap-2">
            <FieldInput
              v-model="newTopicHint"
              :placeholder="t('settings.pages.modules.self-learning.topic-hint-placeholder')"
              :class="['flex-1']"
              @keydown.enter="addTopic"
            />
            <Button :disabled="!newTopicName.trim()" @click="addTopic">
              {{ t('settings.pages.modules.self-learning.add-topic') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Learn Now -->
      <div flex="~ col gap-2">
        <Button
          :disabled="isRunning || topics.filter(t => t.enabled).length === 0"
          @click="learn"
        >
          <div :class="[isRunning ? 'i-solar:spinner-bold-duotone animate-spin' : 'i-solar:atom-bold-duotone']" mr-1.5 />
          {{ isRunning ? t('settings.pages.modules.self-learning.learning') : t('settings.pages.modules.self-learning.learn-now') }}
        </Button>
        <p text-xs text-neutral-400>
          {{ t('settings.pages.modules.self-learning.learn-now-description') }}
        </p>

        <div
          v-if="learningSuccess"
          :class="['rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400 flex items-center gap-2']"
        >
          <div i-solar:check-circle-bold-duotone />
          {{ learningSuccess }}
        </div>
        <div
          v-if="learningError"
          :class="['rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400']"
        >
          {{ learningError }}
        </div>
      </div>

      <!-- Run History -->
      <div v-if="runHistory.length > 0" flex="~ col gap-2">
        <h3 text-sm text-neutral-600 font-medium dark:text-neutral-400>
          {{ t('settings.pages.modules.self-learning.run-history') }}
        </h3>
        <div flex="~ col gap-1.5" max-h-48 overflow-y-auto>
          <div
            v-for="run in runHistory"
            :key="run.id"
            :class="[
              'rounded-lg border px-3 py-2 text-xs flex gap-2 items-center',
              run.status === 'done' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400' : '',
              run.status === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400' : '',
              run.status === 'running' ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400' : '',
            ]"
          >
            <div
              :class="[
                run.status === 'done' ? 'i-solar:check-circle-bold-duotone' : '',
                run.status === 'error' ? 'i-solar:close-circle-bold-duotone' : '',
                run.status === 'running' ? 'i-solar:spinner-bold-duotone animate-spin' : '',
              ]"
              shrink-0
            />
            <span flex-1>
              {{ formatRuntime(run) }} –
              {{ run.status === 'done' ? t('settings.pages.modules.self-learning.run-done', { count: run.insightsSaved }) : '' }}
              {{ run.status === 'error' ? t('settings.pages.modules.self-learning.run-error', { message: run.error }) : '' }}
              {{ run.status === 'running' ? t('settings.pages.modules.self-learning.run-running') : '' }}
            </span>
            <span text-neutral-400>{{ run.topicsProcessed.join(', ') }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.self-learning.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
