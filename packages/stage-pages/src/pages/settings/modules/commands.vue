<script setup lang="ts">
import { useCommandsStore } from '@proj-airi/stage-ui/stores/modules/commands'
import { Button, FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useCommandsStore()
const { enabled, commands } = storeToRefs(store)

const editingId = ref<string | null>(null)
const showForm = ref(false)
const form = ref({ trigger: '', expansion: '', description: '' })

function openAdd() {
  editingId.value = null
  form.value = { trigger: '', expansion: '', description: '' }
  showForm.value = true
}

function openEdit(id: string) {
  const cmd = commands.value.find(c => c.id === id)
  if (!cmd)
    return
  editingId.value = id
  form.value = { trigger: cmd.trigger, expansion: cmd.expansion, description: cmd.description }
  showForm.value = true
}

function save() {
  if (!form.value.trigger.trim() || !form.value.expansion.trim())
    return
  if (editingId.value) {
    store.updateCommand(editingId.value, form.value)
  }
  else {
    store.addCommand(form.value.trigger, form.value.expansion, form.value.description)
  }
  showForm.value = false
}

function cancel() {
  showForm.value = false
}
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.commands.enable')"
      :description="t('settings.pages.modules.commands.enable-description')"
    />

    <!-- Hint -->
    <p
      :class="[
        'rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700',
        'dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300',
      ]"
    >
      {{ t('settings.pages.modules.commands.hint') }}
    </p>

    <!-- Commands List -->
    <div flex="~ col gap-3">
      <div flex="~ row items-center justify-between">
        <h3 text-neutral-700 font-medium dark:text-neutral-300>
          {{ t('settings.pages.modules.commands.add-command') }}
        </h3>
        <Button size="sm" @click="openAdd">
          <div i-solar:add-circle-bold-duotone mr-1 />
          {{ t('settings.pages.modules.commands.add-command') }}
        </Button>
      </div>

      <p v-if="commands.length === 0" text-sm text-neutral-400>
        {{ t('settings.pages.modules.commands.commands-empty') }}
      </p>

      <div v-else flex="~ col gap-2">
        <div
          v-for="cmd in commands"
          :key="cmd.id"
          :class="[
            'rounded-lg border p-3 flex gap-3 items-start',
            'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
          ]"
        >
          <div flex="~ col gap-0.5" min-w-0 flex-1>
            <div flex="~ row gap-2 items-center">
              <code :class="['text-sm font-mono text-primary-600 dark:text-primary-400']">{{ cmd.trigger }}</code>
              <span v-if="cmd.description" text-xs text-neutral-400>— {{ cmd.description }}</span>
            </div>
            <p :class="['text-xs text-neutral-500 dark:text-neutral-400 break-words mt-0.5']">
              {{ cmd.expansion }}
            </p>
          </div>
          <div flex="~ row gap-1 shrink-0">
            <button
              :class="['p-1 rounded text-neutral-400 hover:text-primary-500 transition-colors']"
              @click="openEdit(cmd.id)"
            >
              <div i-solar:pen-bold-duotone text-sm />
            </button>
            <button
              :class="['p-1 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors']"
              @click="store.deleteCommand(cmd.id)"
            >
              <div i-solar:trash-bin-minimalistic-bold-duotone text-sm />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Form -->
    <div
      v-if="showForm"
      :class="[
        'rounded-xl border p-4 flex flex-col gap-3',
        'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/20',
      ]"
    >
      <FieldInput
        v-model="form.trigger"
        :label="t('settings.pages.modules.commands.trigger')"
        :description="t('settings.pages.modules.commands.trigger-description')"
        :placeholder="t('settings.pages.modules.commands.trigger-placeholder')"
      />
      <FieldInput
        v-model="form.expansion"
        :label="t('settings.pages.modules.commands.expansion')"
        :description="t('settings.pages.modules.commands.expansion-description')"
        :placeholder="t('settings.pages.modules.commands.expansion-placeholder')"
      />
      <FieldInput
        v-model="form.description"
        :label="t('settings.pages.modules.commands.description-label')"
        :placeholder="t('settings.pages.modules.commands.description-placeholder')"
      />
      <div flex="~ row gap-2 justify-end">
        <Button variant="ghost" @click="cancel">
          {{ t('settings.pages.modules.commands.cancel') }}
        </Button>
        <Button :disabled="!form.trigger.trim() || !form.expansion.trim()" @click="save">
          {{ t('settings.pages.modules.commands.save') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.commands.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
