<script setup lang="ts">
import { useWebSearchStore } from '@proj-airi/stage-ui/stores/modules/web-search'
import { FieldCheckbox, FieldInput, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useWebSearchStore()
const { enabled, backend, searxngUrl, braveApiKey, maxResults, configured } = storeToRefs(store)

const backends = [
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'searxng', label: 'SearXNG' },
  { value: 'brave', label: 'Brave Search' },
] as const
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.web-search.enable')"
      :description="t('settings.pages.modules.web-search.enable-description')"
    />

    <template v-if="enabled">
      <!-- Backend selector -->
      <div flex="~ col gap-2">
        <label text-sm text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.web-search.backend') }}
        </label>
        <p text-xs text-neutral-400>
          {{ t('settings.pages.modules.web-search.backend-description') }}
        </p>
        <div flex="~ col gap-2">
          <button
            v-for="b in backends"
            :key="b.value"
            :class="[
              'rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
              backend === b.value
                ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/40 dark:text-primary-300'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300',
            ]"
            @click="backend = b.value"
          >
            <div flex="~ row items-center gap-2">
              <div
                :class="[
                  'h-2 w-2 rounded-full shrink-0',
                  backend === b.value ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600',
                ]"
              />
              {{ t(`settings.pages.modules.web-search.backend-${b.value}`) }}
            </div>
          </button>
        </div>
      </div>

      <!-- SearXNG URL -->
      <FieldInput
        v-if="backend === 'searxng'"
        v-model="searxngUrl"
        :label="t('settings.pages.modules.web-search.searxng-url')"
        :description="t('settings.pages.modules.web-search.searxng-url-description')"
        :placeholder="t('settings.pages.modules.web-search.searxng-url-placeholder')"
      />

      <!-- Brave API Key -->
      <FieldInput
        v-if="backend === 'brave'"
        v-model="braveApiKey"
        type="password"
        :label="t('settings.pages.modules.web-search.brave-api-key')"
        :description="t('settings.pages.modules.web-search.brave-api-key-description')"
        :placeholder="t('settings.pages.modules.web-search.brave-api-key-placeholder')"
      />

      <FieldRange
        v-model="maxResults"
        :label="t('settings.pages.modules.web-search.max-results')"
        :description="t('settings.pages.modules.web-search.max-results-description')"
        :min="1"
        :max="10"
        :step="1"
        :format-value="(v: number) => `${v}`"
      />

      <!-- Reader note -->
      <p
        :class="[
          'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700',
          'dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
        ]"
      /><div i-solar:info-circle-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.web-search.reader-note') }}
      </p>

      <!-- Configured indicator -->
      <div
        v-if="configured"
        :class="[
          'rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700',
          'dark:border-green-800 dark:bg-green-950/30 dark:text-green-400',
          'flex items-center gap-2',
        ]"
      >
        <div i-solar:check-circle-bold-duotone />
        {{ t('settings.pages.modules.web-search.configured') }}
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.web-search.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
