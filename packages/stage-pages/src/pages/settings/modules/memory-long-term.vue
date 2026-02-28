<script setup lang="ts">
import { useLongTermMemoryStore } from '@proj-airi/stage-ui/stores/modules/memory-long-term'
import { Button, FieldCheckbox, FieldInput, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useLongTermMemoryStore()
const { enabled, maxInjectedEntries, sortedEntries } = storeToRefs(store)

const newContent = ref('')
const newTags = ref('')
const showConfirm = ref(false)

function addEntry() {
  const content = newContent.value.trim()
  if (!content)
    return
  const tags = newTags.value.split(',').map(s => s.trim()).filter(Boolean)
  store.addEntry(content, tags, 'manual')
  newContent.value = ''
  newTags.value = ''
}

function confirmClear() {
  if (showConfirm.value) {
    store.clearAllEntries()
    showConfirm.value = false
  }
  else {
    showConfirm.value = true
  }
}
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.memory-long-term.enable')"
      :description="t('settings.pages.modules.memory-long-term.enable-description')"
    />

    <FieldRange
      v-model="maxInjectedEntries"
      :label="t('settings.pages.modules.memory-long-term.max-injected')"
      :description="t('settings.pages.modules.memory-long-term.max-injected-description')"
      :min="0"
      :max="50"
      :step="1"
      :format-value="(v: number) => v === 0 ? 'All' : `${v}`"
    />

    <!-- Stored Memories -->
    <div flex="~ col gap-3">
      <div flex="~ row items-center justify-between">
        <h3 :class="['text-base font-medium text-neutral-700 dark:text-neutral-300']">
          {{ t('settings.pages.modules.memory-long-term.entries-title') }}
          <span :class="['ml-1 text-sm text-neutral-400']">({{ sortedEntries.length }})</span>
        </h3>
        <Button
          v-if="sortedEntries.length > 0"
          size="sm"
          variant="ghost"
          :class="['text-red-500 dark:text-red-400']"
          @click="confirmClear"
        >
          {{ showConfirm ? t('settings.pages.modules.memory-long-term.clear-all-confirm') : t('settings.pages.modules.memory-long-term.clear-all') }}
        </Button>
      </div>

      <p v-if="sortedEntries.length === 0" :class="['text-sm text-neutral-400 dark:text-neutral-500']">
        {{ t('settings.pages.modules.memory-long-term.entries-empty') }}
      </p>

      <div v-else flex="~ col gap-2" max-h-72 overflow-y-auto>
        <div
          v-for="entry in sortedEntries"
          :key="entry.id"
          :class="[
            'rounded-lg border p-3',
            'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
            'flex gap-3 items-start',
          ]"
        >
          <div flex="~ col gap-1" min-w-0 flex-1>
            <p :class="['text-sm text-neutral-800 dark:text-neutral-200 break-words']">
              {{ entry.content }}
            </p>
            <div flex="~ row gap-2 items-center" flex-wrap>
              <span
                v-for="tag in entry.tags"
                :key="tag"
                :class="['rounded px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300']"
              >{{ tag }}</span>
              <span :class="['text-xs text-neutral-400']">
                {{ t('settings.pages.modules.memory-long-term.confidence') }}: {{ Math.round(entry.confidence * 100) }}%
              </span>
              <span
                :class="[
                  'rounded px-1.5 py-0.5 text-xs',
                  entry.source === 'self-learning'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
                ]"
              >
                {{ entry.source === 'self-learning' ? t('settings.pages.modules.memory-long-term.source-self-learning') : t('settings.pages.modules.memory-long-term.source-manual') }}
              </span>
            </div>
          </div>
          <button
            :class="['shrink-0 p-1 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors']"
            :title="t('settings.pages.modules.memory-long-term.delete-entry')"
            @click="store.deleteEntry(entry.id)"
          >
            <div i-solar:trash-bin-minimalistic-bold-duotone text-sm />
          </button>
        </div>
      </div>

      <!-- Add entry -->
      <div flex="~ col gap-2">
        <FieldInput
          v-model="newContent"
          :placeholder="t('settings.pages.modules.memory-long-term.add-entry-placeholder')"
          @keydown.enter="addEntry"
        />
        <div flex="~ row gap-2">
          <FieldInput
            v-model="newTags"
            :placeholder="t('settings.pages.modules.memory-long-term.entry-tags-placeholder')"
            :class="['flex-1']"
            @keydown.enter="addEntry"
          />
          <Button :disabled="!newContent.trim()" @click="addEntry">
            {{ t('settings.pages.modules.memory-long-term.add-entry') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.memory-long-term.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
