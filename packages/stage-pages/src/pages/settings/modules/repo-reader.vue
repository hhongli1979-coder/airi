<script setup lang="ts">
import { useRepoReaderStore } from '@proj-airi/stage-ui/stores/modules/repo-reader'
import { FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useRepoReaderStore()
const { enabled, githubToken } = storeToRefs(store)
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.repo-reader.enable')"
      :description="t('settings.pages.modules.repo-reader.enable-description')"
    />

    <!-- Info note -->
    <div
      :class="[
        'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700',
        'dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
      ]"
    >
      <div i-solar:info-circle-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.repo-reader.note') }}
    </div>

    <template v-if="enabled">
      <FieldInput
        v-model="githubToken"
        type="password"
        :label="t('settings.pages.modules.repo-reader.github-token')"
        :description="t('settings.pages.modules.repo-reader.github-token-description')"
        :placeholder="t('settings.pages.modules.repo-reader.github-token-placeholder')"
      />

      <!-- Available tools -->
      <div flex="~ col gap-2">
        <h3 text-sm text-neutral-700 font-medium dark:text-neutral-300>
          Available Tools
        </h3>
        <div flex="~ col gap-1.5">
          <div
            v-for="toolEntry in [
              { name: 'repo_read_file', desc: 'Read any file\'s content from a GitHub repository' },
              { name: 'repo_list_files', desc: 'Browse the directory tree of a repository' },
              { name: 'repo_search_code', desc: 'Full-text code search across GitHub' },
              { name: 'repo_get_info', desc: 'Fetch repository metadata (stars, language, topics…)' },
            ]"
            :key="toolEntry.name"
            :class="[
              'rounded-lg border border-neutral-200 bg-white px-3 py-2.5',
              'dark:border-neutral-700 dark:bg-neutral-800/40',
            ]"
          >
            <code text-xs text-primary-600 font-mono dark:text-primary-400>{{ toolEntry.name }}</code>
            <p mt-0.5 text-xs text-neutral-400>
              {{ toolEntry.desc }}
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
        {{ t('settings.pages.modules.repo-reader.configured') }}
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.repo-reader.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
