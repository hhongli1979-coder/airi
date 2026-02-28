<script setup lang="ts">
import { useLobsterStore } from '@proj-airi/stage-ui/stores/modules/lobster'
import { Button, FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useLobsterStore()
const { enabled, workflows } = storeToRefs(store)

const editingId = ref<string | null>(null)
const showForm = ref(false)
const form = ref({ name: '', description: '', definition: '' })

const exampleYaml = `name: pr-status
steps:
  - id: view
    command: gh pr view \${pr} --repo \${repo} --json title,state,url
  - id: summarize
    command: echo "PR $\{view.json}"
`

function openAdd() {
  editingId.value = null
  form.value = { name: '', description: '', definition: exampleYaml }
  showForm.value = true
}

function openEdit(id: string) {
  const wf = workflows.value.find(w => w.id === id)
  if (!wf)
    return
  editingId.value = id
  form.value = { name: wf.name, description: wf.description, definition: wf.definition }
  showForm.value = true
}

function save() {
  if (!form.value.name.trim() || !form.value.definition.trim())
    return
  if (editingId.value) {
    store.updateWorkflow(editingId.value, form.value)
  }
  else {
    store.addWorkflow(form.value.name, form.value.definition, form.value.description)
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
      :label="t('settings.pages.modules.lobster.enable')"
      :description="t('settings.pages.modules.lobster.enable-description')"
    />

    <!-- Info note -->
    <div
      :class="[
        'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700',
        'dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
      ]"
    >
      <div i-solar:info-circle-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.lobster.note') }}
    </div>

    <template v-if="enabled">
      <!-- Workflow list header -->
      <div flex="~ row items-center justify-between">
        <div>
          <h3 text-sm text-neutral-700 font-medium dark:text-neutral-300>
            {{ t('settings.pages.modules.lobster.workflows-title') }}
          </h3>
          <p mt-0.5 text-xs text-neutral-400>
            {{ t('settings.pages.modules.lobster.workflows-description') }}
          </p>
        </div>
        <Button size="sm" @click="openAdd">
          {{ t('settings.pages.modules.lobster.add-workflow') }}
        </Button>
      </div>

      <!-- Workflow list -->
      <div v-if="workflows.length > 0" flex="~ col gap-2">
        <div
          v-for="wf in workflows"
          :key="wf.id"
          :class="[
            'rounded-lg border border-neutral-200 bg-white px-4 py-3',
            'dark:border-neutral-700 dark:bg-neutral-800/40',
            'flex items-start justify-between gap-3',
          ]"
        >
          <div flex="~ col gap-0.5" min-w-0 flex-1>
            <span truncate text-sm text-neutral-800 font-medium dark:text-neutral-200>{{ wf.name }}</span>
            <span v-if="wf.description" truncate text-xs text-neutral-400>{{ wf.description }}</span>
            <pre
              overflow-hidden truncate text-xs text-neutral-400 font-mono
              style="max-height: 1.4em;"
            >{{ wf.definition.split('\n')[0] }}</pre>
          </div>
          <div flex="~ row gap-2 shrink-0">
            <button
              :class="['text-xs text-primary-500 hover:text-primary-700 dark:hover:text-primary-300']"
              @click="openEdit(wf.id)"
            >
              {{ t('settings.pages.modules.lobster.edit') }}
            </button>
            <button
              :class="['text-xs text-red-400 hover:text-red-600']"
              @click="store.deleteWorkflow(wf.id)"
            >
              {{ t('settings.pages.modules.lobster.delete') }}
            </button>
          </div>
        </div>
      </div>

      <p v-else text-sm text-neutral-400 italic>
        {{ t('settings.pages.modules.lobster.workflows-empty') }}
      </p>

      <!-- Add / Edit form -->
      <div
        v-if="showForm"
        :class="[
          'rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col gap-4',
          'dark:border-neutral-700 dark:bg-neutral-800/40',
        ]"
      >
        <FieldInput
          v-model="form.name"
          :label="t('settings.pages.modules.lobster.workflow-name')"
          :placeholder="t('settings.pages.modules.lobster.workflow-name-placeholder')"
        />
        <FieldInput
          v-model="form.description"
          :label="t('settings.pages.modules.lobster.workflow-description')"
          :placeholder="t('settings.pages.modules.lobster.workflow-description-placeholder')"
        />
        <!-- Definition textarea -->
        <div flex="~ col gap-1">
          <label text-sm text-neutral-700 font-medium dark:text-neutral-300>
            {{ t('settings.pages.modules.lobster.workflow-definition') }}
          </label>
          <p text-xs text-neutral-400>
            {{ t('settings.pages.modules.lobster.workflow-definition-description') }}
          </p>
          <textarea
            v-model="form.definition"
            :class="[
              'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-mono',
              'dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200',
              'resize-y min-h-32 focus:outline-none focus:ring-2 focus:ring-primary-400',
            ]"
            rows="8"
            :placeholder="t('settings.pages.modules.lobster.workflow-definition-placeholder')"
          />
        </div>
        <div flex="~ row gap-3 justify-end">
          <Button variant="ghost" size="sm" @click="cancel">
            {{ t('settings.pages.modules.lobster.cancel') }}
          </Button>
          <Button size="sm" :disabled="!form.name.trim() || !form.definition.trim()" @click="save">
            {{ editingId ? t('settings.pages.modules.lobster.save') : t('settings.pages.modules.lobster.create') }}
          </Button>
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
        {{ t('settings.pages.modules.lobster.configured') }}
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.lobster.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
