<script setup lang="ts">
import { useComputerUseStore } from '@proj-airi/stage-ui/stores/modules/computer-use'
import { FieldCheckbox } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useComputerUseStore()
const { enabled } = storeToRefs(store)

const tools = [
  { name: 'computer_screenshot', desc: 'Capture the primary display as a PNG image' },
  { name: 'computer_mouse_move', desc: 'Move the cursor to (x, y) screen coordinates' },
  { name: 'computer_mouse_click', desc: 'Single, double, or right-click at (x, y)' },
  { name: 'computer_keyboard_type', desc: 'Type a string of text into the focused window' },
  { name: 'computer_keyboard_press', desc: 'Press keyboard shortcuts, e.g. Ctrl+C, Alt+F4' },
  { name: 'computer_get_screen_size', desc: 'Get the primary display width and height' },
  { name: 'computer_get_cursor_position', desc: 'Get the current mouse cursor position' },
]
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.computer-use.enable')"
      :description="t('settings.pages.modules.computer-use.enable-description')"
    />

    <!-- Info note -->
    <div
      :class="[
        'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700',
        'dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
      ]"
    >
      <div i-solar:info-circle-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.computer-use.note') }}
    </div>

    <template v-if="enabled">
      <!-- Tool list -->
      <div flex="~ col gap-2">
        <h3 text-sm text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.computer-use.tools-title') }}
        </h3>
        <div flex="~ col gap-1.5">
          <div
            v-for="toolItem in tools"
            :key="toolItem.name"
            :class="[
              'rounded-lg border border-neutral-200 bg-white px-3 py-2.5',
              'dark:border-neutral-700 dark:bg-neutral-800/40',
            ]"
          >
            <code text-xs text-primary-600 font-mono dark:text-primary-400>{{ toolItem.name }}</code>
            <p mt-0.5 text-xs text-neutral-400>
              {{ toolItem.desc }}
            </p>
          </div>
        </div>
      </div>

      <!-- Configured indicator -->
      <div
        v-if="store.configured"
        :class="[
          'rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700',
          'dark:border-green-800 dark:bg-green-950/30 dark:text-green-400',
          'flex items-center gap-2',
        ]"
      >
        <div i-solar:check-circle-bold-duotone />
        {{ t('settings.pages.modules.computer-use.configured') }}
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.computer-use.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
