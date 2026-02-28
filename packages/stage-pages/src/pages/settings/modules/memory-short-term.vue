<script setup lang="ts">
import { useShortTermMemoryStore } from '@proj-airi/stage-ui/stores/modules/memory-short-term'
import { FieldCheckbox, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useShortTermMemoryStore()
const { enabled, maxMessages, maxTokens, summarizeOnTrim } = storeToRefs(store)
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.memory-short-term.enable')"
      :description="t('settings.pages.modules.memory-short-term.enable-description')"
    />

    <template v-if="enabled">
      <FieldRange
        v-model="maxMessages"
        :label="t('settings.pages.modules.memory-short-term.max-messages')"
        :description="t('settings.pages.modules.memory-short-term.max-messages-description')"
        :min="0"
        :max="100"
        :step="5"
        :format-value="(v: number) => v === 0 ? 'Unlimited' : `${v} messages`"
      />

      <FieldRange
        v-model="maxTokens"
        :label="t('settings.pages.modules.memory-short-term.max-tokens')"
        :description="t('settings.pages.modules.memory-short-term.max-tokens-description')"
        :min="0"
        :max="32000"
        :step="500"
        :format-value="(v: number) => v === 0 ? 'Unlimited' : `~${v.toLocaleString()} tokens`"
      />

      <FieldCheckbox
        v-model="summarizeOnTrim"
        :label="t('settings.pages.modules.memory-short-term.summarize-on-trim')"
        :description="t('settings.pages.modules.memory-short-term.summarize-on-trim-description')"
      />
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.memory-short-term.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
