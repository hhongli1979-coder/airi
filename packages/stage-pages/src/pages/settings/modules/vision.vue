<script setup lang="ts">
import { useVisionStore } from '@proj-airi/stage-ui/stores/modules/vision'
import { FieldCheckbox } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visionStore = useVisionStore()
const { enabled } = storeToRefs(visionStore)
</script>

<template>
  <div flex="~ col gap-6">
    <!-- Enable toggle -->
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.vision.enable')"
      :description="t('settings.pages.modules.vision.enable-description')"
    />

    <!-- Camera permission note -->
    <div
      :class="[
        'rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 flex gap-3',
        'dark:border-blue-800 dark:bg-blue-950/30',
      ]"
    >
      <div i-solar:camera-bold-duotone class="mt-0.5 shrink-0 text-lg text-blue-500 dark:text-blue-400" />
      <div flex="~ col gap-1">
        <p class="text-sm font-medium text-blue-700 dark:text-blue-300">
          {{ t('settings.pages.modules.vision.camera-note-title') }}
        </p>
        <p class="text-xs text-blue-600/80 dark:text-blue-300/80">
          {{ t('settings.pages.modules.vision.camera-note-description') }}
        </p>
      </div>
    </div>

    <!-- Coming capabilities -->
    <div flex="~ col gap-2">
      <h3 class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {{ t('settings.pages.modules.vision.capabilities-title') }}
      </h3>
      <div flex="~ col gap-2">
        <div
          v-for="cap in ['face-tracking', 'emotion-recognition', 'screen-reading']"
          :key="cap"
          :class="[
            'rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 flex gap-2 items-center',
            'dark:border-neutral-700 dark:bg-neutral-800/40',
          ]"
        >
          <div
            :class="[
              cap === 'face-tracking' ? 'i-solar:face-scan-circle-bold-duotone' : '',
              cap === 'emotion-recognition' ? 'i-solar:emoji-funny-circle-bold-duotone' : '',
              cap === 'screen-reading' ? 'i-solar:monitor-bold-duotone' : '',
              'text-base text-neutral-400 shrink-0',
            ]"
          />
          <div flex="~ col gap-0.5">
            <span class="text-sm text-neutral-700 dark:text-neutral-300">
              {{ t(`settings.pages.modules.vision.capability-${cap}-title`) }}
            </span>
            <span class="text-xs text-neutral-400 dark:text-neutral-500">
              {{ t(`settings.pages.modules.vision.capability-${cap}-description`) }}
            </span>
          </div>
          <div
            class="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600 font-medium dark:bg-amber-900/30 dark:text-amber-400"
          >
            {{ t('settings.pages.modules.vision.coming-soon') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.vision.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
