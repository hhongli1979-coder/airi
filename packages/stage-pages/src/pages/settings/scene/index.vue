<script setup lang="ts">
import { useSettingsLive2d } from '@proj-airi/stage-ui/stores/settings'
import { FieldCheckbox, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const live2dSettings = useSettingsLive2d()
const {
  live2dDisableFocus,
  live2dIdleAnimationEnabled,
  live2dAutoBlinkEnabled,
  live2dForceAutoBlinkEnabled,
  live2dShadowEnabled,
  live2dMaxFps,
} = storeToRefs(live2dSettings)

function formatMaxFps(v: number): string {
  return v === 0 ? t('settings.pages.scene.sections.live2d.max-fps-unlimited') : `${v} FPS`
}
</script>

<template>
  <div flex="~ col gap-6">
    <!-- Live2D model behaviour -->
    <div
      :class="['rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40 p-4 flex flex-col gap-4']"
    >
      <h3 class="text-base font-medium text-neutral-700 dark:text-neutral-300">
        {{ t('settings.pages.scene.sections.live2d.title') }}
      </h3>

      <FieldCheckbox
        v-model="live2dIdleAnimationEnabled"
        :label="t('settings.pages.scene.sections.live2d.idle-animation')"
        :description="t('settings.pages.scene.sections.live2d.idle-animation-description')"
      />

      <FieldCheckbox
        v-model="live2dAutoBlinkEnabled"
        :label="t('settings.pages.scene.sections.live2d.auto-blink')"
        :description="t('settings.pages.scene.sections.live2d.auto-blink-description')"
      />

      <FieldCheckbox
        v-if="live2dAutoBlinkEnabled"
        v-model="live2dForceAutoBlinkEnabled"
        :label="t('settings.pages.scene.sections.live2d.force-auto-blink')"
        :description="t('settings.pages.scene.sections.live2d.force-auto-blink-description')"
      />

      <FieldCheckbox
        v-model="live2dDisableFocus"
        :label="t('settings.pages.scene.sections.live2d.disable-focus')"
        :description="t('settings.pages.scene.sections.live2d.disable-focus-description')"
      />

      <FieldCheckbox
        v-model="live2dShadowEnabled"
        :label="t('settings.pages.scene.sections.live2d.shadow')"
        :description="t('settings.pages.scene.sections.live2d.shadow-description')"
      />

      <FieldRange
        v-model="live2dMaxFps"
        :label="t('settings.pages.scene.sections.live2d.max-fps')"
        :description="t('settings.pages.scene.sections.live2d.max-fps-description')"
        :min="0"
        :max="120"
        :step="5"
        :format-value="formatMaxFps"
      />
    </div>

    <!-- Navigate to model picker -->
    <div
      :class="[
        'rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40 p-4',
      ]"
    >
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t('settings.pages.scene.model-link-hint') }}
        <a
          class="text-primary-500 underline decoration-dotted dark:text-primary-400"
          href="/settings/models"
          @click.prevent="$router.push('/settings/models')"
        >{{ t('settings.pages.scene.model-link-text') }}</a>.
      </p>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.scene.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.scene.description
  icon: i-solar:armchair-2-bold-duotone
  settingsEntry: true
  order: 3
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
