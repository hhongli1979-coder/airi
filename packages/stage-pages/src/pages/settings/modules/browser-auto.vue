<script setup lang="ts">
import { useBrowserAutoStore } from '@proj-airi/stage-ui/stores/modules/browser-auto'
import { FieldCheckbox } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useBrowserAutoStore()
const { enabled } = storeToRefs(store)

const tools = [
  { name: 'browser_navigate', desc: 'Open a URL; waits for the page to load' },
  { name: 'browser_get_page_info', desc: 'Get the current URL and page title' },
  { name: 'browser_get_page_html', desc: 'Read the full HTML source (up to 80k chars)' },
  { name: 'browser_find_elements', desc: 'Find elements by CSS selector — discover form fields' },
  { name: 'browser_fill_input', desc: 'Fill a text/email/password input or textarea' },
  { name: 'browser_click', desc: 'Click a button, link, or checkbox' },
  { name: 'browser_eval', desc: 'Run custom JavaScript in the page context' },
  { name: 'browser_close', desc: 'Close the automation browser window' },
]
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.browser-auto.enable')"
      :description="t('settings.pages.modules.browser-auto.enable-description')"
    />

    <!-- Info note -->
    <div
      :class="[
        'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700',
        'dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
      ]"
    >
      <div i-solar:shield-warning-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.browser-auto.note') }}
    </div>

    <template v-if="enabled">
      <!-- Tool list -->
      <div flex="~ col gap-2">
        <h3 text-sm text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.browser-auto.tools-title') }}
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
        {{ t('settings.pages.modules.browser-auto.configured') }}
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.browser-auto.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
